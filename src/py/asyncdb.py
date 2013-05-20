from collections import deque

import tornado.ioloop
import psycopg2

import imc.async

class asyncdb:
    def __init__(self,dbname,user,password):
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
    def execute(self,sql,param = None,_grid = None):
        self._pend_oper.append((self.OPER_EXECUTE,(sql,param),_grid))
        self._oper_dispatch(self._connno,0)

        return imc.async.switchtop()

    def _oper_dispatch(self,fd,evt):
        while True:
            stat = self._conn.poll()
            if stat == psycopg2.extensions.POLL_OK:
                self._ioloop.update_handler(self._connno,
                        tornado.ioloop.IOLoop.ERROR)

            elif stat == psycopg2.extensions.POLL_READ:
                self._ioloop.update_handler(self._connno,
                        tornado.ioloop.IOLoop.READ | tornado.ioloop.IOLoop.ERROR)

                break

            elif stat == psycopg2.extensions.POLL_WRITE:
                self._ioloop.update_handler(self._connno,
                        tornado.ioloop.IOLoop.WRITE | tornado.ioloop.IOLoop.ERROR)

                break

            if self._oper_callback != None:
                self._oper_callback()
                self._oper_callback = None

            try:
                oper,data,grid = self._pend_oper.popleft()

            except IndexError:
                break

            if oper == self.OPER_EXECUTE:
                def _ret_execute():
                    imc.async.retcall(grid,cur)

                sql,param = data

                cur = self._conn.cursor()
                cur.execute(sql,param)
                self._oper_callback = _ret_execute
