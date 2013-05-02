#! /usr/bin/env python
import json

class IMCConnection:
    def __init__(self):
        pass

class SocketConnection(IMCConnection):
    def __init__(self,stream):
        super().__init__()

class IMCProxy:
    def __init__(self):
        self.conn_linkidmap = {}

    def add_sock_conn(self,stream,linkid):
        self._add_conn(SocketConnection(stream),linkid)

    def _add_conn(self,conn,linkid):
        self.conn_linkidmap[linkid] = conn
