#! /usr/bin/env python

import random
import json
import uuid

import tornado.ioloop
import tornado.tcpserver
import tornado.httpserver
import tornado.web

import netio
from tojauth import TOJAuth
import imc.nonblock
from imc.proxy import Proxy,Connection,imc_call,imc_call_async,imc_register_call

class Worker:
    def __init__(self,stream,linkclass,linkid,idendesc,worker_info,center_linkid):
        self.stream = stream
        self.linkclass = linkclass
        self.linkid = linkid
        self.idendesc = idendesc
        self.sock_addr = (worker_info['sock_ip'],worker_info['sock_port'])

        netio.send_pack(self.stream,bytes(json.dumps({
            'idendesc':self.idendesc,
            'center_linkid':center_linkid
        }),'utf-8'))

        conn = netio.SocketConnection(self.linkclass,self.linkid,self.stream)
        conn.add_close_callback(lambda conn : self.close())
        Proxy.instance.add_conn(conn)

    def close(self):
        pass

class BackendWorker(Worker):
    def __init__(self,stream,linkid,idendesc,worker_info,center_linkid):
        global center_serv

        super().__init__(stream,'backend',linkid,idendesc,worker_info,center_linkid)
        self.ws_addr = (worker_info['ws_ip'],worker_info['ws_port'])

        center_serv.add_backend_worker(self)

    def close(self):
        global center_serv

        center_serv.del_backend_worker(self)
        print('disconnect')

class CenterServer(tornado.tcpserver.TCPServer):
    def __init__(self):
        super().__init__()

        self._linkid_usemap = {}
        self._worker_linkidmap = {}
        self._backend_clientmap = {}
        self._backend_workerlist = []

        pubkey = open('pubkey.pem','r').read()
        privkey = open('privkey.pem','r').read()
        TOJAuth(pubkey,privkey)

        self._linkid = self._create_linkid()
        self._idendesc = self._create_idendesc('center',self._linkid)
        Proxy('center',self._linkid,TOJAuth.instance)

        imc_register_call('','lookup_linkid',self._lookup_linkid)
        imc_register_call('','add_client',self._add_client)
        imc_register_call('','del_client',self._del_client)

        imc_register_call('','test_dst',self._test_dst)
        imc_register_call('','test_dstb',self._test_dstb)

    def handle_stream(self,stream,address):
        def _recv_worker_info(data):
            worker_info = json.loads(data.decode('utf-8'))

            linkclass = worker_info['linkclass']
            if linkclass == 'backend':
                linkid = self._create_linkid()
                idendesc = self._create_idendesc('backend',linkid)
                BackendWorker(stream,linkid,idendesc,worker_info,self._linkid)

        netio.recv_pack(stream,_recv_worker_info)

    def add_backend_worker(self,backend):
        backend_linkid = backend.linkid

        self._worker_linkidmap[backend_linkid] = backend
        self._backend_clientmap[backend_linkid] = {}
        self._backend_workerlist.append(backend)
    
    def del_backend_worker(self,backend):
        backend_linkid = backend.linkid

        del self._worker_linkidmap[backend_linkid]
        del self._backend_clientmap[backend_linkid]
        self._backend_workerlist.remove(backend)

    def dispatch_client(self):
        size = len(self._backend_workerlist)
        if size == 0:
            return None

        linkid = self._create_linkid()
        idendesc = self._create_idendesc('client',linkid)
        backend = self._backend_workerlist[random.randrange(size)]
        ws_ip,ws_port = backend.ws_addr

        return (idendesc,backend.linkid,ws_ip,ws_port)

    def _create_linkid(self):
        linkid = uuid.uuid4()
        while linkid in self._linkid_usemap:
            linkid = uuid.uuid4()
        
        linkid = str(linkid)
        self._linkid_usemap[linkid] = True

        linkid = str(len(self._linkid_usemap))

        return linkid

    def _create_idendesc(self,linkclass,linkid):
        return TOJAuth.instance.create_iden(linkclass,linkid)

    @imc.nonblock.caller
    def _lookup_linkid(self,iden,param):
        linkid = param

        try:
            worker = self._worker_linkidmap[linkid]
            if iden['linkclass'] != 'client':
                sock_ip,sock_port = worker.sock_addr
                return {'worker_linkclass':worker.linkclass,'worker_linkid':worker.linkid,'sock_ip':sock_ip,'sock_port':sock_port}

        except KeyError:
            return None
        
    @imc.nonblock.caller
    def _add_client(self,iden,param):
        backend_linkid = iden['linkid']
        client_linkid = param['client_linkid']

        self._backend_clientmap[backend_linkid][client_linkid] = True
        conn = Proxy.instance.get_conn(backend_linkid)
        Proxy.instance.link_conn(client_linkid,conn)

        print(client_linkid);

        #imc_call_async(self._idendesc,'/client/' + client_linkid + '/','test_call','Hello Client',lambda result:print(result))

    @imc.nonblock.caller
    def _del_client(self,iden,param):
        backend_linkid = iden['linkid']
        client_linkid = param

        del self._backend_clientmap[backend_linkid][client_linkid]
        conn = Proxy.instance.get_conn(client_linkid)
        Proxy.instance.unlink_conn(client_linkid)



    
    @imc.nonblock.caller
    def _test_dst(self,iden,param):
        linkidlist = []
        clientmaps = self._backend_clientmap.values()
        for clientmap in clientmaps:
            linkids = clientmap.keys()
            for linkid in linkids:
                linkidlist.append(linkid)

        return linkidlist

    @imc.nonblock.caller
    def _test_dstb(self,iden,param):
        return param + ' World'

class WebConnHandler(tornado.web.RequestHandler):
    def set_default_headers(self):
        self.set_header('Access-Control-Allow-Origin','*')

    def post(self):
        global center_serv

        data = center_serv.dispatch_client()
        if data == None:
            self.write('Eno_backend')
        else:
            client_idendesc,backend_linkid,ip,port = data
            self.write(json.dumps({
                'client_idendesc':client_idendesc,
                'backend_linkid':backend_linkid,
                'ip':ip,
                'port':port
            }))

if __name__ == '__main__':
    global center_serv

    center_serv = CenterServer()
    center_serv.listen(5730)

    http_serv = tornado.httpserver.HTTPServer(tornado.web.Application([
        ('/conn',WebConnHandler),
    ]))
    http_serv.listen(83)

    tornado.ioloop.IOLoop.instance().start()
