#! /usr/bin/env python

import socket
import json
import datetime

import tornado.iostream
import tornado.ioloop

import netio
import imc.nonblock
from imc.proxy import Proxy,Connection,imc_call,imc_register_call

class BackendWorker():
    def __init__(self,center_addr):
        self.ioloop = tornado.ioloop.IOLoop.current()
        self.center_addr = center_addr

        self.linkclass = 'backend'
        self.linkid = None

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
                Proxy(self.linkid)

                self.center_conn = netio.SocketConnection(info['center_linkid'],stream)
                self.center_conn.add_close_callback(lambda conn : __retry())
                Proxy.instance.add_conn(self.center_conn)

                print('/backend/' + self.linkid)


                imc_register_call('','test_dst',self._test_dst)
                self._test_call(None)

            netio.send_pack(stream,bytes(json.dumps({
                'linkclass':self.linkclass,
                'ws_addr':('210.70.137.215',81)
            }),'utf-8'))
            netio.recv_pack(stream,___recv_info_cb)

        stream = tornado.iostream.IOStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
        stream.set_close_callback(__retry)
        stream.connect(self.center_addr,lambda : __send_worker_info())

    @imc.nonblock.func
    def _test_call(self,param):
        ret = (yield imc_call(None,'/backend/' + self.center_conn.linkid,'test_dst','Hello'))
        print(ret)

    @imc.nonblock.func
    def _test_dst(self,param):
        return 'Hello Too'
       
if __name__ == '__main__':
    backend_worker = BackendWorker(('localhost',5730))
    backend_worker.start()

    tornado.ioloop.IOLoop.instance().start()
