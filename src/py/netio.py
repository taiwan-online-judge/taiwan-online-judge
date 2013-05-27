import os
import json
import struct
import socket
from collections import deque

import time

import tornado.ioloop
import tornado.stack_context

from imc.proxy import Connection

def send_pack(stream,data):
    stream.write(struct.pack('l',len(data)) + data)

def recv_pack(stream,callback):
    def _recv_size(data):
        size, = struct.unpack('l',data)
        stream.read_bytes(size,lambda data : callback(data))

    stream.read_bytes(8,_recv_size)

class SocketStream:
    def __init__(self,sock,addr):
        self.DATA_BUF = 0
        self.DATA_FILE = 1

        self._ioloop = tornado.ioloop.IOLoop.current()
        self._sock = sock

        self._conning = False
        self._conn_callback = None
        self._close_callback = None

        self._read_queue = deque()
        self._write_queue = deque()
        self._stat = tornado.ioloop.IOLoop.ERROR
        
        self._sock.setblocking(False)
        self._ioloop.add_handler(sock.fileno(),self._handle_event,tornado.ioloop.IOLoop.ERROR)

        self.addr = addr

    def connect(self,callback):
        try:
            self._conning = True
            self._conn_callback = tornado.stack_context.wrap(callback)

            self._stat |= tornado.ioloop.IOLoop.WRITE
            self._ioloop.update_handler(self._sock.fileno(),self._stat)

            self._sock.connect(self.addr)

        except BlockingIOError:
            pass

    def read_bytes(self,size,callback = None):
        self._read_queue.append([self.DATA_BUF,size,bytearray(),tornado.stack_context.wrap(callback)])
        
        self._stat |= tornado.ioloop.IOLoop.READ
        self._ioloop.update_handler(self._sock.fileno(),self._stat)

    def write(self,buf,callback = None):
        self._write_queue.append([self.DATA_BUF,0,buf,tornado.stack_context.wrap(callback)])

        self._stat |= tornado.ioloop.IOLoop.WRITE
        self._ioloop.update_handler(self._sock.fileno(),self._stat)

    def sendfile(self,fd,callback = None):
        size = os.fstat(fd).st_size

        self._write_queue.append([self.DATA_FILE,size,fd,tornado.stack_context.wrap(callback)])

        self._stat |= tornado.ioloop.IOLoop.WRITE
        self._ioloop.update_handler(self._sock.fileno(),self._stat)

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
        if self._close_callback != None:
            self._close_callback(self)

    def _handle_event(self,fd,evt):
        if evt & tornado.ioloop.IOLoop.READ:
            while len(self._read_queue) > 0:
                iocb = self._read_queue[0]
                datatype = iocb[0]

                if datatype == self.DATA_BUF:
                    size = iocb[1]
                    
                    try:
                        while True:
                            buf = self._sock.recv(size)

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
                    
                    except BlockingIOError:
                        iocb[1] = size
                        break

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
                            off += self._sock.send(buf[off:])

                            if off == len(buf):
                                if iocb[3] != None:
                                    iocb[3]()

                                self._write_queue.popleft()
                                break

                    except BlockingIOError:
                        iocb[1] = off
                        break

                elif datatype == self.DATA_FILE:
                    size = iocb[1]
                    filefd = iocb[2]
                    sockfd = self._sock.fileno()

                    try:
                        while True:
                            size -= os.sendfile(sockfd,filefd,None,min(size,65536))

                            if size == 0:
                                if iocb[3] != None:
                                    iocb[3]()

                                self._write_queue.popleft()
                                break

                    except BlockingIOError:
                        iocb[1] = size
                        break

        stat = tornado.ioloop.IOLoop.ERROR
        if len(self._read_queue) > 0:
            stat |= tornado.ioloop.IOLoop.READ

        if len(self._write_queue) > 0:
            stat |= tornado.ioloop.IOLoop.WRITE

        if stat != self._stat:
            self._stat = stat
            self._ioloop.update_handler(fd,stat)

class SocketConnection(Connection):
    def __init__(self,linkclass,linkid,main_stream,add_pend_filestream_fn = None):
        super().__init__(linkclass,linkid)

        self._ioloop = tornado.ioloop.IOLoop.current()
        self._stream_filekeymap = {}

        self.main_stream = main_stream
        self.main_stream.set_close_callback(self.close)
        self.add_pend_filestream = add_pend_filestream_fn
        
        self._start_ping()

    def send_msg(self,data):
        self.main_stream.write(struct.pack('l',len(data)) + data)

    def send_file(self,filekey,filepath):
        def _conn_cb():
            self._stream_filekeymap[filekey] = file_stream

            send_pack(file_stream,bytes(json.dumps({
                'conntype':'file',
                'filekey':filekey
            }),'utf-8'))

            file_stream.sendfile(fd,_done_cb)

        def _done_cb():
            os.close(fd)
            print('send done')

        fd = os.open(filepath,os.O_RDONLY)
        filesize = os.fstat(fd).st_size

        file_stream = SocketStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0),self.main_stream.addr)
        file_stream.connect(_conn_cb)

        #send_pack(self.file_stream,bytes(json.dumps({'filekey':filekey,'filesize':filesize}),'utf-8'))
        #recv_pack(self.file_stream,_recv_cb)

    def recv_file(self,filekey,filesize,filepath):
        def _conn_cb(file_stream):
            print(filesize)

            file_stream.recvfile(fd,filesize,_done_cb)

        def _done_cb():
            os.close(fd)
            print('recv done')
            print(time.perf_counter() - st)

        self.add_pend_filestream(filekey,_conn_cb)
        fd = os.open(filepath,os.O_WRONLY | os.O_CREAT)

        st = time.perf_counter()

    def send_filedata(self,filekey,filesize):
        pass

    def recv_filedata(self,filekey,filesize):
        print('test')
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

        self.main_stream.close()

        super().close()

    def _start_ping(self):
        def __check():
            self.main_stream.write(struct.pack('l',-1))

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
        self.handler.write_message(data,True)

    def recv_msg(self,data):
        self._recv_callback(self,data)

    def start_recv(self,recv_callback):
        self._recv_callback = tornado.stack_context.wrap(recv_callback)
