#! /usr/bin/env python

import random
import json
import uuid
import socket

import tornado.ioloop
import tornado.tcpserver
import tornado.httpserver
import tornado.web

import imc.async
from imc.proxy import Proxy,Connection

import netio
from netio import SocketStream,SocketConnection
from tojauth import TOJAuth

class Worker:
    def __init__(self,main_stream,link,idendesc,worker_info,center_link):
        self.main_stream = main_stream
        self.link = link
        self.idendesc = idendesc
        self.sock_addr = (worker_info['sock_ip'],worker_info['sock_port'])

        netio.send_pack(self.main_stream,bytes(json.dumps({
            'idendesc':self.idendesc,
            'worker_link':self.link,
            'center_link':center_link
        }),'utf-8'))

        conn = SocketConnection(self.link,self.main_stream,self.sock_addr)
        conn.add_close_callback(lambda conn : self.close())
        Proxy.instance.add_conn(conn)

    def close(self):
        pass

class BackendWorker(Worker):
    def __init__(self,main_stream,link,idendesc,worker_info,center_link):
        global center_serv

        super().__init__(main_stream,link,idendesc,worker_info,center_link)
        self.ws_addr = (worker_info['ws_ip'],worker_info['ws_port'])

        center_serv.add_backend_worker(self)

    def close(self):
        global center_serv

        center_serv.del_backend_worker(self)
        print('disconnect')

class CenterServer(tornado.tcpserver.TCPServer):
    def __init__(self):
        super().__init__()

        self._ioloop = tornado.ioloop.IOLoop.instance()
        self._linkid_usemap = {}
        self._worker_linkmap = {}
        self._client_linkmap = {}
        self._client_backendmap = {}
        self._backend_workerlist = []
        self._uid_clientmap = {}

        pubkey = open('pubkey.pem','r').read()
        privkey = open('privkey.pem','r').read()
        TOJAuth(pubkey,privkey)

        self._link = self._create_link('center')

        self._idendesc = TOJAuth.instance.create_iden(self._link,1,TOJAuth.ROLETYPE_TOJ)
        Proxy(self._link,TOJAuth.instance,self._idendesc)

        Proxy.instance.register_call('core/','lookup_link',self._lookup_link)
        Proxy.instance.register_call('core/','create_iden',self._create_iden)
        Proxy.instance.register_call('core/','add_client',self._add_client)
        Proxy.instance.register_call('core/','del_client',self._del_client)
        Proxy.instance.register_call('core/','get_uid_clientlink',self._get_uid_clientlink)
        
        #Proxy.instance.register_call('test/','get_client_list',self._test_get_client_list)

    def handle_stream(self,stream,addr):
        def _recv_worker_info(data):
            worker_info = json.loads(data.decode('utf-8'))

            linkclass = worker_info['linkclass']
            if linkclass == 'backend':
                link = self._create_link('backend')
                idendesc = TOJAuth.instance.create_iden(link,1,TOJAuth.ROLETYPE_TOJ)
                BackendWorker(main_stream,link,idendesc,worker_info,self._link)

        fd = stream.fileno()
        self._ioloop.remove_handler(fd)
        main_stream = SocketStream(socket.fromfd(fd,socket.AF_INET,socket.SOCK_STREAM | socket.SOCK_NONBLOCK,0))

        netio.recv_pack(main_stream,_recv_worker_info)

    def add_backend_worker(self,backend):
        backend_link = backend.link

        self._worker_linkmap[backend_link] = backend
        self._backend_workerlist.append(backend)
        self._client_backendmap[backend_link] = set()
    
    def del_backend_worker(self,backend):
        backend_link = backend.link

        del self._worker_linkmap[backend_link]
        self._backend_workerlist.remove(backend)

        for link in self._client_backendmap[backend_link]:
            del self._client_linkmap[link]
            self._client_backendmap[backend_link].remove(linkid)

            Proxy.instance.unlink_conn(link)

        del self._client_backendmap[backend_link]

    def dispatch_client(self):
        size = len(self._backend_workerlist)
        if size == 0:
            return None

        link = self._create_link('client')
        idendesc = TOJAuth.instance.create_iden(link,2,TOJAuth.ROLETYPE_GUEST)
        backend = self._backend_workerlist[random.randrange(size)]
        ws_ip,ws_port = backend.ws_addr

        return (link,idendesc,backend.link,ws_ip,ws_port)

    def _create_link(self,linkclass):
        linkid = uuid.uuid1()
        while linkid in self._linkid_usemap:
            linkid = uuid.uuid1()
        
        linkid = str(linkid)
        self._linkid_usemap[linkid] = True

        return ''.join(['/',linkclass,'/',str(len(self._linkid_usemap)),'/'])

    @imc.async.caller
    def _lookup_link(self,link):
        try:
            #a = int(TOJAuth.get_current_iden()['linkid'])
            #b = int(linkid)

            #if b > a:
            #    worker = self._worker_linkidmap[str(a + 1)]

            #else:
            #    worker = self._worker_linkidmap[str(a - 1)]

            if TOJAuth.get_current_iden()['link'].split('/')[1] != 'client':
                linkclass,linkid = link.split('/')[1:3]

                if linkclass == 'client':
                    backend_link = self._client_linkmap[link]['backend_link']
                    worker = self._worker_linkmap[backend_link]
                    
                    sock_ip,sock_port = worker.sock_addr
                    return {
                        'worker_link':worker.link,
                        'sock_ip':sock_ip,
                        'sock_port':sock_port
                    }

                else:
                    worker = self._worker_linkmap[link]
                    
                    sock_ip,sock_port = worker.sock_addr
                    return {
                        'worker_link':worker.link,
                        'sock_ip':sock_ip,
                        'sock_port':sock_port
                    }

                return None

        except KeyError:
            return None

    @imc.async.caller
    @TOJAuth.check_access(1,TOJAuth.ACCESS_EXECUTE)
    def _create_iden(self,link,idenid,roletype,payload):
        linkclass = link.split('/')[1]
        if linkclass == 'client' and roletype == TOJAuth.ROLETYPE_USER:
            uid = payload['uid']
            client = self._client_linkmap[link]
            client['uid'] = uid
            
            if uid not in self._uid_clientmap:
                self._uid_clientmap[uid] = {link:client} 

            else:
                self._uid_clientmap[uid][link] = client 

        return TOJAuth.instance.create_iden(link,idenid,roletype,payload)
        
    @imc.async.caller
    @TOJAuth.check_access(1,TOJAuth.ACCESS_EXECUTE)
    def _add_client(self,client_link,backend_link):
        self._client_linkmap[client_link] = {
            'client_link':client_link,
            'backend_link':backend_link,
            'uid':None
        }
        self._client_backendmap[backend_link].add(client_link)
        
        conn = Proxy.instance.get_conn(backend_link)
        Proxy.instance.link_conn(client_link,conn)

        print(client_link);

    @imc.async.caller
    @TOJAuth.check_access(1,TOJAuth.ACCESS_EXECUTE)
    def _del_client(self,client_link,backend_link):
        uid = self._client_linkmap[client_link]['uid']

        if uid != None:
            clients = self._uid_clientmap[uid]
            del clients[client_link]

            if len(clients) == 0:
                del self._uid_clientmap[uid]
        
        del self._client_linkmap[client_link]
        self._client_backendmap[backend_link].remove(client_link)

        Proxy.instance.unlink_conn(client_link)

    @imc.async.caller
    def _get_uid_clientlink(self,uid):
        if uid in self._uid_clientmap:
            clients = self._uid_clientmap[uid]

            return list(clients.keys())

        return []

    @imc.async.caller
    def _test_get_client_list(self,talk,talk2):
        return list(self._client_linkmap.items())



    
class WebConnHandler(tornado.web.RequestHandler):
    def set_default_headers(self):
        self.set_header('Access-Control-Allow-Origin','*')

    def post(self):
        global center_serv

        data = center_serv.dispatch_client()
        if data == None:
            self.write('Eno_backend')

        else:
            client_link,client_idendesc,backend_link,ip,port = data
            self.write(json.dumps({
                'client_link':client_link,
                'client_idendesc':client_idendesc,
                'backend_link':backend_link,
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
