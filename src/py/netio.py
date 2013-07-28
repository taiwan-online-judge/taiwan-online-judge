import os
import math
import json
import struct
import socket
from collections import deque

import tornado.ioloop
import tornado.stack_context

import imc.async
from imc.proxy import Connection

def send_pack(stream,data):
    stream.write(struct.pack('l',len(data)) + data)

def recv_pack(stream,callback):
    def _recv_size(data):
        size, = struct.unpack('l',data)
        stream.read_bytes(size,lambda data : callback(data))

    stream.read_bytes(8,_recv_size)

class SocketStream:
    def __init__(self,sock):
        self.DATA_BUF = 0
        self.DATA_NOBUF = 1
        self.DATA_FILE = 2
        self.STREAMTYPE = 'socket'

        self._ioloop = tornado.ioloop.IOLoop.current()
        self._sock = sock

        self._conning = False
        self._closed = False
        self._conn_callback = None
        self._close_callback = None

        self._read_queue = deque()
        self._write_queue = deque()
        self._stat = tornado.ioloop.IOLoop.ERROR
        
        self._sock.setsockopt(socket.SOL_SOCKET,socket.SO_KEEPALIVE,1)
        self._sock.setblocking(False)
        self._ioloop.add_handler(sock.fileno(),self._handle_event,tornado.ioloop.IOLoop.ERROR)
    
    def _check_close(f):
        def wrap(self,*args):
            if self._closed == True:
                raise ConnectionError

            return f(self,*args)

        return wrap

    @_check_close
    def connect(self,addr,callback):
        try:
            self._conn_callback = tornado.stack_context.wrap(callback)

            self._stat |= tornado.ioloop.IOLoop.WRITE
            self._ioloop.update_handler(self._sock.fileno(),self._stat)

            self._conning = True
            self._sock.connect(addr)

        except BlockingIOError:
            pass

    @_check_close
    def read_bytes(self,size,callback = None,nonbuf = False):
        if nonbuf == False:
            self._read_queue.append([self.DATA_BUF,size,bytearray(),tornado.stack_context.wrap(callback)])
        
        else:
            self._read_queue.append([self.DATA_NOBUF,size,tornado.stack_context.wrap(callback)])

        self._stat |= tornado.ioloop.IOLoop.READ
        self._ioloop.update_handler(self._sock.fileno(),self._stat)

    @_check_close
    def write(self,buf,callback = None):
        self._write_queue.append([self.DATA_BUF,0,buf,tornado.stack_context.wrap(callback)])

        self._stat |= tornado.ioloop.IOLoop.WRITE
        self._ioloop.update_handler(self._sock.fileno(),self._stat)

    @_check_close
    def sendfile(self,fd,callback = None):
        size = os.fstat(fd).st_size

        self._write_queue.append([self.DATA_FILE,size,fd,tornado.stack_context.wrap(callback)])

        self._stat |= tornado.ioloop.IOLoop.WRITE
        self._ioloop.update_handler(self._sock.fileno(),self._stat)

    @_check_close
    def recvfile(self,fd,size,callback = None):
        self._read_queue.append([self.DATA_FILE,size,fd,tornado.stack_context.wrap(callback)])

        self._stat |= tornado.ioloop.IOLoop.READ
        self._ioloop.update_handler(self._sock.fileno(),self._stat)

    def set_close_callback(self,callback):
        if callback == None:
            self._close_callback = None

        else:
            self._close_callback = tornado.stack_context.wrap(callback)

    def close(self):
        if self._closed == True:
            return

        self._closed = True
        self._ioloop.remove_handler(self._sock.fileno())
        self._sock.close()

        if self._close_callback != None:
            self._close_callback(self)
    
    def _handle_event(self,fd,evt):
        if evt & tornado.ioloop.IOLoop.ERROR:
            print(os.strerror(self._sock.getsockopt(socket.SOL_SOCKET,socket.SO_ERROR)))
            self.close()
            return

        if evt & tornado.ioloop.IOLoop.READ:
            while len(self._read_queue) > 0:
                iocb = self._read_queue[0]
                datatype = iocb[0]

                if datatype == self.DATA_BUF:
                    size = iocb[1]
                    
                    try:
                        while True:
                            buf = self._sock.recv(size)
                            if len(buf) == 0:
                                self.close()
                                return

                            iocb[2].extend(buf)
                            size -= len(buf)

                            if size == 0:
                                if iocb[3] != None:
                                    iocb[3](iocb[2])
                                
                                self._read_queue.popleft()
                                break

                    except BlockingIOError:
                        iocb[1] = size
                        break

                    except Exception:
                        self.close()
                        return

                elif datatype == self.DATA_NOBUF:
                    size = iocb[1]
                    
                    try:
                        while True:
                            buf = self._sock.recv(size)
                            if len(buf) == 0:
                                self.close()
                                return

                            iocb[2](buf)
                            size -= len(buf)

                            if size == 0:
                                self._read_queue.popleft()
                                break

                    except BlockingIOError:
                        iocb[1] = size
                        break

                    except Exception:
                        self.close()
                        return

                elif datatype == self.DATA_FILE:
                    size = iocb[1]

                    try:
                        while True:
                            buf = self._sock.recv(min(size,65536))
                            
                            os.write(iocb[2],buf)
                            size -= len(buf)

                            if size == 0:
                                if iocb[3] != None:
                                    iocb[3]()
                                
                                self._read_queue.popleft()
                                break
                            
                            if len(buf) == 0:
                                self.close()
                                return
                    
                    except BlockingIOError:
                        iocb[1] = size
                        break

                    except Exception:
                        self.close()
                        return

        if evt & tornado.ioloop.IOLoop.WRITE:
            if self._conning == True:
                self._conning = False

                if self._conn_callback != None:
                    self._conn_callback()

            while len(self._write_queue) > 0:
                iocb = self._write_queue[0]
                datatype = iocb[0]

                if datatype == self.DATA_BUF:
                    off = iocb[1]
                    buf = iocb[2]

                    try:
                        while True:
                            ret = self._sock.send(buf[off:])
                            off += ret

                            if off == len(buf):
                                if iocb[3] != None:
                                    iocb[3]()

                                self._write_queue.popleft()
                                break
                            
                            if ret == 0:
                                self.close()
                                return

                    except BlockingIOError:
                        iocb[1] = off
                        break

                    except Exception:
                        self.close()
                        return

                elif datatype == self.DATA_FILE:
                    size = iocb[1]
                    filefd = iocb[2]
                    sockfd = self._sock.fileno()

                    try:
                        while True:
                            ret = os.sendfile(sockfd,filefd,None,min(size,65536))
                            size -= ret

                            if size == 0:
                                if iocb[3] != None:
                                    iocb[3]()

                                self._write_queue.popleft()
                                break
                            
                            if ret == 0:
                                self.close()
                                return

                    except BlockingIOError:
                        iocb[1] = size
                        break

                    except Exception:
                        self.close()
                        return

        if self._closed == True:
            return

        stat = tornado.ioloop.IOLoop.ERROR
        if len(self._read_queue) > 0:
            stat |= tornado.ioloop.IOLoop.READ

        if len(self._write_queue) > 0:
            stat |= tornado.ioloop.IOLoop.WRITE

        if stat != self._stat:
            self._stat = stat
            self._ioloop.update_handler(fd,stat)

class SocketConnection(Connection):
    def __init__(self,
                 link,
                 main_stream,
                 file_addr,
                 pend_filestream_fn = None,
                 del_pend_filestream_fn = None):

        super().__init__(link)

        self._ioloop = tornado.ioloop.IOLoop.current()
        self._sendfile_filekeymap = {}

        self.main_stream = main_stream
        self.main_stream.set_close_callback(lambda stream : self.close())
        self.file_addr = file_addr
        self.pend_filestream = pend_filestream_fn
        self.del_pend_filestream = del_pend_filestream_fn
        
    def _check_close(f):
        def wrap(self,*args):
            if self.closed():
                raise ConnectionError

            return f(self,*args)

        return wrap

    @_check_close
    def send_msg(self,data):
        self.main_stream.write(struct.pack('l',len(data)) + data)

    @_check_close
    def send_file(self,filekey,filepath,callback):
        def _conn_cb():
            self._add_wait_filekey(filekey,_callback)

            send_pack(file_stream,bytes(json.dumps({
                'conntype':'file',
                'filekey':filekey
            }),'utf-8'))

            file_stream.sendfile(fd,_callback)

        def _callback(err = None):
            try:
                self._del_wait_filekey(filekey)

            except KeyError:
                return

            file_stream.set_close_callback(None)
            file_stream.close()
            os.close(fd)

            callback(err)

        try:
            fd = os.open(filepath,os.O_RDONLY)

        except FileNotFoundError:
            callback('Eabort')
            return

        filesize = os.fstat(fd).st_size

        file_stream = SocketStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
        file_stream.set_close_callback(lambda stream : _callback('Eabort'))
        file_stream.connect(self.file_addr,_conn_cb)

    @_check_close
    def recv_file(self,filekey,filesize,filepath,callback):
        def _conn_cb(stream):
            nonlocal file_stream

            file_stream = stream
            file_stream.set_close_callback(lambda stream : _callback('Eabort'))

            file_stream.recvfile(fd,filesize,_callback)

        def _callback(err = None):
            try:
                self._del_wait_filekey(filekey)

            except KeyError:
                return

            if file_stream == None:
                self.del_pend_filestream(filekey)

            else:
                file_stream.set_close_callback(None)
                file_stream.close()

            os.close(fd)

            if err != None:
                try:
                    os.remove(filepath)

                except FileNotFoundError:
                    pass

            callback(err)

        file_stream = None

        self._add_wait_filekey(filekey,_callback)
        self.pend_filestream(self.STREAMTYPE,filekey,_conn_cb)
        fd = os.open(filepath,os.O_WRONLY | os.O_CREAT)

    @_check_close
    def send_filedata(self,filekey,filesize,callback):
        def _conn_cb():
            self._add_wait_filekey(filekey,_callback)

            send_pack(file_stream,bytes(json.dumps({
                'conntype':'file',
                'filekey':filekey
            }),'utf-8'))

            imc.async.ret(retid)

        def _callback(err = None):
            try:
                self._del_wait_filekey(filekey)

            except KeyError:
                return
            
            file_stream.set_close_callback(None)
            file_stream.close()

            callback(err)

        def _send_cb(data):
            def __done_cb():
                nonlocal filesize

                filesize -= len(data)
                if filesize == 0:
                    _callback()

            file_stream.write(data,__done_cb)

        file_stream = SocketStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))

        retid = imc.async.get_retid()
        file_stream.set_close_callback(lambda stream : _callback('Eabort'))
        file_stream.connect(self.file_addr,_conn_cb)
        imc.async.switch_top()

        return _send_cb

    @_check_close
    def recv_filedata(self,filekey,filesize,send_fn):
        def _conn_cb(stream):
            nonlocal file_stream

            file_stream = stream
            file_stream.set_close_callback(lambda stream : _callback('Eabort'))

            file_stream.read_bytes(filesize,send_fn,nonbuf = True)

        def _callback(err = None):
            try:
                self._del_wait_filekey(filekey)

            except KeyError:
                return
            
            if file_stream == None:
                self.del_pend_filestream(filekey)

            else:
                file_stream.set_close_callback(None)
                file_stream.close()

        file_stream = None

        self._add_wait_filekey(filekey,_callback)
        self.pend_filestream(self.STREAMTYPE,filekey,_conn_cb)

    @_check_close
    def abort_file(self,filekey,err):
        try:
            self._sendfile_filekeymap[filekey](err)
        
        except KeyError:
            pass

    @_check_close
    def start_recv(self,recv_callback):
        def _recv_size(data):
            size, = struct.unpack('l',data)
            self.main_stream.read_bytes(size,_recv_data)
            self.main_stream.read_bytes(8,_recv_size)

        def _recv_data(data):
            self._recv_callback(self,data)

        self._recv_callback = tornado.stack_context.wrap(recv_callback)
        self.main_stream.read_bytes(8,_recv_size)
    
    def close(self):
        if self.closed():
            return

        super().close()
        self.main_stream.close()

        callbacks = list(self._sendfile_filekeymap.values())
        for callback in callbacks:
            callback('Eabort')

    def _add_wait_filekey(self,filekey,fail_cb):
        self._sendfile_filekeymap[filekey] = tornado.stack_context.wrap(fail_cb)

    def _del_wait_filekey(self,filekey):
        del self._sendfile_filekeymap[filekey]

class WebSocketStream:
    def __init__(self,handler):
        self._closed = False
        self._handler = handler
        self._recv_callback = None
        self._close_callback = None
    
    def _check_close(f):
        def wrap(self,*args):
            if self._closed == True:
                raise ConnectionError

            return f(self,*args)

        return wrap

    def set_close_callback(self,callback):
        if callback == None:
            self._close_callback = None

        else:
            self._close_callback = tornado.stack_context.wrap(callback)

    def close(self):
        if self._closed == True:
            return

        self._closed = True
        try:
            self._handler.close()

        except Exception:
            pass

        if self._close_callback != None:
            self._close_callback(self)

    @_check_close
    def set_recv_callback(self,callback):
        self._recv_callback = tornado.stack_context.wrap(callback)

    @_check_close
    def send_msg(self,data):
        self._handler.write_message(data,True)

    @_check_close
    def recv_msg(self,data):
        if self._recv_callback != None:
            self._recv_callback(data)

    @_check_close
    def recv_file(self,fd,filesize,callback = None):
        def _recv_info(data):
            nonlocal off
            nonlocal partsize

            info = json.loads(data.decode('utf-8'))
            off = info['off']

            partsize = max(0,min(math.ceil(filesize / 4),filesize - off))
            self.set_recv_callback(_recv_cb)
            self.send_msg('Success')

        def _recv_cb(data):
            nonlocal count

            if count + len(data) > partsize:
                if callback != None:
                    callback('Eillegal')

                return

            self.send_msg('Success')

            os.pwrite(fd,data,off + count)
            count += len(data)

            if count == partsize:
                if callback != None:
                    callback()

        count = 0
        off = 0
        partsize = 0

        self.set_recv_callback(_recv_info)

class WebSocketConnection(Connection):
    def __init__(self,
                 link,
                 main_stream,
                 pend_filestream_fn = None,
                 del_pend_filestream_fn = None):
        self.STREAMTYPE = 'websocket'

        super().__init__(link)

        self._ioloop = tornado.ioloop.IOLoop.current()
        self._sendfile_filekeymap = {}

        self.main_stream = main_stream
        self.main_stream.set_close_callback(lambda stream : self.close())
        self.pend_filestream = pend_filestream_fn
        self.del_pend_filestream = del_pend_filestream_fn
    
    def _check_close(f):
        def wrap(self,*args):
            if self._closed == True:
                raise ConnectionError

            return f(self,*args)

        return wrap
    
    def close(self):
        if self._closed == True:
            return

        self.main_stream.close()
        super().close()

    @_check_close
    def send_msg(self,data):
        self.main_stream.send_msg(data)

    @_check_close
    def start_recv(self,recv_callback):
        self.main_stream.set_recv_callback(
            lambda data : recv_callback(self,data))
    
    @_check_close
    def recv_file(self,filekey,filesize,filepath,callback):
        def _conn_cb(stream):
            nonlocal file_streams

            file_streams.append(stream)
            stream.recv_file(fd,filesize,_stream_cb)
            stream.set_close_callback(lambda stream : _stream_cb('Eabort'))

        def _stream_cb(err = None):
            nonlocal count

            count += 1

            if err != None:
                _callback(err)

            if count == 4:
                _callback()

        def _callback(err = None):
            try:
                self._del_wait_filekey(filekey)

            except KeyError:
                return

            self.del_pend_filestream(filekey)

            for stream in file_streams:
                stream.set_close_callback(None)
                stream.close()

            os.close(fd)

            if err != None:
                try:
                    os.remove(filepath)

                except FileNotFoundError:
                    pass

            callback(err)

        file_streams = []
        count = 0

        self._add_wait_filekey(filekey,_callback)
        self.pend_filestream(self.STREAMTYPE,filekey,_conn_cb,4)

        fd = os.open(filepath,os.O_WRONLY | os.O_CREAT | os.O_TRUNC)
        os.ftruncate(fd,filesize);

    @_check_close
    def abort_file(self,filekey,err):
        try:
            self._sendfile_filekeymap[filekey](err)

        except KeyError:
            pass
    
    def _add_wait_filekey(self,filekey,fail_cb):
        self._sendfile_filekeymap[filekey] = tornado.stack_context.wrap(fail_cb)

    def _del_wait_filekey(self,filekey):
        del self._sendfile_filekeymap[filekey]

