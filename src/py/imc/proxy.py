import json

import tornado.ioloop
import tornado.stack_context

from imc import nonblock

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
        self._ioloop = tornado.ioloop.IOLoop.instance()
        self._linkid = linkid

        self._conn_linkidmap = {}
        self._caller_genidmap = {self._linkid:{}}
        self._call_pathmap = {}

        self.MSGTYPE_CALL = 'call'
        self.MSGTYPE_RET = 'ret'

        self._check_waitcaller_timer = tornado.ioloop.PeriodicCallback(self._check_waitcaller,1000)
        self._check_waitcaller_timer.start()

        Proxy.instance = self 

    def add_conn(self,conn):
        self._conn_linkidmap[conn.linkid] = conn
        self._caller_genidmap[conn.linkid] = {}

        conn.add_close_callback(self._conn_close_cb)
        conn.start_recvloop(self._recvloop_dispatch)

    def del_conn(self,conn):
        wait_map = self._caller_genidmap[conn.linkid]
        wait_genids = wait_map.keys()
        for genid in wait_genids:
            wait_map[genid]['callback'](genid,'close',None)

        del self._conn_linkidmap[conn.linkid]
        del self._caller_genidmap[conn.linkid]

    def get_conn(self,linkid):
        if linkid not in self._conn_linkidmap:
            return None

        return self._conn_linkidmap[linkid]

    def call(self,genid,timeout,iden,dst,func_name,param):
        def _call_cb(genid,err,retvalue):
            print('Opps')

        try:
            stat,retvalue = self._route_call(genid,iden,dst,func_name,param)
            if stat == True:
                self._ioloop.add_callback(nonblock.retcall,genid,retvalue)
            else:
                self._add_waitcaller(self._linkid,genid,timeout,_call_cb)

        except Exception as err:
            _call_cb(genid,err,None)

    def register_call(self,path,func_name,func):
        self._call_pathmap[''.join([path,'/',func_name])] = func

    def _route_call(self,genid,iden,dst,func_name,param):
        dst_part = dst.split('/')[1:]
        linkid = dst_part[1]
        path = ''.join(dst_part[2:])

        if linkid == self._linkid:
            stat,retvalue = self._handle_call(genid,iden,path,func_name,param)
            if stat == True:
                ret = (True,retvalue)
            else:
                ret = (False,self._linkid)

        else:
            conn = self.get_conn(linkid)
            if conn == None:
                pass

            self._send_msg_call(conn,genid,iden,dst,func_name,param)
            ret = (False,conn.linkid)

        return ret

    def _handle_call(self,genid,iden,path,func_name,param):
        try:
            return self._call_pathmap[''.join([path,'/',func_name])](param)
        except KeyError:
            raise Exception('notexist')

    def _recvloop_dispatch(self,conn,data):
        msg = json.loads(data.decode('utf-8'))
        msg_type = msg['type']
        if msg_type == self.MSGTYPE_CALL:
            self._recv_msg_call(conn,msg)
        elif msg_type == self.MSGTYPE_RET:
            self._recv_msg_ret(conn,msg)

    def _conn_close_cb(self,conn):
        self.del_conn(conn)
        print('connection close')

    def _add_waitcaller(linkid,genid,timeout,callback):
        wait = {
            'timeout':timeout,
            'callback':tornado.stack_context.wrap(callback)
        }
        self._caller_genidmap[linkid][genid] = wait

    def _check_waitcaller(self):
        wait_maps = self._caller_genidmap.values()
        for wait_map in wait_maps:
            wait_genids = wait_map.keys()
            wait_del = []
            for genid in wait_genids:
                wait = wait_map[genid]
                wait['timeout'] -= 1000

                if wait['timeout'] <= 0:
                    wait['callback'](genid,'timeout',None)
                    wait_del.append(genid)

            for genid in wait_del:
                del wait_map[genid]

    def _send_msg_call(self,conn,genid,iden,dst,func_name,param):
        msg = {
            'type':self.MSGTYPE_CALL,
            'genid':genid,
            'iden':iden,
            'dst':dst,
            'func_name':func_name,
            'param':param
        }
        conn.send_msg(bytes(json.dumps(msg),'utf-8')) 

    def _recv_msg_call(self,conn,msg):
        genid = msg['genid']
        iden = msg['iden']
        dst = msg['dst']
        func_name = msg['func_name']
        param = msg['param']

        def _call_cb(genid,err,retvalue):
            print('Opps')

        try:
            stat,retvalue = self._route_call(genid,iden,dst,func_name,param)
            if stat == True:
                self._send_msg_ret(conn,genid,retvalue)

            else:
                pass

        except Exception as err:
            _call_cb(genid,err,None)

        #self._send_msg_ret(conn,genid,'Hello')
    
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

        print(self._caller_genidmap)
        self._caller_genidmap[conn.linkid].pop(genid)

        print(retvalue)

@nonblock.call
def imc_call(iden,dst,func_name,param,_genid):
    Proxy.instance.call(_genid,60000,iden,dst,func_name,param)

def imc_register_call(path,func_name,func):
    Proxy.instance.register_call(path,func_name,func)
