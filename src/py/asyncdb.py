from collections import deque
import random

import tornado.ioloop
import tornado.stack_context
import psycopg2

import imc.async

class RestrictCursor:
    def __init__(self,db,cur):
        self._db = db
        self._cur = cur
        self._ori_cur = cur
        self._in_transaction = False

        self._init_implement()

    def __iter__(self):
        return self._cur

    def execute(self,sql,param = None):
        self._db.execute(self._cur,sql,param) 

        self.arraysize = self._cur.arraysize
        self.itersize = self._cur.itersize
        self.rowcount = self._cur.rowcount
        self.rownumber = self._cur.rownumber
        self.lastrowid = self._cur.lastrowid
        self.query = self._cur.query
        self.statusmessage = self._cur.statusmessage

    def begin(self):
        if self._in_transaction == True:
            return

        self._cur = self._db.begin_transaction()
        self._init_implement()

        self._db.execute(self._cur,'BEGIN;') 

        self._in_transaction = True

    def commit(self):
        if self._in_transaction == False:
            return

        self._db.execute(self._cur,'COMMIT;') 
        if self._cur.statusmessage == 'COMMIT':
            ret = True

        else:
            ret = False

        self._db.end_transaction(self._cur.connection)
        self._cur = self._ori_cur

        self._in_transaction = False

        return ret

    def rollback(self):
        if self._in_transaction == False:
            return

        self._db.execute(self._cur,'ROLLBACK;') 
        
        self._db.end_transaction(self._cur.connection)
        self._cur = self._ori_cur

        self._in_transaction = False

    def upsert(self,name,cond,value = None):
        cond_keys = []
        cond_vals = []
        items = cond.items()
        for key,val in items:
            cond_keys.append('"' + key + '"')
            cond_vals.append(val)

        value_keys = []
        value_vals = []
        if value != None:
            items = value.items()
            for key,val in items:
                value_keys.append('"' + key + '"')
                value_vals.append(val)

            query_list = ['UPDATE "' + name + '" SET ']
            for key in value_keys:
                query_list.append(key)
                query_list.append('=%s')
                query_list.append(',')

            query_list[-1] = ' WHERE '

            for key in cond_keys:
                query_list.append(key)
                query_list.append('=%s')
                query_list.append(' AND ')

            query_list[-1] = ';'
            update_query = ''.join(query_list)

            update_param = list(value_vals)
            update_param.extend(cond_vals)

        query_list = ['INSERT INTO "' + name + '" (']
        for key in cond_keys:
            query_list.append(key)
            query_list.append(',')
        for key in value_keys:
            query_list.append(key)
            query_list.append(',')

        count = len(cond)
        if value != None:
            count += len(value)

        query_list[-1] = ') VALUES ('
        query_list.extend(['%s,'] * (count - 1))
        query_list.append('%s);')
        insert_query = ''.join(query_list)
        
        insert_param = list(cond_vals)
        insert_param.extend(value_vals)

        while True:
            self.begin()

            if value != None:
                self.execute(update_query,update_param)

            if value == None or self.rowcount == 0:
                try:
                    self.execute(insert_query,insert_param)

                except psycopg2.IntegrityError:
                    self.rollback()
                    if value == None:
                        break
                    
                    else:
                        continue

            if self.commit() == True:
                break

    def _init_implement(self):
        self.fetchone = self._cur.fetchone
        self.fetchmany = self._cur.fetchmany
        self.fetchall = self._cur.fetchall
        self.scroll = self._cur.scroll
        self.cast = self._cur.cast
        self.tzinfo_factory = self._cur.tzinfo_factory

        self.arraysize = 0
        self.itersize = 0
        self.rowcount = 0
        self.rownumber = 0
        self.lastrowid = None
        self.query = ''
        self.statusmessage = ''

class AsyncDB:
    def __init__(self,dbname,user,password):
        self.OPER_CURSOR = 0
        self.OPER_EXECUTE = 1

        self._ioloop = tornado.ioloop.IOLoop.instance()

        self._dbname = dbname
        self._user = user
        self._password = password
        self._conn_fdmap = {}
        self._free_connpool = []
        self._share_connpool = []
        self._pendoper_fdmap = {}
        self._opercallback_fdmap = {}

        for i in range(8):
            conn = self._create_conn()
            self._free_connpool.append(conn)

            self._ioloop.add_handler(conn.fileno(),
                    self._oper_dispatch,
                    tornado.ioloop.IOLoop.ERROR)

            self._ioloop.add_callback(self._oper_dispatch,conn.fileno(),0)

        for i in range(2):
            conn = self._create_conn()
            self._share_connpool.append(conn)

            self._ioloop.add_handler(conn.fileno(),
                    self._oper_dispatch,
                    tornado.ioloop.IOLoop.ERROR)

            self._ioloop.add_callback(self._oper_dispatch,conn.fileno(),0)
        
    def cursor(self):
        return RestrictCursor(self,self._cursor())

    def execute(self,cur,sql,param = None):
        fd = cur.connection.fileno()
            
        self._pendoper_fdmap[fd].append((self.OPER_EXECUTE,(cur,sql,param),imc.async.get_retid()))
        self._ioloop.add_callback(self._oper_dispatch,fd,0)

        imc.async.switch_top()

    def begin_transaction(self):
        if len(self._free_connpool) > 0:
            conn = self._free_connpool.pop()

        else:
            conn = self._create_conn()
            self._ioloop.add_handler(conn.fileno(),
                    self._oper_dispatch,
                    tornado.ioloop.IOLoop.ERROR)

        return self._cursor(conn)

    def end_transaction(self,conn):
        if len(self._free_connpool) < 16:
            self._free_connpool.append(conn)

        else:
            self._close_conn(conn)

    def _cursor(self,conn = None):
        if conn != None:
            fd = conn.fileno()

        else:
            fd = self._share_connpool[random.randrange(len(self._share_connpool))].fileno()

        self._pendoper_fdmap[fd].append((self.OPER_CURSOR,None,imc.async.get_retid()))
        self._ioloop.add_callback(self._oper_dispatch,fd,0)

        cur = imc.async.switch_top()
        return cur

    def _create_conn(self):
        conn = psycopg2.connect(database = self._dbname,
                user = self._user,
                password = self._password,
                async = 1)

        fd = conn.fileno()
        self._conn_fdmap[fd] = conn
        self._pendoper_fdmap[fd] = deque()
        self._opercallback_fdmap[fd] = None

        return conn

    def _close_conn(self,conn):
        fd  = conn.fileno()
        self._conn_fdmap.pop(fd,None)
        self._pendoper_fdmap.pop(fd,None)
        self._opercallback_fdmap.pop(fd,None)

        conn.close()

    def _oper_dispatch(self,fd,evt):
        err = None
        try:
            conn = self._conn_fdmap[fd]
        
        except KeyError:
            self._ioloop.remove_handler(fd)
            return
        
        try:
            stat = conn.poll()
        
        except Exception as e:
            err = e

        if err != None or stat == psycopg2.extensions.POLL_OK:
            self._ioloop.update_handler(fd,
                    tornado.ioloop.IOLoop.ERROR)

        elif stat == psycopg2.extensions.POLL_READ:
            self._ioloop.update_handler(fd,
                    tornado.ioloop.IOLoop.READ | tornado.ioloop.IOLoop.ERROR)

            return

        elif stat == psycopg2.extensions.POLL_WRITE:
            self._ioloop.update_handler(fd,
                    tornado.ioloop.IOLoop.WRITE | tornado.ioloop.IOLoop.ERROR)

            return

        cb = self._opercallback_fdmap[fd]
        if cb != None:
            self._opercallback_fdmap[fd] = None
            cb(err)

        else:
            try:
                oper,data,retid = self._pendoper_fdmap[fd].popleft()

            except IndexError:
                return

            if oper == self.OPER_CURSOR:
                def _ret_cursor(err = None):
                    if err == None:
                        imc.async.ret(retid,conn.cursor())

                    else:
                        imc.async.ret(retid,err = err)

                self._opercallback_fdmap[fd] = _ret_cursor

            elif oper == self.OPER_EXECUTE:
                def _ret_execute(err = None):
                    if err == None:
                        imc.async.ret(retid)
                    
                    else:
                        imc.async.ret(retid,err = err)

                cur,sql,param = data

                cur.execute(sql,param)
                self._opercallback_fdmap[fd] = _ret_execute

        self._ioloop.add_callback(self._oper_dispatch,fd,0)
