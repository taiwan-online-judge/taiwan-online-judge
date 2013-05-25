import struct

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

class SocketConnection(Connection):
    def __init__(self,linkclass,linkid,call_stream,file_stream = None):
        super().__init__(linkclass,linkid)

        self._ioloop = tornado.ioloop.IOLoop.current()
        self.call_stream = call_stream
        self.call_stream.set_close_callback(self.close)

        if file_stream == None:
            self.file_stream = None

        else:
            self.file_stream = file_stream
            self.file_stream.set_close_callback(self.close)

        self._start_ping()

    def send_msg(self,data):
        self.call_stream.write(struct.pack('l',len(data)) + data)

    def start_recv(self,recv_callback):
        def _recv_size(data):
            size, = struct.unpack('l',data)
            if size > 0:
                self.call_stream.read_bytes(size,_recv_data)
            else:
                if size == -1:    #pong
                    self._ping_delay = 0
                
                self.call_stream.read_bytes(8,_recv_size)

        def _recv_data(data):
            self._recv_callback(self,data)
            self.call_stream.read_bytes(8,_recv_size)

        self._recv_callback = tornado.stack_context.wrap(recv_callback)
        self.call_stream.read_bytes(8,_recv_size)
    
    def close(self):
        try:
            self._ping_timer.stop()
        except AttributeError:
            pass

        self.call_stream.close()
        if self.file_stream != None:
            self.file_stream.close()

        super().close()

    def _start_ping(self):
        def __check():
            self.call_stream.write(struct.pack('l',-1))

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
