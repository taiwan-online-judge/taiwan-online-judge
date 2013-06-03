import os
import traceback
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

        self._ioloop = tornado.ioloop.IOLoop.current()
        self._sock = sock

        self._conning = False
        self._closed = False
        self._conn_callback = None
        self._close_callback = None

        self._read_queue = deque()
        self._write_queue = deque()
        self._stat = tornado.ioloop.IOLoop.ERROR
        
        self._sock.setblocking(False)
        self._ioloop.add_handler(sock.fileno(),self._handle_event,tornado.ioloop.IOLoop.ERROR)

    def connect(self,addr,callback):
        if self._closed == True:
            raise ConnectionError

        try:
            self._conn_callback = tornado.stack_context.wrap(callback)

            self._stat |= tornado.ioloop.IOLoop.WRITE
            self._ioloop.update_handler(self._sock.fileno(),self._stat)

            self._conning = True
            self._sock.connect(addr)

        except BlockingIOError:
            pass

    def read_bytes(self,size,callback = None,nonbuf = False):
        if self._closed == True:
            raise ConnectionError

        if nonbuf == False:
            self._read_queue.append([self.DATA_BUF,size,bytearray(),tornado.stack_context.wrap(callback)])
        
        else:
            self._read_queue.append([self.DATA_NOBUF,size,tornado.stack_context.wrap(callback)])

        self._stat |= tornado.ioloop.IOLoop.READ
        self._ioloop.update_handler(self._sock.fileno(),self._stat)

    def write(self,buf,callback = None):
        if self._closed == True:
            raise ConnectionError

        self._write_queue.append([self.DATA_BUF,0,buf,tornado.stack_context.wrap(callback)])

        self._stat |= tornado.ioloop.IOLoop.WRITE
        self._ioloop.update_handler(self._sock.fileno(),self._stat)

    def sendfile(self,fd,callback = None):
        if self._closed == True:
            raise ConnectionError

        size = os.fstat(fd).st_size

        self._write_queue.append([self.DATA_FILE,size,fd,tornado.stack_context.wrap(callback)])

        self._stat |= tornado.ioloop.IOLoop.WRITE
        self._ioloop.update_handler(self._sock.fileno(),self._stat)

    def recvfile(self,fd,size,callback = None):
        if self._closed == True:
            raise ConnectionError

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
                            if len(buf) == 0:
                                self.close()
                                return

                            os.write(iocb[2],buf)
                            size -= len(buf)

                            if size == 0:
                                if iocb[3] != None:
                                    iocb[3]()
                                
                                self._read_queue.popleft()
                                break
                    
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
                            if ret == 0:
                                self.close()
                                return

                            off += ret

                            if off == len(buf):
                                if iocb[3] != None:
                                    iocb[3]()

                                self._write_queue.popleft()
                                break

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
                            if ret == 0:
                                self.close()
                                return

                            size -= ret

                            if size == 0:
                                if iocb[3] != None:
                                    iocb[3]()

                                self._write_queue.popleft()
                                break

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
    def __init__(self,linkclass,linkid,main_stream,file_addr,add_pend_filestream_fn = None):
        super().__init__(linkclass,linkid)

        self._ioloop = tornado.ioloop.IOLoop.current()
        self._sendfile_filekeymap = {}

        self.main_stream = main_stream
        self.main_stream.set_close_callback(lambda conn : self.close())
        self.file_addr = file_addr
        self.add_pend_filestream = add_pend_filestream_fn
        
        self._start_ping()

    def send_msg(self,data):
        if self._closed == True:
            raise ConnectionError

        self.main_stream.write(struct.pack('l',len(data)) + data)

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

            if err == None:
                callback()

        if self._closed == True:
            raise ConnectionError

        fd = os.open(filepath,os.O_RDONLY)
        filesize = os.fstat(fd).st_size

        file_stream = SocketStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
        file_stream.set_close_callback(lambda stream : _callback('Eclose'))
        file_stream.connect(self.file_addr,_conn_cb)

    def recv_file(self,filekey,filesize,filepath,callback):
        def _conn_cb(stream):
            nonlocal file_stream

            file_stream = stream
            file_stream.set_close_callback(lambda stream : _callback('Eclose'))
            self._add_wait_filekey(filekey,_callback)

            file_stream.recvfile(fd,filesize,_callback)

        def _callback(err = None):
            try:
                self._del_wait_filekey(filekey)

            except KeyError:
                return

            file_stream.set_close_callback(None)
            file_stream.close()
            os.close(fd)

            if err == None:
                callback()

            else:
                try:
                    os.remove(filepath)

                except FileNotFoundError:
                    pass

        if self._closed == True:
            raise ConnectionError

        file_stream = None

        self.add_pend_filestream(filekey,_conn_cb)
        fd = os.open(filepath,os.O_WRONLY | os.O_CREAT)

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

            if err == None:
                callback()

        def _send_cb(data):
            def __done_cb():
                nonlocal filesize

                filesize -= len(data)
                if filesize == 0:
                    _callback()

            file_stream.write(data,__done_cb)

        if self._closed == True:
            raise ConnectionError

        file_stream = SocketStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))

        retid = imc.async.get_retid()
        file_stream.set_close_callback(lambda stream : _callback('Eclose'))
        file_stream.connect(self.file_addr,_conn_cb)
        imc.async.switch_top()

        return _send_cb

    def recv_filedata(self,filekey,filesize,send_fn):
        def _conn_cb(stream):
            nonlocal file_stream

            file_stream = stream
            file_stream.set_close_callback(lambda stream : _callback('Eclose'))
            self._add_wait_filekey(filekey,_callback)

            file_stream.read_bytes(filesize,send_fn,nonbuf = True)

        def _callback(err = None):
            file_stream.close()

        if self._closed == True:
            raise ConnectionError

        file_stream = None

        self.add_pend_filestream(filekey,_conn_cb)

    def abort_file(self,filekey):
        try:
            self._sendfile_filekeymap[filekey]('Eabort')
        
        except KeyError:
            pass

    def start_recv(self,recv_callback):
        def _recv_size(data):
            size, = struct.unpack('l',data)
            if size > 0:
                self.main_stream.read_bytes(size,_recv_data)
            else:
                if size == -1:    #pong
                    self._ping_delay = 0
                
                self.main_stream.read_bytes(8,_recv_size)

        def _recv_data(data):
            self._recv_callback(self,data)
            self.main_stream.read_bytes(8,_recv_size)

        self._recv_callback = tornado.stack_context.wrap(recv_callback)
        self.main_stream.read_bytes(8,_recv_size)
    
    def close(self):
        try:
            self._ping_timer.stop()

        except AttributeError:
            pass

        if self._closed == True:
            return

        self._closed = True
        self.main_stream.close()

        callbacks = list(self._sendfile_filekeymap.values())
        for callback in callbacks:
            callback('Eclose')

        super().close()

    def _add_wait_filekey(self,filekey,fail_cb):
        self._sendfile_filekeymap[filekey] = tornado.stack_context.wrap(fail_cb)

    def _del_wait_filekey(self,filekey):
        del self._sendfile_filekeymap[filekey]

    def _start_ping(self):
        def __check():
            try:
                self.main_stream.write(struct.pack('l',-1))

            except ConnectionError:
                return

            self._ping_delay += 1
            if self._ping_delay > 10:
                self.close()

        self._ping_timer = tornado.ioloop.PeriodicCallback(__check,1000)
        self._ping_timer.start()
        self._ping_delay = 0

class WebSocketConnection(Connection):
    def __init__(self,linkclass,linkid,handler):
        super().__init__(linkclass,linkid)

        self._ioloop = tornado.ioloop.IOLoop.current()
        self.handler = handler

    def send_msg(self,data):
        if self._closed == True:
            raise ConnectionError

        self.handler.write_message(data,True)

    def recv_msg(self,data):
        if self._closed == True:
            raise ConnectionError

        self._recv_callback(self,data)

    def start_recv(self,recv_callback):
        self._recv_callback = tornado.stack_context.wrap(recv_callback)
