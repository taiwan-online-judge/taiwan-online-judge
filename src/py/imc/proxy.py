import json
import uuid
import os
import datetime
import ssl

from Crypto.Hash import SHA512
import tornado.ioloop
import tornado.stack_context

from imc import async
from imc.auth import Auth

class Connection:
    def __init__(self,linkclass,linkid):
        self.linkclass = linkclass
        self.linkid = linkid
        self.link_linkidmap = {}
        self._close_callback = []
        self._closed = False

    def send_msg(self,data):
        pass

    def send_file(self,filekey,filepath,callback):
        pass

    def recv_file(self,filekey,filesize,filepath,callback):
        pass

    def send_filedata(self,filekey,filesize,callback):
        pass

    def recv_filedata(self,filekey,filesize,send_fn):
        pass

    def start_recv(self,recv_callback):
        pass

    def abort_file(self,filekey):
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
        self._retid = None
        self._result = None

    def ret_result(self,res):
        if self._result != None:
            return

        self._result = res
        if self._retid != None:
            async.ret(self._retid)

    def wait(self):
        if self._result == None:
            self._retid = async.get_retid()
            async.switch_top()

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
        waits = list(self._conn_retidmap[conn.linkid].values())
        for wait in waits:
            wait['callback']((False,'Eclose'))

        waits = list(self._conn_filekeymap[conn.linkid].values())
        for wait in waits:
            wait['callback']('Eclose')

        linkids = list(conn.link_linkidmap.keys())
        for linkid in linkids:
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

    def call(self,idendesc,dst,func_name,timeout,*args):
        return self._route_call(None,async.get_retid(),idendesc,dst,func_name,timeout,list(args))

    def call_async(self,idendesc,dst,func_name,timeout,callback,*args):
        @async.caller
        def _call():
            result = self._route_call(None,async.get_retid(),idendesc,dst,func_name,timeout,list(args))
            if callback != None:
                callback(result)

        self._ioloop.add_callback(tornado.stack_context.wrap(_call))

    def sendfile(self,dst_link,filepath):
        filekey = SHA512.new(uuid.uuid1().bytes + ssl.RAND_bytes(64)).hexdigest()
        filesize = os.stat(filepath).st_size

        fileresult = FileResult(filekey)

        self._info_filekeymap[filekey] = {
            'filesize':filesize,
            'filepath':filepath,
            'fileresult':fileresult,
            'timer':self._ioloop.add_timeout(datetime.timedelta(days = 1),lambda : self._ret_sendfile('Etimeout'))
        }

        stat,ret = self.call(self._idendesc,dst_link + 'imc/','pend_recvfile',{'filekey':filekey,'filesize':filesize},655360)
        if stat == False:
            raise ConnectionError(ret)

        return fileresult

    def recvfile(self,filekey,filepath):
        def _callback(err = None):
            try:
                self._del_wait_filekey(in_conn.linkid,filekey)
            
            except KeyError:
                return
            
            if err != None:
                if not in_conn.closed():
                    in_conn.abort_file(filekey)
                    self._send_msg_abortfile(in_conn,filekey,err)

            self._ioloop.add_callback(self._ret_sendfile,filekey,err)
        
        try:
            info = self._info_filekeymap[filekey]

        except KeyError:
            return

        src_linkid = info['src_linkid']
        filesize = info['filesize']

        in_conn = self._request_conn(src_linkid)
        self._add_wait_filekey(in_conn.linkid,filekey,filesize,_callback)

        in_conn.recv_file(filekey,filesize,filepath,_callback)
        self._send_msg_sendfile(in_conn,src_linkid,filekey,filesize)

        return info['fileresult']

    def rejectfile(self,filekey):
        try:
            info = self._info_filekeymap.pop(filekey)

        except KeyError:
            return

        dst_link = ''.join(['/',info['src_linkclass'],'/',info['src_linkid'],'/'])
        self.call(self._idendesc,dst_link + 'imc/','reject_sendfile',{'filekey':filekey},65536)

    def _route_call(self,in_conn,caller_retid,idendesc,dst,func_name,timeout,param):
        def __add_wait_caller(conn_linkid):
            callback = tornado.stack_context.wrap(lambda result : self._ret_call(caller_linkid,caller_retid,result))
            self._conn_retidmap[conn_linkid][caller_retid] = {
                'timer':self._ioloop.add_timeout(datetime.timedelta(milliseconds = timeout),lambda : callback((False,'Etimeout'))),
                'callback':callback
            }

        def __del_wait_caller(conn_linkid):
            wait = self._conn_retidmap[conn_linkid].pop(caller_retid)
            self._ioloop.remove_timeout(wait['timer'])

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

        try:
            dst_part = dst.split('/',3)
            dst_linkid = dst_part[2]
            dst_path = dst_part[3]

        except Exception:
            return __ret(False,'Enoexist')

        caller_linkid = iden['linkid']

        if dst_linkid == self._linkid:
            __add_wait_caller(self._linkid)

            try:
                with Auth.change_current_iden(iden):
                    result = self._call_pathmap[''.join([dst_path,func_name])](*param)

            except KeyError:
                result = (False,'Enoexist')

            __del_wait_caller(self._linkid)

            return __ret(result)

        else:
            conn = self._request_conn(dst_linkid)
            if conn == None:
                return __ret((False,'Enoexist'))

            else:
                if caller_linkid == self._linkid:
                    __add_wait_caller(conn.linkid)
                    self._send_msg_call(conn,caller_retid,idendesc,dst,func_name,timeout,param)

                    result = async.switch_top()

                    __del_wait_caller(conn.linkid)

                    return __ret(result)

                else:
                    self._send_msg_call(conn,caller_retid,idendesc,dst,func_name,timeout,param)

                    return
    
    def _ret_call(self,caller_linkid,caller_retid,result):
        @async.caller
        def __ret_remote():
            conn = self._request_conn(caller_linkid)
            if conn != None:
                self._send_msg_ret(conn,caller_linkid,caller_retid,result)

        if caller_linkid == self._linkid:
            async.ret(caller_retid,result)

        else:
            __ret_remote()

    def _route_sendfile(self,out_conn,src_linkid,filekey,filesize):
        def __send_cb(err = None):
            try:
                self._del_wait_filekey(out_conn.linkid,filekey)

            except KeyError:
                return
                    
            if err != None:
                if not out_conn.closed():
                    out_conn.abort_file(filekey)
                    self._send_msg_abortfile(out_conn,filekey,err)

            self._ioloop.add_callback(self._ret_sendfile,filekey,err)

        def __bridge_cb(err = None):
            try:
                self._del_wait_filekey(in_conn,filekey)
                
                if err != None:
                    if not in_conn.closed():
                        in_conn.abort_file(filekey)
                        self._send_msg_abortfile(in_conn,filekey,err)

            except KeyError:
                pass
            
            try:
                self._del_wait_filekey(out_conn,filekey)
                
                if err != None:
                    if not out_conn.closed():
                        out_conn.abort_file(filekey)
                        self._send_msg_abortfile(out_conn,filekey,err)

            except KeyError:
                pass

        if src_linkid == self._linkid:
            try:
                info = self._info_filekeymap[filekey]
                if info['filesize'] != filesize:
                    self._ioloop.add_callback(self._ret_sendfile,filekey,'Efilesize')

            except KeyError:
                self._ioloop.add_callback(self._ret_sendfile,filekey,'Enoexist')
                return

            self._add_wait_filekey(out_conn.linkid,filekey,filesize,__send_cb)
            out_conn.send_file(filekey,info['filepath'],__send_cb)

        else:
            in_conn = self._request_conn(src_linkid) 
            self._add_wait_filekey(in_conn.linkid,filekey,filesize,__bridge_cb)
            self._add_wait_filekey(out_conn.linkid,filekey,filesize,__bridge_cb)

            send_fn = out_conn.send_filedata(filekey,filesize,__bridge_cb)
            in_conn.recv_filedata(filekey,filesize,send_fn)

            self._send_msg_sendfile(in_conn,src_linkid,filekey,filesize)
    
    def _add_wait_filekey(self,conn_linkid,filekey,filesize,callback):
        callback = tornado.stack_context.wrap(callback)
        self._conn_filekeymap[conn_linkid][filekey] = {
            'timer':self._ioloop.add_timeout(datetime.timedelta(milliseconds = min(filesize,1000)),lambda : callback('Etimeout')),
            'callback':callback
        }
    
    def _del_wait_filekey(self,conn_linkid,filekey):
        wait = self._conn_filekeymap[conn_linkid].pop(filekey)
        self._ioloop.remove_timeout(wait['timer'])

    def _ret_sendfile(self,filekey,err = None):
        try:
            info = self._info_filekeymap.pop(filekey)

        except KeyError:
            return

        self._ioloop.remove_timeout(info['timer'])

        fileresult = info['fileresult']
        if err == None:
            fileresult.ret_result('Success')

        else:
            fileresult.ret_result(err)

    def _request_conn(self,linkid):
        try:
            return self._conn_linkidmap[linkid]

        except KeyError:
            conn = self._conn_linkid_fn(linkid)

            if conn != None and conn.linkid != linkid:
                self.link_conn(linkid,conn)

            return conn

    def _conn_close_cb(self,conn):
        self.del_conn(conn)
        print('connection close')

    def _recv_dispatch(self,conn,data):
        try:
            msg = json.loads(data.decode('utf-8'))
        
        except:
            return
        
        msg_type = msg['type']

        if msg_type == self.MSGTYPE_CALL:
            self._recv_msg_call(conn,msg)

        elif msg_type == self.MSGTYPE_RET:
            self._recv_msg_ret(conn,msg)

        elif msg_type == self.MSGTYPE_SENDFILE:
            self._recv_msg_sendfile(conn,msg)

        elif msg_type == self.MSGTYPE_ABORTFILE:
            self._recv_msg_abortfile(conn,msg)

    def _send_msg_call(self,conn,caller_retid,idendesc,dst,func_name,timeout,param):
        msg = {
            'type':self.MSGTYPE_CALL,
            'caller_retid':caller_retid,
            'idendesc':idendesc,
            'dst':dst,
            'func_name':func_name,
            'timeout':timeout,
            'param':param
        }

        conn.send_msg(bytes(json.dumps(msg),'utf-8')) 

    def _recv_msg_call(self,conn,msg):
        @async.caller
        def __call():
            self._route_call(conn,caller_retid,idendesc,dst,func_name,timeout,param)

        caller_retid = msg['caller_retid']
        idendesc = msg['idendesc']
        dst = msg['dst']
        func_name = msg['func_name']
        timeout = msg['timeout']
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
                self._conn_filekeymap[conn.linkid][filekey]['callback'](err)

            except KeyError:
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
        self._ioloop.add_callback(self._ret_sendfile,filekey,'Ereject')

def imc_call(idendesc,dst,func_name,*args):
    return Proxy.instance.call(idendesc,dst,func_name,65536,*args)

def imc_call_async(idendesc,dst,func_name,callback,*args):
    Proxy.instance.call_async(idendesc,dst,func_name,65536,callback,*args)

def imc_register_call(path,func_name,func):
    Proxy.instance.register_call(path,func_name,func)
