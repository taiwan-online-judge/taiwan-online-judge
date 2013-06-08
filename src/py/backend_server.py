#! /usr/bin/env python

import socket
import json
import datetime
import time
import random
from multiprocessing import Process

import tornado.ioloop
import tornado.tcpserver
import tornado.httpserver
import tornado.websocket

from imc import auth
import imc.async
from imc.proxy import Proxy,Connection,imc_call,imc_call_async,imc_register_call

import netio
from netio import SocketStream,SocketConnection,WebSocketConnection
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
        self._pend_mainconn_linkidmap = {}
        self._pend_filestream_filekeymap = {}
        self._client_linkidmap = {}

    def start(self):
        sock_port = random.randrange(4096,8192)
        self.sock_addr = ('10.8.0.10',sock_port)

        self.bind(sock_port,'',socket.AF_INET,65536)
        super().start()

        self._conn_center()

    def handle_stream(self,stream,addr):
        def _recv_conn_info(data):
            info = json.loads(data.decode('utf-8'))
            conntype = info['conntype']

            if conntype == 'main':
                self._handle_mainconn(sock_stream,addr,info)

            elif conntype == 'file':
                self._handle_fileconn(sock_stream,addr,info)

        fd = stream.fileno()
        self._ioloop.remove_handler(fd)
        sock_stream = SocketStream(socket.fromfd(fd,socket.AF_INET,socket.SOCK_STREAM | socket.SOCK_NONBLOCK,0))

        netio.recv_pack(sock_stream,_recv_conn_info)

    def add_client(self,linkid,handler):
        self._client_linkidmap[linkid] = {}

        conn = netio.WebSocketConnection('client',linkid,handler)
        conn.add_close_callback(lambda conn : self.del_client(conn.linkid))
        Proxy.instance.add_conn(conn)

        #imc_call_async(self._idendesc,'/center/' + self.center_conn.linkid + '/','add_client',{'backend_linkid':self._linkid,'client_linkid':linkid})

        return conn

    def del_client(self,linkid):
        del self._client_linkidmap[linkid]

        #imc_call_async(self._idendesc,'/center/' + self.center_conn.linkid + '/','del_client',linkid)

    def _conn_center(self):
        def __retry(conn):
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
                Proxy('backend',self._linkid,TOJAuth.instance,self._idendesc,self._conn_linkid)

                self.center_conn = SocketConnection('center',info['center_linkid'],stream,self.center_addr)
                self.center_conn.add_close_callback(__retry)
                Proxy.instance.add_conn(self.center_conn)

                imc_register_call('','test_dst',self._test_dst)
                #imc_register_call('','test_dsta',self._test_dsta)
                #time.sleep(2)

                if int(self._linkid) == 2:
                    self._test_call('9')

            sock_ip,sock_port = self.sock_addr
            netio.send_pack(stream,bytes(json.dumps({
                'linkclass':'backend',
                'sock_ip':sock_ip,
                'sock_port':sock_port,
                'ws_ip':'210.70.137.215',
                'ws_port':self.ws_port
            }),'utf-8'))
            netio.recv_pack(stream,___recv_info_cb)

        stream = SocketStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
        stream.set_close_callback(__retry)
        stream.connect(self.center_addr,__send_worker_info)

    def _conn_linkid(self,linkid):
        def __handle_pend(conn):
            try:
                retids = self._pend_mainconn_linkidmap.pop(worker_linkid)
            
            except KeyError:
                return

            for retid in retids:
                imc.async.ret(retid,conn)

        def __conn_cb():
            conn = Proxy.instance.get_conn(worker_linkid)
            if conn != None:
                __handle_pend(conn)
                main_stream.set_close_callback(None)
                main_stream.close()
            
            else:
                sock_ip,sock_port = self.sock_addr
                netio.send_pack(main_stream,bytes(json.dumps({
                    'conntype':'main',
                    'linkclass':'backend',
                    'linkid':self._linkid,
                    'sock_ip':sock_ip,
                    'sock_port':sock_port
                }),'utf-8'))
                netio.recv_pack(main_stream,__recv_cb)

        def __recv_cb(data):
            stat = json.loads(data.decode('utf-8'))
            if stat == True:
                conn = SocketConnection(worker_linkclass,worker_linkid,main_stream,sock_addr,self._add_pend_filestream)
                Proxy.instance.add_conn(conn)
                __handle_pend(conn)

            else:
                main_stream.set_close_callback(None)
                main_stream.close()
        
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

            elif worker_linkid in self._pend_mainconn_linkidmap:
                self._pend_mainconn_linkidmap[worker_linkid].append(imc.async.get_retid())
                return imc.async.switch_top()

            else:
                self._pend_mainconn_linkidmap[worker_linkid] = [imc.async.get_retid()]

                sock_addr = (ret['sock_ip'],ret['sock_port'])

                main_stream = SocketStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
                main_stream.set_close_callback(lambda conn : __handle_pend(None))
                main_stream.connect(sock_addr,__conn_cb)

                return imc.async.switch_top()

    def _add_pend_filestream(self,filekey,callback):
        self._pend_filestream_filekeymap[filekey] = tornado.stack_context.wrap(callback)

    def _handle_mainconn(self,main_stream,addr,info):
        linkclass = info['linkclass']
        linkid = info['linkid']
        sock_ip = info['sock_ip']
        sock_port = info['sock_port']

        conn = Proxy.instance.get_conn(linkid)
        if conn != None:
            return

        if (linkid not in self._pend_mainconn_linkidmap) or self._linkid > linkid:
            conn = SocketConnection(linkclass,linkid,main_stream,(sock_ip,sock_port),self._add_pend_filestream)
            Proxy.instance.add_conn(conn)

            netio.send_pack(main_stream,bytes(json.dumps(True),'utf-8'))
            
            if linkid in self._pend_mainconn_linkidmap:
                retids = self._pend_mainconn_linkidmap.pop(linkid)
                for retid in retids:
                    imc.async.ret(retid,conn)

        else:
            netio.send_pack(main_stream,bytes(json.dumps(False),'utf-8'))
        
    def _handle_fileconn(self,file_stream,addr,info):
        try:
            self._pend_filestream_filekeymap.pop(info['filekey'])(file_stream)

        except KeyError:
            pass

    @imc.async.caller
    def _test_call(self,param):
        dst = '/backend/' + '3' + '/'
        ret = imc_call_async(self._idendesc,dst,'test_dst',lambda result : print(result),'test',113)
        print(ret)

        ret = imc_call(self._idendesc,'/center/1/','create_iden','client','1234',1221,TOJAuth.ROLETYPE_USER,{'uid':31})
        print(ret)

        return

        pend = []
        for i in range(0,32):
            if str((i % 16) + 2) == self._linkid:
                continue

            fileres = Proxy.instance.sendfile('/backend/' + str((i % 16) + 2) + '/','Fedora-18-x86_64-DVD.iso')
            
            dst = '/backend/' + str((i % 16) + 2) + '/'
            ret = imc_call(self._idendesc,dst,'test_dst',fileres.filekey)

            pend.append(fileres)

        for p in pend:
            print(self._linkid + ' ' + p.wait())

        print(self._linkid)

    @imc.async.caller
    def _test_dst(self,param,sdfsdf):
        #stat,ret = imc_call(self._idendesc,'/backend/' + self._linkid + '/','test_dsta',param)
        #return ret + ' Too'

        print(param)
        print(sdfsdf)
        print(TOJAuth.get_current_iden())

        #Proxy.instance.rejectfile(param)
        #print('recv ' + iden['linkid'] + ' > ' + self._linkid)
        #fileres = Proxy.instance.recvfile(param,'data')
        #print('recv ' + fileres.wait())

        return 'ok'

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

    backend_worker = BackendWorker(('10.8.0.10',5730),ws_port)
    backend_worker.start()

    tornado.ioloop.IOLoop.instance().start()

if __name__ == '__main__':
    worker_list = []

    worker_list.append(Process(target = start_backend_worker,args = (81, )))
    worker_list.append(Process(target = start_backend_worker,args = (82, )))
    #worker_list.append(Process(target = start_backend_worker,args = (181, )))
    #worker_list.append(Process(target = start_backend_worker,args = (182, )))
    #worker_list.append(Process(target = start_backend_worker,args = (183, )))
    #worker_list.append(Process(target = start_backend_worker,args = (184, )))
    #worker_list.append(Process(target = start_backend_worker,args = (185, )))
    #worker_list.append(Process(target = start_backend_worker,args = (186, )))

    for proc in worker_list:
        proc.start()

    for proc in worker_list:
        proc.join()

