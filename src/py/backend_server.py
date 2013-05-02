import socket
import struct
import json

import tornado.iostream
import tornado.ioloop

import imcproxy

class BackendWorker():
    def __init__(self,center_addr):
        self.linkclass = 'backend'
        self.linkid = None
        self.center_addr = center_addr

        self.imc_proxy = imcproxy.IMCProxy()

    def start(self):
        self._sock_conn()

    def send_pack(self,data):
        self.center_stream.write(struct.pack('L',len(data)) + data)

    def recv_pack(self,callback):
        def _recv_size(data):
            size, = struct.unpack('L',data)
            self.center_stream.read_bytes(size,_recv_data)

        def _recv_data(data):
            callback(json.loads(data.decode('utf-8')))

        self.center_stream.read_bytes(8,_recv_size)

    def _sock_conn(self):
        def __sock_conn_cb():
            self._send_worker_info()

        self.center_stream = tornado.iostream.IOStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
        self.center_stream.set_close_callback(self._sock_close_cb)
        self.center_stream.connect(self.center_addr,__sock_conn_cb)

    def _sock_close_cb(self):
        print('disconnect')

    def _send_worker_info(self):
        def __recv_info_cb(info):
            self.linkid = info['linkid']
            self.imc_proxy.add_sock_conn(self.center_stream,info['center_linkid'])

            print('/backend/' + self.linkid)
        
        self.send_pack(bytes(json.dumps({
            'linkclass':self.linkclass,
            'ws_addr':('210.70.123.215',81)
        }),'utf-8'))

        self.recv_pack(__recv_info_cb)

if __name__ == '__main__':
    backend_worker = BackendWorker(('localhost',2501))
    backend_worker.start()

    tornado.ioloop.IOLoop.instance().start()
