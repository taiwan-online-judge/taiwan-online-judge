#! /usr/bin/env python

import socket
import json
import datetime
import time
from multiprocessing import Process

import tornado.iostream
import tornado.ioloop
import tornado.httpserver
import tornado.websocket

import netio
import imc.nonblock
from imc.proxy import Proxy,Connection,imc_call,imc_register_call

class BackendWorker():
    def __init__(self,center_addr,ws_port):
        self.ioloop = tornado.ioloop.IOLoop.current()
        self.center_addr = center_addr
        self.linkclass = 'backend'
        self.linkid = None
        self.ws_port = ws_port

        self._client_linkidmap = {}

    def start(self):
        self._conn_center()

    def add_client(self,linkid,handler):
        self._client_linkidmap[linkid] = {}

        conn = netio.WebSocketConnection(linkid,handler)
        conn.add_close_callback(lambda conn : self.del_client(conn.linkid))
        Proxy.instance.add_conn(conn)

        return conn

    def del_client(self,linkid):
        del self._client_linkidmap[linkid]

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
                'ws_addr':('210.70.137.215',self.ws_port)
            }),'utf-8'))
            netio.recv_pack(stream,___recv_info_cb)

        stream = tornado.iostream.IOStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
        stream.set_close_callback(__retry)
        stream.connect(self.center_addr,lambda : __send_worker_info())

    @imc.nonblock.func
    def _test_call(self,param):
        print(time.perf_counter())
        ret = (yield imc_call(self.linkid,'/backend/' + self.center_conn.linkid,'test_dst','Hello'))
        print(time.perf_counter())
        print(ret)

    @imc.nonblock.func
    def _test_dst(self,param):
        return param + ' Too'

class WebSocketConnHandler(tornado.websocket.WebSocketHandler):
    def open(self):
        pass

    def on_message(self,msg):
        global backend_worker

        if hasattr(self,'worker_conn'):
            self.worker_conn.recv_msg(msg)
        
        else:
            info = json.loads(msg)
            self.worker_conn = backend_worker.add_client(info['client_linkid'],self)

    def on_close(self):
        if hasattr(self,'worker_conn'):
            self.worker_conn.close()

def start_backend_worker(ws_port):
    global backend_worker

    http_serv = tornado.httpserver.HTTPServer(tornado.web.Application([
        ('/conn',WebSocketConnHandler)
    ]))
    http_serv.listen(ws_port)

    backend_worker = BackendWorker(('localhost',5730),ws_port)
    backend_worker.start()

    tornado.ioloop.IOLoop.instance().start()

if __name__ == '__main__':
    worker_list = []

    worker_list.append(Process(target = start_backend_worker,args = (81, )))
    worker_list.append(Process(target = start_backend_worker,args = (82, )))

    for proc in worker_list:
        proc.start()

    for proc in worker_list:
        proc.join()

