from collections import deque

import tornado.ioloop
import psycopg2

import imc.async

class RestrictCursor:
    def __init__(self,db,cur):
        self._db = db
        self._cur = cur

        self.fetchone = self._cur.fetchone
        self.fetchmany = self._cur.fetchmany
        self.fetchall = self._cur.fetchall
        self.scroll = self._cur.scroll
        self.cast = self._cur.cast
        
    def __iter__(self):
        return self._cur

    def execute(self,sql,param = None,_grid = None):
        self._db.execute(self._cur,sql,param) 

        self.arraysize = self._cur.arraysize
        self.itersize = self._cur.itersize
        self.rowcount = self._cur.rowcount
        self.rownumber = self._cur.rownumber
        self.lastrowid = self._cur.lastrowid
        self.query = self._cur.query
        self.statusmessage = self._cur.statusmessage
        self.tzinfo_factory = self._cur.tzinfo_factory


class AsyncDB:
    def __init__(self,dbname,user,password):
        self.OPER_CURSOR = 0
        self.OPER_EXECUTE = 1

        self._ioloop = tornado.ioloop.IOLoop.instance()
        self._conn = psycopg2.connect(database = dbname,
                user = user,
                password = password,
                async = 1)
        self._connno = self._conn.fileno()

        self._pend_oper = deque()
        self._oper_callback = None

        self._ioloop.add_handler(self._connno,
                self._oper_dispatch,
                tornado.ioloop.IOLoop.ERROR)

        self._oper_dispatch(self._connno,0)

    @imc.async.callee
    def cursor(self,_grid):
        self._pend_oper.append((self.OPER_CURSOR,None,_grid))
        self._oper_dispatch(self._connno,0)

        cur = imc.async.switchtop()
        return RestrictCursor(self,cur)

    @imc.async.callee
    def execute(self,cur,sql,param = None,_grid = None):
        self._pend_oper.append((self.OPER_EXECUTE,(cur,sql,param),_grid))
        self._oper_dispatch(self._connno,0)

        imc.async.switchtop()

    def _oper_dispatch(self,fd,evt):
        stat = self._conn.poll()
        if stat == psycopg2.extensions.POLL_OK:
            self._ioloop.update_handler(self._connno,
                    tornado.ioloop.IOLoop.ERROR)

        elif stat == psycopg2.extensions.POLL_READ:
            self._ioloop.update_handler(self._connno,
                    tornado.ioloop.IOLoop.READ | tornado.ioloop.IOLoop.ERROR)

            return

        elif stat == psycopg2.extensions.POLL_WRITE:
            self._ioloop.update_handler(self._connno,
                    tornado.ioloop.IOLoop.WRITE | tornado.ioloop.IOLoop.ERROR)

            return

        if self._oper_callback != None:
            cb = self._oper_callback
            self._oper_callback = None
            cb()

        else:
            try:
                oper,data,grid = self._pend_oper.popleft()

            except IndexError:
                return

            if oper == self.OPER_CURSOR:
                def _ret_cursor():
                    imc.async.retcall(grid,self._conn.cursor())

                self._oper_callback = _ret_cursor

            elif oper == self.OPER_EXECUTE:
                def _ret_execute():
                    imc.async.retcall(grid,None)

                cur,sql,param = data

                cur.execute(sql,param)
                self._oper_callback = _ret_execute

        self._ioloop.add_callback(self._oper_dispatch,self._connno,0)
