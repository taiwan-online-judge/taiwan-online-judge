import json
import uuid
import os
import datetime
import ssl
from collections import deque

from Crypto.Hash import SHA512
import tornado.ioloop
import tornado.stack_context

from imc import async
from imc.auth import Auth

class Connection:
    def __init__(self,link):
        self.link = link
        self.link_linkmap = {}
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
    def __init__(self,link,auth,idendesc,conn_link_fn = lambda link : None):
        self.MSGTYPE_CALL = 'call'
        self.MSGTYPE_RET = 'ret'
        self.MSGTYPE_SENDFILE = 'sendfile'
        self.MSGTYPE_ABORTFILE = 'abortfile'

        self._ioloop = tornado.ioloop.IOLoop.instance()
        self._link = link
        self._auth = auth
        self._idendesc = idendesc

        self._conn_link_fn = conn_link_fn

        self._conn_linkmap = {}
        self._conn_retidmap = {self._link:{}}
        self._conn_filekeymap = {self._link:{}}
        self._callpath_root = ({},{},[])

        self._info_filekeymap = {}

        Proxy.instance = self 

        self.register_call('imc/','pend_recvfile',self._pend_recvfile)
        self.register_call('imc/','abort_sendfile',self._abort_sendfile)

    def add_conn(self,conn):
        assert conn.link not in self._conn_linkmap 

        self._conn_linkmap[conn.link] = conn
        self._conn_retidmap[conn.link] = {}
        self._conn_filekeymap[conn.link] = {}

        conn.add_close_callback(self._conn_close_cb)
        conn.start_recv(self._recv_dispatch)

    def link_conn(self,link,conn):
        assert conn.link in self._conn_linkmap 

        conn.link_linkmap[link] = True
        self._conn_linkmap[link] = conn
    
    def unlink_conn(self,link):
        assert link in self._conn_linkmap 

        conn = self._conn_linkmap.pop(link)
        del conn.link_linkmap[link]

    def del_conn(self,conn):
        waits = list(self._conn_retidmap[conn.link].values())
        for wait in waits:
            wait['callback']((False,'Eclose'))

        waits = list(self._conn_filekeymap[conn.link].values())
        for wait in waits:
            wait['callback']('Eclose')

        links = list(conn.link_linkmap.keys())
        for link in links:
            self.unlink_conn(link)

        del self._conn_linkmap[conn.link]
        del self._conn_retidmap[conn.link]
        del self._conn_filekeymap[conn.link]

    def get_conn(self,link):
        try:
            return self._conn_linkmap[link]

        except KeyError:
            return None

    def register_call(self,path,func_name,func):
        child,name,filt = self._walk_path(path,True)
        name[func_name] = func

    def register_filter(self,path,func):
        child,name,filt = self._walk_path(path,True)
        filt.append(func)

    def unregister_call(self,path,func_name):
        child,name,filt = self._walk_path(path,True)
        del name[func_name]

    def unregister_filter(self,path,func):
        child,name,filt = self._walk_path(path,True)
        filt.remove(func)

    def call(self,dst,func_name,timeout,*args):
        return self._route_call(None,self._link,async.get_retid(),Auth.get_current_idendesc(),dst,func_name,timeout,list(args))

    def call_async(self,dst,func_name,timeout,callback,*args):
        @async.caller
        def _call():
            result = self._route_call(None,self._link,async.get_retid(),Auth.get_current_idendesc(),dst,func_name,timeout,list(args))

            if callback != None:
                callback(result)

        self._ioloop.add_callback(tornado.stack_context.wrap(_call))

    def sendfile(self,dst_link,filepath):
        def _abort_cb():
            if self._ret_sendfile(filekey,'Eabort'):
                with Auth.change_current_iden(self._idendesc,self._auth):
                    self.call(dst_link + 'imc/','abort_sendfile',65536,filekey)

        filekey = SHA512.new(uuid.uuid1().bytes + ssl.RAND_bytes(64)).hexdigest()
        filesize = os.stat(filepath).st_size

        fileresult = FileResult(filekey)

        self._info_filekeymap[filekey] = {
            'filesize':filesize,
            'filepath':filepath,
            'fileresult':fileresult,
            'timer':self._ioloop.add_timeout(datetime.timedelta(days = 1),lambda : self._ret_sendfile(filekey,'Etimeout')),
            'abort_callback':tornado.stack_context.wrap(_abort_cb)
        }

        with Auth.change_current_iden(self._idendesc,self._auth):
            stat,ret = self.call(dst_link + 'imc/','pend_recvfile',65536,self._link,filekey,filesize)
        
        if stat == False:
            self._ret_sendfile(filekey,'Enoexist')

        return fileresult

    def recvfile(self,filekey,filepath):
        def _callback(err = None):
            try:
                self._del_wait_filekey(in_conn.link,filekey)
            
            except KeyError:
                return
            
            if err != None:
                if not in_conn.closed():
                    in_conn.abort_file(filekey)
                    self._send_msg_abortfile(in_conn,filekey,err)

            self._ioloop.add_callback(self._ret_sendfile,filekey,err)
        
        info = self._info_filekeymap[filekey]

        src_link = info['src_link']
        filesize = info['filesize']

        in_conn = self._request_conn(src_link)

        if filekey in self._info_filekeymap:
            info['abort_callback'] = tornado.stack_context.wrap(lambda : _callback('Eabort'))
            self._add_wait_filekey(in_conn.link,filekey,filesize,_callback)

            in_conn.recv_file(filekey,filesize,filepath,_callback)
            self._send_msg_sendfile(in_conn,src_link,filekey,filesize)

        return info['fileresult']

    def abortfile(self,filekey):
        try:
            self._info_filekeymap[filekey]['abort_callback']()

        except:
            pass

    def _walk_path(self,path,create = False):
        parts = path.split('/')[:-1] 
        child,name,filt = self._callpath_root
        i = 0
        size = len(parts)
        while i < size:
            try:
                child,name,filt = child[parts[i]]
                i += 1

            except KeyError:
                if create == False:
                    raise

                else:
                    while i < size:
                        part = parts[i]
                        node = ({},{},[])
                        child[part] = node
                        child,name,filt = node
                        i += 1

                    break

        return (child,name,filt)
    
    def _json_handler(self,o):
        if isinstance(o,datetime.datetime):
            return o.isoformat();
            
        else:
            return None

    def _route_call(self,in_conn,caller_link,caller_retid,idendesc,dst,func_name,timeout,param):
        def __add_wait_caller(conn_link):
            callback = tornado.stack_context.wrap(lambda result : self._ret_call(caller_link,caller_retid,result))
            self._conn_retidmap[conn_link][caller_retid] = {
                'timer':self._ioloop.add_timeout(datetime.timedelta(milliseconds = timeout),lambda : callback((False,'Etimeout'))),
                'callback':callback
            }

        def __del_wait_caller(conn_link):
            wait = self._conn_retidmap[conn_link].pop(caller_retid)
            self._ioloop.remove_timeout(wait['timer'])

        def __ret(result):
            if caller_link == self._link:
                return result

            else:
                conn = self._request_conn(caller_link)
                if conn != None:
                    self._send_msg_ret(conn,caller_link,caller_retid,result)

        if in_conn != None:
            in_link = in_conn.link

        else:
            in_link = self._link

        iden = self._auth.verify_iden(in_link,idendesc)
        if iden == None:
            return __ret((False,'Eilliden'))

        try:
            dst_part = dst.split('/')
            dst_link = ''.join(['/',dst_part[1],'/',dst_part[2],'/'])
            dst_path = dst_part[3:-1]

        except Exception:
            return __ret((False,'Enoexist'))

        if dst_link == self._link:
            __add_wait_caller(self._link)

            try:
                with Auth.change_current_iden(None,self._auth):
                    dpart = deque(dst_path)
                    child,name,filt = self._callpath_root
                    for func in filt:
                        func(dpart,func_name)

                    for part in dst_path:
                        child,name,filt = child[part]

                        dpart.popleft()
                        for func in filt:
                            func(dpart,func_name)

                    func = name[func_name]

            except KeyError:
                return __ret((False,'Enoexist'))

            if Auth.get_current_idendesc() == idendesc:
                result = func(*param)

            else:
                with Auth.change_current_iden(idendesc,self._auth):
                    result = func(*param)

            __del_wait_caller(self._link)

            return __ret(result)

        else:
            conn = self._request_conn(dst_link)
            if conn == None:
                return __ret((False,'Enoexist'))

            else:
                if caller_link == self._link:
                    __add_wait_caller(conn.link)
                    self._send_msg_call(conn,caller_link,caller_retid,idendesc,dst,func_name,timeout,param)

                    result = async.switch_top()

                    __del_wait_caller(conn.link)

                    return __ret(result)

                else:
                    self._send_msg_call(conn,caller_link,caller_retid,idendesc,dst,func_name,timeout,param)

                    return
    
    def _ret_call(self,caller_link,caller_retid,result):
        @async.caller
        def __ret_remote():
            conn = self._request_conn(caller_link)
            if conn != None:
                self._send_msg_ret(conn,caller_link,caller_retid,result)

        if caller_link == self._link:
            async.ret(caller_retid,result)

        else:
            __ret_remote()

    def _route_sendfile(self,out_conn,src_link,filekey,filesize):
        def __send_cb(err = None):
            try:
                self._del_wait_filekey(out_conn.link,filekey)

            except KeyError:
                return
                    
            if err != None:
                if not out_conn.closed():
                    out_conn.abort_file(filekey)
                    self._send_msg_abortfile(out_conn,filekey,err)

            self._ioloop.add_callback(self._ret_sendfile,filekey,err)

        def __bridge_cb(err = None):
            try:
                self._del_wait_filekey(in_conn.link,filekey)
                
                if err != None:
                    if not in_conn.closed():
                        in_conn.abort_file(filekey)
                        self._send_msg_abortfile(in_conn,filekey,err)

            except KeyError:
                pass
            
            try:
                self._del_wait_filekey(out_conn.link,filekey)
                
                if err != None:
                    if not out_conn.closed():
                        out_conn.abort_file(filekey)
                        self._send_msg_abortfile(out_conn,filekey,err)

            except KeyError:
                pass

        if src_link == self._link:
            try:
                info = self._info_filekeymap[filekey]
                if info['filesize'] != filesize:
                    raise ValueError

            except (KeyError,ValueError):
                self._send_msg_abortfile(out_conn,filekey,'Enoexist')
                self._ioloop.add_callback(self._ret_sendfile,filekey,'Enoexist')
                return

            info['abort_callback'] = tornado.stack_context.wrap(lambda : __send_cb('Eabort'))
            self._add_wait_filekey(out_conn.link,filekey,filesize,__send_cb)
            out_conn.send_file(filekey,info['filepath'],__send_cb)

        else:
            in_conn = self._request_conn(src_link) 
            if in_conn == None:
                self._send_msg_abortfile(out_conn,filekey,'Enoexist')

            else:
                self._add_wait_filekey(in_conn.link,filekey,filesize,__bridge_cb)
                self._add_wait_filekey(out_conn.link,filekey,filesize,__bridge_cb)

                send_fn = out_conn.send_filedata(filekey,filesize,__bridge_cb)
                in_conn.recv_filedata(filekey,filesize,send_fn)

                self._send_msg_sendfile(in_conn,src_link,filekey,filesize)
    
    def _add_wait_filekey(self,conn_link,filekey,filesize,callback):
        callback = tornado.stack_context.wrap(callback)
        self._conn_filekeymap[conn_link][filekey] = {
            'timer':self._ioloop.add_timeout(datetime.timedelta(milliseconds = max(filesize,10000)),lambda : callback('Etimeout')),
            'callback':callback
        }
    
    def _del_wait_filekey(self,conn_link,filekey):
        wait = self._conn_filekeymap[conn_link].pop(filekey)
        self._ioloop.remove_timeout(wait['timer'])

    def _ret_sendfile(self,filekey,err):
        try:
            info = self._info_filekeymap.pop(filekey)

        except KeyError:
            return False

        self._ioloop.remove_timeout(info['timer'])

        if err == None:
            info['fileresult'].ret_result('Success')
        
        else:
            info['fileresult'].ret_result(err)

        return True

    def _request_conn(self,link):
        try:
            return self._conn_linkmap[link]

        except KeyError:
            conn = self._conn_link_fn(link)

            if conn != None and conn.link != link:
                self.link_conn(link,conn)

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

    def _send_msg_call(self,conn,caller_link,caller_retid,idendesc,dst,func_name,timeout,param):
        msg = {
            'type':self.MSGTYPE_CALL,
            'caller_link':caller_link,
            'caller_retid':caller_retid,
            'idendesc':idendesc,
            'dst':dst,
            'func_name':func_name,
            'timeout':timeout,
            'param':param
        }

        conn.send_msg(bytes(json.dumps(msg,default = self._json_handler),'utf-8')) 

    def _recv_msg_call(self,conn,msg):
        @async.caller
        def __call():
            self._route_call(conn,caller_link,caller_retid,idendesc,dst,func_name,timeout,param)

        caller_link = msg['caller_link']
        caller_retid = msg['caller_retid']
        idendesc = msg['idendesc']
        dst = msg['dst']
        func_name = msg['func_name']
        timeout = msg['timeout']
        param = msg['param']

        __call()

    def _send_msg_ret(self,conn,caller_link,caller_retid,result):
        stat,data = result
        msg = {
            'type':self.MSGTYPE_RET,
            'caller_link':caller_link,
            'caller_retid':caller_retid,
            'result':{'stat':stat,'data':data}
        }
        
        conn.send_msg(bytes(json.dumps(msg,default = self._json_handler),'utf-8'))

    def _recv_msg_ret(self,conn,msg):
        caller_link = msg['caller_link']
        caller_retid = msg['caller_retid']
        data = msg['result']
        result = (data['stat'],data['data'])

        self._ret_call(caller_link,caller_retid,result)

    def _send_msg_sendfile(self,conn,src_link,filekey,filesize):
        msg = {
            'type':self.MSGTYPE_SENDFILE,
            'src_link':src_link,
            'filekey':filekey,
            'filesize':filesize
        }

        conn.send_msg(bytes(json.dumps(msg,default = self._json_handler),'utf-8'))

    def _recv_msg_sendfile(self,conn,msg):
        @async.caller
        def __call():
            self._route_sendfile(conn,src_link,filekey,filesize)

        src_link = msg['src_link']
        filekey = msg['filekey']
        filesize = msg['filesize']

        __call()

    def _send_msg_abortfile(self,conn,filekey,err):
        msg = {
            'type':self.MSGTYPE_ABORTFILE,
            'filekey':filekey,
            'error':err
        }

        conn.send_msg(bytes(json.dumps(msg,default = self._json_handler),'utf-8'))

    def _recv_msg_abortfile(self,conn,msg):
        @async.caller
        def __call():
            try:
                self._conn_filekeymap[conn.link][filekey]['callback'](err)

            except KeyError:
                pass

        filekey = msg['filekey']
        err = msg['error']

        __call()

    @async.caller
    def _pend_recvfile(self,src_link,filekey,filesize):
        def __abort_cb():
            if self._ret_sendfile(filekey,'Eabort'):
                with Auth.change_current_iden(self._idendesc,self._auth):
                    self.call(src_link + 'imc/','abort_sendfile',65536,filekey)

        self._info_filekeymap[filekey] = {
            'src_link':src_link,
            'filesize':filesize,
            'fileresult':FileResult(filekey),
            'timer':self._ioloop.add_timeout(datetime.timedelta(days = 1),lambda : self._ret_sendfile(filekey,'Etimeout')),
            'abort_callback':tornado.stack_context.wrap(__abort_cb)
        }
    
    @async.caller
    def _abort_sendfile(self,filekey):
        if filekey in self._info_filekeymap:
            self._ioloop.add_callback(self._ret_sendfile,filekey,'Eabort')
