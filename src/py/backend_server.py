#! /usr/bin/env python

import socket
import json
import datetime

import tornado.iostream
import tornado.ioloop

import netio
import imcproxy

class BackendWorker():
    def __init__(self,center_addr):
        self.ioloop = tornado.ioloop.IOLoop.current()
        self.center_addr = center_addr

        self.linkclass = 'backend'
        self.linkid = None
        self.imc_proxy = imcproxy.IMCProxy()

    def start(self):
        self._conn_center()

    def _conn_center(self):
        def __retry():
            print('retry connect center')
            self.ioloop.add_timeout(datetime.timedelta(seconds = 5),self._conn_center)

        def __send_worker_info():
            def ___recv_info_cb(data):
                info = json.loads(data.decode('utf-8'))

                self.linkid = info['linkid']
                self.center_conn = netio.SocketConnection(stream)
                self.center_conn.add_close_callback(lambda conn : __retry())
                self.imc_proxy.add_conn(info['center_linkid'],self.center_conn)

                print('/backend/' + self.linkid)

                self.imc_proxy._send_msg_call(self.center_conn,None,None,'Hello',None)

            netio.send_pack(stream,bytes(json.dumps({
                'linkclass':self.linkclass,
                'ws_addr':('210.70.137.215',81)
            }),'utf-8'))
            netio.recv_pack(stream,___recv_info_cb)

        stream = tornado.iostream.IOStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
        stream.set_close_callback(__retry)
        stream.connect(self.center_addr,lambda : __send_worker_info())
       
if __name__ == '__main__':
    backend_worker = BackendWorker(('localhost',5730))
    backend_worker.start()

    tornado.ioloop.IOLoop.instance().start()
