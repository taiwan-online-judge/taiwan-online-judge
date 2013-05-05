import struct

import tornado.ioloop
import tornado.stack_context

import imcproxy

def send_pack(stream,data):
    stream.write(struct.pack('l',len(data)) + data)

def recv_pack(stream,callback):
    def _recv_size(data):
        size, = struct.unpack('l',data)
        stream.read_bytes(size,lambda data : callback(data))

    stream.read_bytes(8,_recv_size)

class SocketConnection(imcproxy.IMCConnection):
    def __init__(self,linkid,stream):
        super().__init__(linkid)

        self.ioloop = tornado.ioloop.IOLoop.current()
        self.stream = stream
        self.stream.set_close_callback(self.close)

        self._start_ping()

    def send_msg(self,data):
        self.stream.write(struct.pack('l',len(data)) + data)

    def start_recvloop(self,recvloop_callback):
        def _recv_size(data):
            size, = struct.unpack('l',data)
            if size > 0:
                self.stream.read_bytes(size,_recv_data)
            else:
                if size == -1:    #pong
                    self._ping_delay = 0
                
                self.stream.read_bytes(8,_recv_size)

        def _recv_data(data):
            self._recvloop_callback(self,data)
            self.stream.read_bytes(8,_recv_size)

        self._recvloop_callback = tornado.stack_context.wrap(recvloop_callback)
        self.stream.read_bytes(8,_recv_size)
    
    def close(self):
        try:
            self._ping_timer.stop()
        except AttributeError:
            pass

        super().close()

    def _start_ping(self):
        def __check():
            self.stream.write(struct.pack('l',-1))

            self._ping_delay += 1
            if self._ping_delay > 10:
                self.close()

        self._ping_timer = tornado.ioloop.PeriodicCallback(__check,1000)
        self._ping_timer.start()
        self._ping_delay = 0
