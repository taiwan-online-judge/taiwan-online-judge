#! /usr/bin/env python

import socket
import json
import datetime
import time
import random
from multiprocessing import Process

import tornado.iostream
import tornado.ioloop
import tornado.tcpserver
import tornado.httpserver
import tornado.websocket

import netio
from tojauth import TOJAuth
import imc.nonblock
from imc.proxy import Proxy,Connection,imc_call,imc_call_async,imc_register_call

class BackendWorker(tornado.tcpserver.TCPServer):
    def __init__(self,center_addr,ws_port):
        super().__init__()

        self._ioloop = tornado.ioloop.IOLoop.current()
        self.center_addr = center_addr
        self.sock_addr = None
        self.ws_port = ws_port

        self._linkid = None
        self._idendesc = None
        self._pendconn_linkidmap = {}
        self._client_linkidmap = {}

    def start(self):
        sock_port = random.randrange(4096,8192)
        self.listen(sock_port)
        self.sock_addr = ('127.0.0.1',sock_port)
        self._conn_center()

    def handle_stream(self,stream,address):
        def _recv_conn_info(data):
            def __send_back(stat):
                netio.send_pack(stream,bytes(json.dumps(stat),'utf-8'))

            info = json.loads(data.decode('utf-8'))
            linkclass = info['linkclass']
            linkid = info['linkid']

            conn = Proxy.instance.get_conn(linkid)
            if conn != None:
                return

            if linkid not in self._pendconn_linkidmap:
                __send_back(True)

                conn = netio.SocketConnection(linkclass,linkid,stream)
                Proxy.instance.add_conn(conn)

            else:
                if self._linkid > linkid:
                    __send_back(True)

                    conn = netio.SocketConnection(linkclass,linkid,stream)
                    Proxy.instance.add_conn(conn)

                    pends = self._pendconn_linkidmap.pop(linkid)
                    for callback in pends:
                        callback(conn)

                else:
                    __send_back(False)

        netio.recv_pack(stream,_recv_conn_info)

    def add_client(self,linkid,handler):
        self._client_linkidmap[linkid] = {}

        conn = netio.WebSocketConnection('client',linkid,handler)
        conn.add_close_callback(lambda conn : self.del_client(conn.linkid))
        Proxy.instance.add_conn(conn)

        imc_call_async(self._idendesc,'/center/' + self.center_conn.linkid + '/','add_client',{'backend_linkid':self._linkid,'client_linkid':linkid})

        return conn

    def del_client(self,linkid):
        del self._client_linkidmap[linkid]

        imc_call_async(self._idendesc,'/center/' + self.center_conn.linkid + '/','del_client',linkid)

    def _conn_center(self):
        def __retry():
            print('retry connect center')

            self.center_conn = None
            self._ioloop.add_timeout(datetime.timedelta(seconds = 5),self._conn_center)

        def __send_worker_info():
            def ___recv_info_cb(data):
                info = json.loads(data.decode('utf-8'))

                pubkey = open('pubkey.pem','r').read()
                TOJAuth(pubkey)

                self._idendesc = info['idendesc']
                iden = TOJAuth.instance.get_iden('backend',self._linkid,self._idendesc)
                self._linkid = iden['linkid']
                Proxy('backend',self._linkid,TOJAuth.instance,self._connect_linkid)

                self.center_conn = netio.SocketConnection('center',info['center_linkid'],stream)
                self.center_conn.add_close_callback(lambda conn : __retry())
                Proxy.instance.add_conn(self.center_conn)

                imc_register_call('','test_dst',self._test_dst)
                time.sleep(0.5)

                #x = int(self._iden['linkid']) - (int(self._iden['linkid']) - 2) % 4
                #self._test_call(None,str(x))
                if int(self._linkid) % 2 == 0:
                    self._test_call(None,str(int(self._linkid) + 1))

            sock_ip,sock_port = self.sock_addr
            netio.send_pack(stream,bytes(json.dumps({
                'linkclass':'backend',
                'sock_ip':sock_ip,
                'sock_port':sock_port,
                'ws_ip':'210.70.137.215',
                'ws_port':self.ws_port
            }),'utf-8'))
            netio.recv_pack(stream,___recv_info_cb)

        stream = tornado.iostream.IOStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
        stream.set_close_callback(__retry)
        stream.connect(self.center_addr,__send_worker_info)

    @imc.nonblock.caller
    def _connect_linkid(self,linkid,callback):
        def __handle_pend(conn):
            pends = self._pendconn_linkidmap.pop(worker_linkid)
            for callback in pends:
                callback(conn)

        def __send_info():
            def ___recv_cb(data):
                stat = json.loads(data.decode('utf-8'))

                if stat == True:
                    conn = netio.SocketConnection(worker_linkclass,worker_linkid,stream)
                    Proxy.instance.add_conn(conn)
                    __handle_pend(conn)

                else:
                    stream.set_close_callback(None)
                    stream.close()

            conn = Proxy.instance.get_conn(worker_linkid)
            if conn != None:
                __handle_pend(conn)
                stream.set_close_callback(None)
                stream.close()
            
            else:
                netio.send_pack(stream,bytes(json.dumps({
                    'linkclass':'backend',
                    'linkid':self._linkid
                }),'utf-8'))
                netio.recv_pack(stream,___recv_cb)

        if self.center_conn == None:
            callback(None)
            return

        stat,ret = (yield imc_call(self._idendesc,'/center/' + self.center_conn.linkid + '/','lookup_linkid',linkid))
        
        if stat == False or ret == None:
            callback(None)

        else:
            worker_linkclass = ret['worker_linkclass']
            worker_linkid = ret['worker_linkid']

            conn = Proxy.instance.get_conn(worker_linkid)
            if conn != None:
                callback(conn)

            elif worker_linkid in self._pendconn_linkidmap:
                self._pendconn_linkidmap[worker_linkid].append(tornado.stack_context.wrap(callback))

            else:
                self._pendconn_linkidmap[worker_linkid] = [tornado.stack_context.wrap(callback)]

                stream = tornado.iostream.IOStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
                stream.set_close_callback(lambda : __handle_pend(None))
                stream.connect((ret['sock_ip'],ret['sock_port']),__send_info)
        
    @imc.nonblock.caller
    def _test_call(self,iden,param):
        print(time.perf_counter())
        dst = '/backend/' + param + '/'
        for i in range(10000):
            stat,ret = (yield imc_call(self._idendesc,dst,'test_dst','Hello'))
        print(time.perf_counter())

        print(stat,ret)

    @imc.nonblock.caller
    def _test_dst(self,iden,param):
        return param + ' Too'

class WebSocketConnHandler(tornado.websocket.WebSocketHandler):
    def open(self):
        pass

    def on_message(self,msg):
        global backend_worker

        if hasattr(self,'backend_conn'):
            self.backend_conn.recv_msg(msg)
        
        else:
            try:
                info = json.loads(msg)
                self.backend_conn = backend_worker.add_client(info['client_linkid'],self)

            except Exception:
                self.close()

    def on_close(self):
        global backend_backend

        if hasattr(self,'backend_conn'):
            self.backend_conn.close()

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
    #worker_list.append(Process(target = start_backend_worker,args = (181, )))
    #worker_list.append(Process(target = start_backend_worker,args = (182, )))

    for proc in worker_list:
        proc.start()

    for proc in worker_list:
        proc.join()

