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

from imc import auth
import imc.async
from imc.proxy import Proxy,Connection,imc_call,imc_call_async,imc_register_call

import netio
from netio import SocketConnection,WebSocketConnection
from tojauth import TOJAuth

class BackendWorker(tornado.tcpserver.TCPServer):
    def __init__(self,center_addr,ws_port):
        super().__init__()

        self._ioloop = tornado.ioloop.IOLoop.current()
        self.center_addr = center_addr
        self.sock_addr = None
        self.ws_port = ws_port

        self._linkid = None
        self._idendesc = None
        self._pend_callconn_linkidmap = {}
        self._pend_fileconn_linkidmap = {}
        self._client_linkidmap = {}

    def start(self):
        sock_port = random.randrange(4096,8192)
        self.listen(sock_port)
        self.sock_addr = ('127.0.0.1',sock_port)

        self._conn_center()

    def handle_stream(self,stream,addr):
        def _recv_conn_info(data):
            info = json.loads(data.decode('utf-8'))
            conntype = info['conntype']

            if conntype == 'call':
                self._handle_callconn(stream,addr,info)

            elif conntype == 'file':
                self._handle_fileconn(stream,addr,info)

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
                Proxy('backend',self._linkid,TOJAuth.instance,self._conn_linkid)

                self.center_conn = netio.SocketConnection('center',info['center_linkid'],stream)
                self.center_conn.add_close_callback(lambda conn : __retry())
                Proxy.instance.add_conn(self.center_conn)


                imc_register_call('','test_dst',self._test_dst)
                imc_register_call('','test_dsta',self._test_dsta)
                time.sleep(0.5)

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

    def _conn_linkid(self,linkid):
        def __handle_pend(conn):
            pends = self._pend_callconn_linkidmap.pop(worker_linkid)
            for gr in pends:
                gr.switch(conn)

        def __call_conn_cb():
            conn = Proxy.instance.get_conn(worker_linkid)
            if conn != None:
                __handle_pend(conn)
                call_stream.set_close_callback(None)
                call_stream.close()
            
            else:
                netio.send_pack(call_stream,bytes(json.dumps({
                    'conntype':'call',
                    'linkclass':'backend',
                    'linkid':self._linkid
                }),'utf-8'))
                netio.recv_pack(call_stream,__call_recv_cb)

        def __call_recv_cb(data):
            def ___file_conn_cb():
                netio.send_pack(file_stream,bytes(json.dumps({
                    'conntype':'file',
                    'linkid':self._linkid
                }),'utf-8'))

                conn = netio.SocketConnection(worker_linkclass,worker_linkid,call_stream,file_stream)
                Proxy.instance.add_conn(conn)
                __handle_pend(conn)
                
            stat = json.loads(data.decode('utf-8'))
            if stat == True:
                file_stream = netio.SocketStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
                file_stream.connect(sock_addr,___file_conn_cb)

            else:
                call_stream.set_close_callback(None)
                call_stream.close()
        
        if self.center_conn == None:
            return None

        stat,ret = imc_call(self._idendesc,'/center/' + self.center_conn.linkid + '/','lookup_linkid',linkid)

        if stat == False or ret == None:
            return None

        else:
            worker_linkclass = ret['worker_linkclass']
            worker_linkid = ret['worker_linkid']

            conn = Proxy.instance.get_conn(worker_linkid)
            if conn != None:
                return conn

            elif worker_linkid in self._pend_callconn_linkidmap:
                self._pend_callconn_linkidmap[worker_linkid].append(imc.async.current())
                return imc.async.switchtop()

            else:
                self._pend_callconn_linkidmap[worker_linkid] = [imc.async.current()]

                sock_addr = (ret['sock_ip'],ret['sock_port'])

                call_stream = tornado.iostream.IOStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
                call_stream.set_close_callback(lambda : __handle_pend(None))
                call_stream.connect(sock_addr,__call_conn_cb)

                return imc.async.switchtop()

    def _handle_callconn(self,call_stream,addr,info):
        def __send_back(stat):
            if stat == True:
                self._pend_fileconn_linkidmap[linkid] = __file_conn_cb

            netio.send_pack(call_stream,bytes(json.dumps(stat),'utf-8'))

        def __file_conn_cb(file_stream):
            conn = netio.SocketConnection(linkclass,linkid,call_stream,file_stream)
            Proxy.instance.add_conn(conn)

        linkclass = info['linkclass']
        linkid = info['linkid']

        conn = Proxy.instance.get_conn(linkid)
        if conn != None:
            return

        if linkid not in self._pend_callconn_linkidmap:
            __send_back(True)

        else:
            if self._linkid > linkid:
                __send_back(True)

                pends = self._pend_callconn_linkidmap.pop(linkid)
                for callback in pends:
                    callback(conn)

            else:
                __send_back(False)
        
    def _handle_fileconn(self,file_stream,addr,info):
        try:
            print('ok')
            self._pend_fileconn_linkidmap.pop(info['linkid'])(file_stream)

        except KeyError:
            pass

    @imc.async.caller
    def _test_call(self,iden,param):
        print(time.perf_counter())
        dst = '/backend/' + param + '/'
        for i in range(1):
            ret = imc_call(self._idendesc,dst,'test_dst','Hello')
        print(time.perf_counter())

        print(ret)

    @imc.async.caller
    def _test_dst(self,iden,param):
        stat,ret = imc_call(self._idendesc,'/backend/' + self._linkid + '/','test_dsta',param)
        return ret + ' Too'

    @imc.async.caller
    def _test_dsta(self,iden,param):
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

