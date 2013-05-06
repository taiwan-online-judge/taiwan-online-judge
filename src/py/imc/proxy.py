import json

import tornado.ioloop
import tornado.stack_context

import nonblock

class Connection:
    def __init__(self,linkid):
        self.linkid = linkid
        self._close_callback = []

    def send_msg(self,data):
        pass

    def start_recvloop(self,recvloop_callback):
        pass

    def add_close_callback(self,callback):
        self._close_callback.append(tornado.stack_context.wrap(callback))

    def close(self):
        for callback in self._close_callback:
            callback(self)

class Proxy:
    def __init__(self,linkid):
        self._linkid = linkid

        self._conn_linkidmap = {}
        self._conn_waitretmap = {}
        self._call_pathmap = {}

        self.MSGTYPE_CALL = 'call'
        self.MSGTYPE_RET = 'ret'

        self._check_waitret_timer = tornado.ioloop.PeriodicCallback(self._check_waitret,1000)
        self._check_waitret_timer.start()

        Proxy.instance = self 

    def add_conn(self,conn):
        self._conn_linkidmap[conn.linkid] = conn
        self._conn_waitretmap[conn.linkid] = {}

        conn.add_close_callback(self._conn_close_cb)
        conn.start_recvloop(self._recvloop_dispatch)

    def del_conn(self,conn):
        del self._conn_linkidmap[conn.linkid]
        del self._conn_waitretmap[conn.linkid]

    def get_conn(self,linkid):
        if linkid not in self._conn_linkidmap:
            return None

        return self._conn_linkidmap[linkid]

    def call(self,genid,iden,dst,func_name,param):
        def _fail_cb(genid):
            print('Opps')

        self._route_call(genid,_fail_cb,iden,dst,func_name,param)

    def register_call(self,path,func_name,func):
        self._call_pathmap[''.join([path,'/',func_name])] = func

    def _route_call(self,genid,fail_callback,iden,dst,func_name,param):
        dst_part = dst.split('/')[1:]
        linkid = dst_part[1]
        path = ''.join(dst_part[2:])

        if linkid == self._linkid:
            self._handle_call(genid,fail_callback,iden,path,func_name,param)
        else:
            conn = self.get_conn(linkid)
            if conn == None:
                pass

    def _handle_call(self,genid,fail_callback,iden,path,func_name,param):
        try:
            self._call_pathmap[''.join([path,'/',func_name])](param)
        except KeyError:
            fail_callback(genid)

    def _recvloop_dispatch(self,conn,data):
        msg = json.loads(data.decode('utf-8'))
        msg_type = msg['type']
        if msg_type == self.MSGTYPE_CALL:
            self._recv_msg_call(conn,msg)
        elif msg_type == self.MSGTYPE_RET:
            self._recv_msg_ret(conn,msg)

    def _conn_close_cb(self,conn):
        wait_map = self._conn_waitretmap[conn.linkid]
        wait_genids = wait_map.keys()
        for genid in wait_genids:
            wait_map[genid]['fail_callback'](genid)

        self.del_conn(conn)
        print('connection close')

    def _check_waitret(self):
        wait_maps = self._conn_waitretmap.values()
        for wait_map in wait_maps:
            wait_genids = wait_map.keys()
            wait_del = []
            for genid in wait_genids:
                wait = wait_map[genid]
                wait['timeout'] -= 1000

                if wait['timeout'] <= 0:
                    wait['fail_callback'](genid)
                    wait_del.append(genid)

            for genid in wait_del:
                del wait_map[genid]

    def _send_msg_call(self,conn,timeout,genid,fail_callback,iden,dst,func,param):
        wait = {
            'timeout':timeout,
            'fail_callback':tornado.stack_context.wrap(fail_callback)
        }
        msg = {
            'type':self.MSGTYPE_CALL,
            'genid':genid,
            'iden':iden,
            'dst':dst,
            'func':func,
            'param':param
        }
        self._conn_waitretmap[conn.linkid][genid] = wait
        conn.send_msg(bytes(json.dumps(msg),'utf-8')) 

    def _recv_msg_call(self,conn,msg):
        genid = msg['genid']
        iden = msg['iden']
        dst = msg['dst']
        func = msg['func']
        param = msg['param']

        print(genid)

        self._send_msg_ret(conn,genid,'Hello')
    
    def _send_msg_ret(self,conn,genid,retvalue):
        msg = {
            'type':self.MSGTYPE_RET,
            'genid':genid,
            'retvalue':retvalue
        }
        conn.send_msg(bytes(json.dumps(msg),'utf-8'))

    def _recv_msg_ret(self,conn,msg):
        genid = msg['genid']
        retvalue = msg['retvalue']

        self._conn_waitretmap[conn.linkid].pop(genid)

        print(retvalue)

@nonblock.call
def imc_call(iden,dst,func_name,param,_genid):
    Proxy.instance.call(_genid,iden,dst,func_name,param)

def imc_register_call(path,func_name,func):
    Proxy.instance.register_call(path,func_name,func)
