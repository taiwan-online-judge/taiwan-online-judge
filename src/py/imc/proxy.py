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
        self._retcall_genidmap = {}
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
            wait_map[genid]['fail_callback'](genid,'Eclose')

        del self._conn_linkidmap[conn.linkid]
        del self._caller_genidmap[conn.linkid]

    def get_conn(self,linkid):
        if linkid not in self._conn_linkidmap:
            return None

        return self._conn_linkidmap[linkid]

    def register_call(self,path,func_name,func):
        self._call_pathmap[''.join([path,'/',func_name])] = func

    def call(self,caller_genid,timeout,iden,dst,func_name,param):
        self._route_call(caller_genid,timeout,iden,dst,func_name,param)

    def _route_call(self,caller_genid,timeout,iden,dst,func_name,param):
        def __add_wait_caller(callee_linkid,caller_genid,timeout,fail_callback):
            self._caller_genidmap[callee_linkid][caller_genid] = {
                'timeout':timeout,
                'fail_callback':tornado.stack_context.wrap(fail_callback)
            }

        def __add_wait_retcall(callee_genid,caller_linkid,caller_genid):
            self._retcall_genidmap[callee_genid] = {
                'caller_linkid':caller_linkid,
                'caller_genid':caller_genid,
            }

        def __local_fail_cb(genid,err):
            self._ret_call(self._linkid,genid,(False,err))

        def __remote_fail_cb(genid,err):
            print('Opps')

        dst_part = dst.split('/')[1:]
        linkid = dst_part[1]
        path = ''.join(dst_part[2:])

        caller_linkid = iden

        if linkid == self._linkid:
            try:
                stat,data = self._call_pathmap[''.join([path,'/',func_name])](param)

            except KeyError:
                raise

            if stat == True:
                if caller_linkid == self._linkid:
                    self._ioloop.add_callback(self._ret_call,caller_linkid,caller_genid,(True,data))
                else:
                    caller_conn = self.get_conn(caller_linkid)
                    if caller_conn == None:
                        pass

                    self._send_msg_ret(caller_conn,caller_linkid,caller_genid,(True,data))
            else:
                if caller_linkid == self._linkid:
                    __add_wait_caller(linkid,caller_genid,timeout,__local_fail_cb)
                else:
                    __add_wait_caller(linkid,caller_genid,timeout,__remote_fail_cb)

                __add_wait_retcall(data,caller_linkid,caller_genid) 

        else:
            callee_conn = self.get_conn(linkid)
            if callee_conn == None:
                pass

            if caller_linkid == self._linkid:
                __add_wait_caller(callee_conn.linkid,caller_genid,timeout,__local_fail_cb)
                self._send_msg_call(callee_conn,caller_genid,timeout,iden,dst,func_name,param)
            else:
                pass

    def _ret_call(self,caller_linkid,caller_genid,retvalue):
        if caller_linkid == self._linkid:
            stat,data = nonblock.retcall(caller_genid,retvalue)
            if stat == True:
                try:
                    ret = self._retcall_genidmap.pop(caller_genid)
                    linkid = ret['caller_linkid']
                    genid = ret['caller_genid']
                    del self._caller_genidmap[caller_linkid][genid]
                    self._ret_call(linkid,genid,data)

                except KeyError:
                    pass

        else:
            caller_conn = self.get_conn(caller_linkid)
            if caller_conn == None:
                pass

            self._send_msg_ret(caller_conn,caller_linkid,caller_genid,retvalue)

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
    
    def _check_waitcaller(self):
        wait_maps = self._caller_genidmap.values()
        for wait_map in wait_maps:
            wait_genids = wait_map.keys()
            wait_del = []
            for genid in wait_genids:
                wait = wait_map[genid]
                wait['timeout'] -= 1000

                if wait['timeout'] <= 0:
                    wait['fail_callback'](genid,'Etimeout')
                    wait_del.append(genid)

            for genid in wait_del:
                del wait_map[genid]

    def _send_msg_call(self,conn,caller_genid,timeout,iden,dst,func_name,param):
        msg = {
            'type':self.MSGTYPE_CALL,
            'caller_genid':caller_genid,
            'timeout':timeout,
            'iden':iden,
            'dst':dst,
            'func_name':func_name,
            'param':param
        }
        conn.send_msg(bytes(json.dumps(msg),'utf-8')) 

    def _recv_msg_call(self,conn,msg):
        caller_genid = msg['caller_genid']
        timeout = msg['timeout']
        iden = msg['iden']
        dst = msg['dst']
        func_name = msg['func_name']
        param = msg['param']

        self._route_call(caller_genid,timeout,iden,dst,func_name,param)

    def _send_msg_ret(self,conn,caller_linkid,caller_genid,retvalue):
        msg = {
            'type':self.MSGTYPE_RET,
            'caller_linkid':caller_linkid,
            'caller_genid':caller_genid,
            'retvalue':retvalue
        }
        conn.send_msg(bytes(json.dumps(msg),'utf-8'))

    def _recv_msg_ret(self,conn,msg):
        caller_linkid = msg['caller_linkid']
        caller_genid = msg['caller_genid']
        retvalue = msg['retvalue']

        if caller_linkid == self._linkid:
            try:
                del self._caller_genidmap[conn.linkid][caller_genid]
                self._ret_call(caller_linkid,caller_genid,retvalue)

            except KeyError:
                pass
        else:
            pass

@nonblock.call
def imc_call(iden,dst,func_name,param,_genid):
    Proxy.instance.call(_genid,5000,iden,dst,func_name,param)

def imc_register_call(path,func_name,func):
    Proxy.instance.register_call(path,func_name,func)
