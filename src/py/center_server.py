import random
import struct
import json
import uuid

import tornado.ioloop
import tornado.tcpserver
import tornado.httpserver
import tornado.web

import imcproxy

class Worker:
    def __init__(self,stream,linkclass,linkid,worker_ip):
        global center_serv

        self.stream = stream
        self.linkclass = linkclass
        self.linkid = linkid
        self.worker_ip = worker_ip

        stream.set_close_callback(self._sock_close_cb)

        self.send_pack(bytes(json.dumps({
            'linkid':self.linkid,
            'center_linkid':center_serv.linkid
        }),'utf-8'))

        center_serv.add_backend_worker(self)
    
    def send_pack(self,data):
        self.stream.write(struct.pack('L',len(data)) + data)

    def recv_pack(self,callback):
        def _recv_size(data):
            size, = struct.unpack('L',data)
            self.stream.read_bytes(size,_recv_data)

        def _recv_data(data):
            callback(json.loads(data.decode('utf-8')))

        self.stream.read_bytes(8,_recv_size)

    def _sock_close_cb(self):
        pass

class BackendWorker(Worker):
    def __init__(self,stream,linkid,worker_ip,worker_info):
        super().__init__(stream,'backend',linkid,worker_ip)
        self.ws_addr = worker_info['ws_addr']

    def add_client(self):
        return self.ws_addr

    def _sock_close_cb(self):
        center_serv.del_backend_worker(self)
        print('disconnect')

class CenterServer(tornado.tcpserver.TCPServer):
    def __init__(self):
        super().__init__()

        self.linkid_usemap = {}
        self.backend_workerlist = []

        self.linkclass = 'center'
        self.linkid = self._create_linkid()
        self.imc_proxy = imcproxy.IMCProxy()

        print('/center/' + self.linkid)

    def handle_stream(self,stream,address):
        def _recv_worker_info(worker_info):
            linkclass = worker_info['linkclass']
            if linkclass == 'backend':
                linkid = self._create_linkid()
                worker_ip,worker_port = address 
                worker = BackendWorker(stream,linkid,worker_ip,worker_info)
            else:
                return

        self._recv_pack(stream,_recv_worker_info)

    def add_backend_worker(self,worker):
        self.backend_workerlist.append(worker)
        self.imc_proxy.add_sock_conn(worker.stream,worker.linkid)
    
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

    def _send_pack(self,stream,data):
        stream.write(struct.pack('L',len(data)) + data)

    def _recv_pack(self,stream,callback):
        def __recv_size(data):
            size, = struct.unpack('L',data)
            stream.read_bytes(size,__recv_data)

        def __recv_data(data):
            callback(json.loads(data.decode('utf-8')))

        stream.read_bytes(8,__recv_size)

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
    center_serv.listen(2501)

    http_serv = tornado.httpserver.HTTPServer(tornado.web.Application([
        ('/conn',WebConnHandler),
    ]))
    http_serv.listen(83)

    tornado.ioloop.IOLoop.instance().start()
