import json
import uuid

import tornado.ioloop
import tornado.stack_context

from imc import nonblock

class Connection:
    def __init__(self,linkid):
        self.linkid = linkid
        self.link_linkidmap = {}
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
    def __init__(self,linkid,connect_linkid = None,center_conn = None):
        self._ioloop = tornado.ioloop.IOLoop.instance()
        self._linkid = linkid
        self._connect_linkid = connect_linkid
        self._center_conn = center_conn

        self._conn_linkidmap = {}
        self._caller_retidmap = {self._linkid:{}}
        self._retcall_retidmap = {}
        self._call_pathmap = {}

        self.MSGTYPE_CALL = 'call'
        self.MSGTYPE_RET = 'ret'

        self._check_waitcaller_timer = tornado.ioloop.PeriodicCallback(self._check_waitcaller,1000)
        self._check_waitcaller_timer.start()

        Proxy.instance = self 

    def add_conn(self,conn):
        assert conn.linkid not in self._conn_linkidmap 

        self._conn_linkidmap[conn.linkid] = conn
        self._caller_retidmap[conn.linkid] = {}

        conn.add_close_callback(self._conn_close_cb)
        conn.start_recvloop(self._recvloop_dispatch)

    def link_conn(self,linkid,conn):
        assert conn.linkid in self._conn_linkidmap 

        conn.link_linkidmap[linkid] = True
        self._conn_linkidmap[linkid] = conn
    
    def unlink_conn(self,linkid):
        assert linkid in self._conn_linkidmap 

        conn = self._conn_linkidmap.pop(linkid)
        del conn.link_linkidmap[linkid]

    def del_conn(self,conn):
        wait_map = self._caller_retidmap[conn.linkid]
        wait_retids = wait_map.keys()
        for retid in wait_retids:
            wait_map[retid]['fail_callback'](retid,'Eclose')

        linkids = conn.link_linkidmap.keys()
        link_del = []
        for linkid in linkids:
            link_del.append(linkid)

        for linkid in link_del:
            self.unlink_conn(linkid)

        del self._conn_linkidmap[conn.linkid]
        del self._caller_retidmap[conn.linkid]

    def get_conn(self,linkid):
        try:
            return self._conn_linkidmap[linkid]

        except KeyError:
            return None

    def request_conn(self,linkid,callback,*args):
        def _connect_cb(conn):
            if conn != None and conn.linkid != linkid:
                self.link_conn(linkid,conn)

            callback(conn,*args)

        if linkid in self._conn_linkidmap:
            callback(self._conn_linkidmap[linkid],*args)

        else:
            self._connect_linkid(linkid,_connect_cb)

    def register_call(self,path,func_name,func):
        self._call_pathmap[''.join([path,func_name])] = func

    def call(self,caller_genid,timeout,iden,dst,func_name,param):
        caller_retid = ''.join([self._linkid,'/',caller_genid])
        self._route_call(caller_retid,timeout,iden,dst,func_name,param)

    def _route_call(self,caller_retid,timeout,iden,dst,func_name,param):
        def __add_wait_caller(conn_linkid,caller_retid,timeout,fail_callback):
            self._caller_retidmap[conn_linkid][caller_retid] = {
                'timeout':timeout,
                'fail_callback':tornado.stack_context.wrap(fail_callback)
            }

        def __add_wait_retcall(callee_retid,caller_linkid,caller_retid):
            self._retcall_retidmap[callee_retid] = {
                'caller_linkid':caller_linkid,
                'caller_retid':caller_retid,
            }

        def __local_send_remote(conn,caller_linkid,caller_retid,timeout,iden,dst,func_name,param):
            if conn != None:
                __add_wait_caller(conn.linkid,caller_retid,timeout,__local_fail_cb)
                self._send_msg_call(conn,caller_retid,timeout,iden,dst,func_name,param)
            else:
                __local_fail_cb(caller_retid,'Enoexist')

        def __remote_send_remote(conn,caller_linkid,caller_retid,timeout,iden,dst,func_name,param):
            if conn != None:
                self._send_msg_call(conn,caller_retid,timeout,iden,dst,func_name,param)
            else:
                __remote_fail_cb(caller_retid,'Enoexist')

        def __send_ret(conn,caller_linkid,caller_retid,result):
            if conn != None:
                self._send_msg_ret(conn,caller_linkid,caller_retid,result)
        
        def __local_fail_cb(retid,err):
            self._ret_call(self._linkid,retid,(False,err))

        def __remote_fail_cb(retid,err):
            print('Opps')

        dst_part = dst.split('/',3)
        linkid = dst_part[2]
        path = dst_part[3]

        caller_linkid = iden['linkid']
        assert caller_retid.split('/',1)[0] == caller_linkid

        if linkid == self._linkid:
            try:
                stat,data = self._call_pathmap[''.join([path,func_name])](iden,param)

            except KeyError:
                raise

            if stat == True:
                if caller_linkid == self._linkid:
                    self._ioloop.add_callback(self._ret_call,caller_linkid,caller_retid,(True,data))
                else:
                    self.request_conn(caller_linkid,__send_ret,caller_linkid,caller_retid,(True,data))

            else:
                if caller_linkid == self._linkid:
                    __add_wait_caller(self._linkid,caller_retid,timeout,__local_fail_cb)
                else:
                    __add_wait_caller(self._linkid,caller_retid,timeout,__remote_fail_cb)

                __add_wait_retcall(''.join([self._linkid,'/',data]),caller_linkid,caller_retid) 

        else:
            if caller_linkid == self._linkid:
                self.request_conn(linkid,__local_send_remote,caller_linkid,caller_retid,timeout,iden,dst,func_name,param)

            else:
                self.request_conn(linkid,__remote_send_remote,caller_linkid,caller_retid,timeout,iden,dst,func_name,param)

    def _ret_call(self,caller_linkid,caller_retid,result):
        def __send_ret(conn,caller_linkid,caller_retid,result):
            if conn != None:
                self._send_msg_ret(conn,caller_linkid,caller_retid,result)

        if caller_linkid == self._linkid:
            retid = caller_retid.split('/',1)[1]

            stat,data = nonblock.retcall(retid,result)
            if stat == True:
                try:
                    ret = self._retcall_retidmap.pop(caller_retid)
                    linkid = ret['caller_linkid']
                    retid = ret['caller_retid']

                    del self._caller_retidmap[caller_linkid][retid]
                    self._ret_call(linkid,retid,data)

                except KeyError:
                    pass

        else:
            self.request_conn(caller_linkid,__send_ret,caller_linkid,caller_retid,result)

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
        wait_maps = self._caller_retidmap.values()
        for wait_map in wait_maps:
            wait_retids = wait_map.keys()
            wait_del = []
            for retid in wait_retids:
                wait = wait_map[retid]
                wait['timeout'] -= 1000

                if wait['timeout'] <= 0:
                    wait['fail_callback'](retid,'Etimeout')
                    wait_del.append(retid)

            for retid in wait_del:
                del wait_map[retid]

    def _send_msg_call(self,conn,caller_retid,timeout,iden,dst,func_name,param):
        msg = {
            'type':self.MSGTYPE_CALL,
            'caller_retid':caller_retid,
            'timeout':timeout,
            'iden':iden,
            'dst':dst,
            'func_name':func_name,
            'param':param
        }
        conn.send_msg(bytes(json.dumps(msg),'utf-8')) 

    def _recv_msg_call(self,conn,msg):
        caller_retid = msg['caller_retid']
        timeout = msg['timeout']
        iden = msg['iden']
        dst = msg['dst']
        func_name = msg['func_name']
        param = msg['param']

        self._route_call(caller_retid,timeout,iden,dst,func_name,param)

    def _send_msg_ret(self,conn,caller_linkid,caller_retid,result):
        stat,data = result
        msg = {
            'type':self.MSGTYPE_RET,
            'caller_linkid':caller_linkid,
            'caller_retid':caller_retid,
            'result':{'stat':stat,'data':data}
        }
        conn.send_msg(bytes(json.dumps(msg),'utf-8'))

    def _recv_msg_ret(self,conn,msg):
        caller_linkid = msg['caller_linkid']
        caller_retid = msg['caller_retid']
        data = msg['result']
        result = (data['stat'],data['data'])

        if caller_linkid == self._linkid:
            try:
                del self._caller_retidmap[conn.linkid][caller_retid]
                self._ret_call(caller_linkid,caller_retid,result)

            except KeyError:
                pass

        else:
            self._ret_call(caller_linkid,caller_retid,result)

@nonblock.call
def imc_call(iden,dst,func_name,param,_genid):
    Proxy.instance.call(_genid,5000,iden,dst,func_name,param)

def imc_call_async(iden,dst,func_name,param,callback = None):
    @nonblock.func
    def func():
        result = (yield imc_call(iden,dst,func_name,param))
        if callback != None:
            callback(result)

    func()

def imc_register_call(path,func_name,func):
    Proxy.instance.register_call(path,func_name,func)
