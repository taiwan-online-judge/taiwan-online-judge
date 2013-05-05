import json

import tornado.ioloop
import tornado.stack_context

class IMCConnection:
    def __init__(self):
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

class IMCProxy:
    def __init__(self):
        self._linkid_connmap = {}
        self._conn_linkidmap = {}

        self.MSGTYPE_CALL = 'call'

        self.test_count = 0

    def add_conn(self,linkid,conn):
        self._linkid_connmap[id(conn)] = linkid
        self._conn_linkidmap[linkid] = conn

        conn.add_close_callback(self._conn_close_cb)
        conn.start_recvloop(self._recvloop_dispatch)

    def del_conn(self,conn):
        linkid = self._linkid_connmap.pop(id(conn))
        del self._conn_linkidmap[linkid]

    def get_conn(self,linkid):
        if linkid not in self.conn_linkidmap:
            return None

        return self.conn_linkidmap[linkid]

    def _recvloop_dispatch(self,conn,data):
        msg = json.loads(data.decode('utf-8'))
        msg_type = msg['type']
        if msg_type == self.MSGTYPE_CALL:
            self._recv_msg_call(conn,msg)

    def _conn_close_cb(self,conn):
        self.del_conn(conn)
        print('connection close')

    def _send_msg_call(self,conn,iden,dst,func,param):
        msg = {
            'type':self.MSGTYPE_CALL,
            'iden':iden,
            'dst':dst,
            'func':func,
            'param':param
        }
        conn.send_msg(bytes(json.dumps(msg),'utf-8')) 

    def _recv_msg_call(self,conn,msg):
        iden = msg['iden']
        dst = msg['dst']
        func = msg['func']
        param = msg['param']

        self.test_count += 1
        print(self.test_count)
        self._send_msg_call(conn,None,None,'Hello too',None)
