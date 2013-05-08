#! /usr/bin/env python

import random
import json
import uuid

import tornado.ioloop
import tornado.tcpserver
import tornado.httpserver
import tornado.web

import netio
import imc.nonblock
from imc.proxy import Proxy,Connection,imc_register_call

class Worker:
    def __init__(self,stream,linkclass,linkid,worker_ip):
        global center_serv

        self.stream = stream
        self.linkclass = linkclass
        self.linkid = linkid
        self.worker_ip = worker_ip

        netio.send_pack(self.stream,bytes(json.dumps({
            'linkid':self.linkid,
            'center_linkid':center_serv.linkid
        }),'utf-8'))

        conn = netio.SocketConnection(self.linkid,self.stream)
        conn.add_close_callback(lambda conn : self.close())
        Proxy.instance.add_conn(conn)

    def close(self):
        pass

class BackendWorker(Worker):
    def __init__(self,stream,linkid,worker_ip,worker_info):
        global center_serv

        super().__init__(stream,'backend',linkid,worker_ip)
        self.ws_addr = worker_info['ws_addr']

        center_serv.add_backend_worker(self)

    def add_client(self):
        return self.ws_addr

    def close(self):
        global center_serv

        center_serv.del_backend_worker(self)
        print('disconnect')

class CenterServer(tornado.tcpserver.TCPServer):
    def __init__(self):
        super().__init__()

        self.linkid_usemap = {}
        self.backend_workerlist = []

        self.linkclass = 'center'
        self.linkid = self._create_linkid()
        Proxy(self.linkid)

        print('/center/' + self.linkid)

        imc_register_call('','test_dst',self._test_dst)

    def handle_stream(self,stream,address):
        def _recv_worker_info(data):
            worker_info = json.loads(data.decode('utf-8'))

            linkclass = worker_info['linkclass']
            if linkclass == 'backend':
                linkid = self._create_linkid()
                worker_ip,worker_port = address 
                worker = BackendWorker(stream,linkid,worker_ip,worker_info)

        netio.recv_pack(stream,_recv_worker_info)

    def add_backend_worker(self,worker):
        self.backend_workerlist.append(worker)
    
    def del_backend_worker(self,worker):
        self.backend_workerlist.remove(worker)

    def add_client(self):
        size = len(self.backend_workerlist)
        if size == 0:
            return None

        return self.backend_workerlist[random.randrange(size)].add_client()

    def _create_linkid(self):
        linkid = uuid.uuid4()
        while linkid in self.linkid_usemap:
            linkid = uuid.uuid4()
        
        linkid = str(linkid)
        self.linkid_usemap[linkid] = True
        
        return linkid

    @imc.nonblock.func
    def _test_dst(self,param):
        return 'Hello Too'

class WebConnHandler(tornado.web.RequestHandler):
    def get(self):
        global center_serv

        addr = center_serv.add_client()
        if addr == None:
            self.write('Eno_backend')
        else:
            ip,port = addr
            self.write(json.dumps({
                'ip':ip,'port':port
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
