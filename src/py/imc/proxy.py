import json
import uuid
import os
import datetime

import tornado.ioloop
import tornado.stack_context

from imc import async
from imc import auth

class Connection:
    def __init__(self,linkclass,linkid):
        self.linkclass = linkclass
        self.linkid = linkid
        self.link_linkidmap = {}
        self._close_callback = []
        self._closed = False

    def send_msg(self,data):
        pass

    def start_recv(self,recv_callback):
        pass

    def add_close_callback(self,callback):
        self._close_callback.append(tornado.stack_context.wrap(callback))

    def close(self):
        self._closed = True

        for callback in self._close_callback:
            callback(self)

    def closed(self):
        return self._closed

class FileResult():
    def __init__(self,filekey):
        self.filekey = filekey
        self._gr = None
        self._result = None

    def ret_result(self,res):
        if self._result != None:
            return

        self._result = res
        if self._gr != None:
            self._gr.switch()

    def wait(self):
        if self._result == None:
            self._gr = async.current()
            async.switchtop()

        return self._result

class Proxy:
    def __init__(self,linkclass,linkid,auth_instance,idendesc,conn_linkid_fn = None):
        self.MSGTYPE_CALL = 'call'
        self.MSGTYPE_RET = 'ret'
        self.MSGTYPE_SENDFILE = 'sendfile'
        self.MSGTYPE_ABORTFILE = 'abortfile'

        self._ioloop = tornado.ioloop.IOLoop.instance()
        self._linkclass = linkclass
        self._linkid = linkid
        self._auth = auth_instance
        self._idendesc = idendesc

        if conn_linkid_fn == None:
            self._conn_linkid_fn = lambda : None
        else:
            self._conn_linkid_fn = conn_linkid_fn

        self._conn_linkidmap = {}
        self._conn_retidmap = {self._linkid:{}}
        self._conn_filekeymap = {self._linkid:{}}
        self._call_pathmap = {}

        self._info_filekeymap = {}

        self._check_waitcaller_timer = tornado.ioloop.PeriodicCallback(self._check_waitcaller,1000)
        self._check_waitcaller_timer.start()

        Proxy.instance = self 

        self.register_call('imc/','pend_recvfile',self._pend_recvfile)
        self.register_call('imc/','reject_sendfile',self._reject_sendfile)

    def add_conn(self,conn):
        assert conn.linkid not in self._conn_linkidmap 

        self._conn_linkidmap[conn.linkid] = conn
        self._conn_retidmap[conn.linkid] = {}
        self._conn_filekeymap[conn.linkid] = {}

        conn.add_close_callback(self._conn_close_cb)
        conn.start_recv(self._recv_dispatch)

    def link_conn(self,linkid,conn):
        assert conn.linkid in self._conn_linkidmap 

        conn.link_linkidmap[linkid] = True
        self._conn_linkidmap[linkid] = conn
    
    def unlink_conn(self,linkid):
        assert linkid in self._conn_linkidmap 

        conn = self._conn_linkidmap.pop(linkid)
        del conn.link_linkidmap[linkid]

    def del_conn(self,conn):
        wait_map = self._conn_retidmap[conn.linkid]
        waits = wait_map.items()
        wait_ret = []
        for retid,wait in waits:
            wait_ret.append((wait['caller_linkid'],retid))

        for linkid,retid in wait_ret:
            self._ret_call(linkid,retid,(False,'Eclose'))

        fail_map = self._conn_filekeymap[conn.linkid]
        fails = fail_map.values()
        fail_cb = []
        for callback in fails:
            fail_cb.append(callback)

        for callback in fail_cb:
            callback('Eclose')

        linkids = conn.link_linkidmap.keys()
        link_del = []
        for linkid in linkids:
            link_del.append(linkid)

        for linkid in link_del:
            self.unlink_conn(linkid)

        del self._conn_linkidmap[conn.linkid]
        del self._conn_retidmap[conn.linkid]
        del self._conn_filekeymap[conn.linkid]

    def get_conn(self,linkid):
        try:
            return self._conn_linkidmap[linkid]

        except KeyError:
            return None

    def register_call(self,path,func_name,func):
        self._call_pathmap[''.join([path,func_name])] = func

    def call(self,caller_grid,timeout,idendesc,dst,func_name,param):
        caller_retid = ''.join([self._linkid,'/',caller_grid])
        return self._route_call(None,caller_retid,timeout,idendesc,dst,func_name,param)

    def sendfile(self,dst_link,filepath):
        @async.callee
        def _call(_grid):
            self.call(_grid,
                    10000,
                    self._idendesc,
                    dst_link + 'imc/','pend_recvfile',
                    {'filekey':filekey,'filesize':filesize})

        filekey = str(uuid.uuid1())
        filesize = os.stat(filepath).st_size

        fileresult = FileResult(filekey)

        self._info_filekeymap[filekey] = {
            'filesize':filesize,
            'filepath':filepath,
            'fileresult':fileresult,
            'timer':self._ioloop.add_timeout(datetime.timedelta(days = 1),lambda : self._ret_sendfile('Etimeout'))
        }

        _call()

        return fileresult

    def recvfile(self,filekey,filepath):
        def _fail_cb(err):
            try:
                del self._conn_filekeymap[in_conn.linkid][filekey]

            except KeyError:
                return

            if not in_conn.closed():
                in_conn.abort_file(filekey)
                self._send_msg_abortfile(in_conn,filekey,err)

            self._ret_sendfile(filekey,err)

        try:
            info = self._info_filekeymap[filekey]

        except KeyError:
            return

        src_linkid = info['src_linkid']
        filesize = info['filesize']

        in_conn = self._request_conn(src_linkid)
        self._add_wait_filekey(filekey,filesize,in_conn,None,_fail_cb)

        in_conn.recv_file(filekey,filesize,filepath,lambda : self._ret_sendfile(filekey))
        self._send_msg_sendfile(in_conn,src_linkid,filekey,filesize)

        return info['fileresult']

    def rejectfile(self,filekey):
        @async.callee
        def _call(_grid):
            self.call(_grid,
                    10000,
                    self._idendesc,
                    dst_link + 'imc/','reject_sendfile',
                    {'filekey':filekey})

        try:
            info = self._info_filekeymap.pop(filekey)

        except KeyError:
            return

        dst_link = ''.join(['/',info['src_linkclass'],'/',info['src_linkid'],'/'])
        _call()

    def _route_call(self,in_conn,caller_retid,timeout,idendesc,dst,func_name,param):
        def __add_wait_caller(in_linkid):
            self._conn_retidmap[in_linkid][caller_retid] = {
                'caller_linkid':caller_linkid,
                'timeout':timeout
            }

        def __ret(result):
            if caller_linkid == self._linkid:
                return result

            else:
                conn = self._request_conn(caller_linkid)
                if conn != None:
                    self._send_msg_ret(conn,caller_linkid,caller_retid,result)

        if in_conn != None:
            in_linkclass = in_conn.linkclass
            in_linkid = in_conn.linkid

        else:
            in_linkclass = self._linkclass
            in_linkid = self._linkid

        iden = self._auth.get_iden(in_linkclass,in_linkid,idendesc)
        if iden == None:
            return __ret(False,'Eilliden')

        dst_part = dst.split('/',3)
        dst_linkid = dst_part[2]
        dst_path = dst_part[3]

        caller_linkid = iden['linkid']
        assert caller_retid.split('/',1)[0] == caller_linkid

        if dst_linkid == self._linkid:
            __add_wait_caller(self._linkid)

            try:
                old_iden = self._auth.change_iden(iden)
                result = self._call_pathmap[''.join([dst_path,func_name])](iden,param)
                self._auth.change_iden(old_iden)

            except KeyError:
                result = (False,'Enoexist')

            del self._conn_retidmap[self._linkid][caller_retid]

            return __ret(result)

        else:
            conn = self._request_conn(dst_linkid)
            if conn == None:
                return __ret((False,'Enoexist'))

            else:
                if caller_linkid == self._linkid:
                    __add_wait_caller(conn.linkid)
                    self._send_msg_call(conn,caller_retid,timeout,idendesc,dst,func_name,param)

                    result = async.switchtop()
                    del self._conn_retidmap[conn.linkid][caller_retid]

                    return __ret(result)

                else:
                    self._send_msg_call(conn,caller_retid,timeout,idendesc,dst,func_name,param)

                    return
    
    def _ret_call(self,caller_linkid,caller_retid,result):
        @async.caller
        def __ret_remote():
            conn = self._request_conn(caller_linkid)
            if conn != None:
                self._send_msg_ret(conn,caller_linkid,caller_retid,result)

        if caller_linkid == self._linkid:
            grid = caller_retid.split('/',1)[1]
            async.retcall(grid,result)

        else:
            __ret_remote()

    def _route_sendfile(self,out_conn,src_linkid,filekey,filesize):
        def __send_fail_cb(err):
            try:
                del self._conn_filekeymap[out_conn.linkid][filekey]

            except KeyError:
                return
                    
            if not out_conn.closed():
                out_conn.abort_file(filekey)
                self._send_msg_abortfile(out_conn,filekey,err)

            self._ret_sendfile(filekey,err)

        def __bridge_fail_cb(err):
            try:
                del self._conn_filekeymap[in_conn.linkid][filekey]

                if not in_conn.closed():
                    in_conn.abort_file(filekey)
                    self._send_msg_abortfile(in_conn,filekey,err)

            except KeyError:
                pass

            try:
                del self._conn_filekeymap[out_conn.linkid][filekey]

                if not out_conn.closed():
                    out_conn.abort_file(filekey)
                    self._send_msg_abortfile(out_conn,filekey,err)

            except KeyError:
                pass

        if src_linkid == self._linkid:
            try:
                info = self._info_filekeymap[filekey]
                assert info['filesize'] == filesize

            except KeyError:
                self._ret_sendfile(filekey,'Enoexist')
                return

            except AssertionError:
                self._ret_sendfile(filekey,'Efilesize')
                return

            self._add_wait_filekey(filekey,filesize,None,out_conn,__send_fail_cb)
            out_conn.send_file(filekey,info['filepath'],lambda : self._ret_sendfile(filekey))

        else:
            print('test start')

            in_conn = self._request_conn(src_linkid) 
            self._add_wait_filekey(filekey,filesize,in_conn,out_conn,__bridge_fail_cb)

            send_fn = out_conn.send_filedata(filekey,filesize)
            in_conn.recv_filedata(filekey,filesize,send_fn)

            self._send_msg_sendfile(in_conn,src_linkid,filekey,filesize)

    def _ret_sendfile(self,filekey,err = None):
        try:
            info = self._info_filekeymap.pop(filekey)

        except KeyError:
            return

        self._ioloop.remove_timeout(info['timer'])
                
        fileresult = info['fileresult']
        if err == None:
            self._ioloop.add_callback(lambda : fileresult.ret_result('Success'))

        else:
            self._ioloop.add_callback(lambda : fileresult.ret_result(err))

    def _request_conn(self,linkid):
        try:
            return self._conn_linkidmap[linkid]

        except KeyError:
            conn = self._conn_linkid_fn(linkid)

            if conn != None and conn.linkid != linkid:
                self.link_conn(linkid,conn)

            return conn

    def _recv_dispatch(self,conn,data):
        msg = json.loads(data.decode('utf-8'))
        msg_type = msg['type']

        if msg_type == self.MSGTYPE_CALL:
            self._recv_msg_call(conn,msg)

        elif msg_type == self.MSGTYPE_RET:
            self._recv_msg_ret(conn,msg)

        elif msg_type == self.MSGTYPE_SENDFILE:
            self._recv_msg_sendfile(conn,msg)

        elif msg_type == self.MSGTYPE_ABORTFILE:
            self._recv_msg_abortfile(conn,msg)

    def _conn_close_cb(self,conn):
        self.del_conn(conn)
        print('connection close')

    def _add_wait_filekey(self,filekey,filesize,in_conn,out_conn,fail_callback):
        def __call(err):
            self._ioloop.remove_timeout(timer)
            fail_callback(err)

        callback = tornado.stack_context.wrap(__call)
        timer = self._ioloop.add_timeout(datetime.timedelta(milliseconds = filesize),lambda : callback('Etimeout'))

        if in_conn != None:
            self._conn_filekeymap[in_conn.linkid][filekey] = callback
    
        if out_conn != None:
            self._conn_filekeymap[out_conn.linkid][filekey] = callback

    def _check_waitcaller(self):
        wait_maps = self._conn_retidmap.values()
        for wait_map in wait_maps:
            waits = wait_map.items()
            wait_ret = []
            for retid,wait in waits:
                wait['timeout'] -= 1000

                if wait['timeout'] <= 0:
                    wait_ret.append((wait['caller_linkid'],retid))

            for linkid,retid in wait_ret:
                self._ret_call(linkid,retid,(False,'Etimeout'))

    def _send_msg_call(self,conn,caller_retid,timeout,idendesc,dst,func_name,param):
        msg = {
            'type':self.MSGTYPE_CALL,
            'caller_retid':caller_retid,
            'timeout':timeout,
            'idendesc':idendesc,
            'dst':dst,
            'func_name':func_name,
            'param':param
        }

        conn.send_msg(bytes(json.dumps(msg),'utf-8')) 

    def _recv_msg_call(self,conn,msg):
        @async.caller
        def __call():
            self._route_call(conn,caller_retid,timeout,idendesc,dst,func_name,param)

        caller_retid = msg['caller_retid']
        timeout = msg['timeout']
        idendesc = msg['idendesc']
        dst = msg['dst']
        func_name = msg['func_name']
        param = msg['param']

        __call()

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

        self._ret_call(caller_linkid,caller_retid,result)

    def _send_msg_sendfile(self,conn,src_linkid,filekey,filesize):
        msg = {
            'type':self.MSGTYPE_SENDFILE,
            'src_linkid':src_linkid,
            'filekey':filekey,
            'filesize':filesize
        }

        conn.send_msg(bytes(json.dumps(msg),'utf-8'))

    def _recv_msg_sendfile(self,conn,msg):
        @async.caller
        def __call():
            self._route_sendfile(conn,src_linkid,filekey,filesize)

        src_linkid = msg['src_linkid']
        filekey = msg['filekey']
        filesize = msg['filesize']

        __call()

    def _send_msg_abortfile(self,conn,filekey,err):
        msg = {
            'type':self.MSGTYPE_ABORTFILE,
            'filekey':filekey,
            'error':err
        }

        conn.send_msg(bytes(json.dumps(msg),'utf-8'))

    def _recv_msg_abortfile(self,conn,msg):
        @async.caller
        def __call():
            try:
                self._conn_filekeymap[conn.linkid][filekey](err)

            except:
                pass

        filekey = msg['filekey']
        err = msg['error']

        __call()

    @async.caller
    def _pend_recvfile(self,iden,param):
        filekey = param['filekey']
        filesize = param['filesize']

        self._info_filekeymap[filekey] = {
            'src_linkclass':iden['linkclass'],
            'src_linkid':iden['linkid'],
            'filesize':filesize,
            'fileresult':FileResult(filekey),
            'timer':self._ioloop.add_timeout(datetime.timedelta(days = 1),lambda : self._ret_sendfile('Etimeout'))
        }
    
    @async.caller
    def _reject_sendfile(self,iden,param):
        filekey = param['filekey']
        self._ret_sendfile(filekey,'Ereject')

@async.callee
def imc_call(idendesc,dst,func_name,param,_grid):
    return Proxy.instance.call(_grid,1000000,idendesc,dst,func_name,param)

def imc_call_async(idendesc,dst,func_name,param,callback = None):
    @async.caller
    def func():
        ret = imc_call(idendesc,dst,func_name,param)
        if callback != None:
            callback(ret)

    func()

def imc_register_call(path,func_name,func):
    Proxy.instance.register_call(path,func_name,func)
