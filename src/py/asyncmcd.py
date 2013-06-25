import socket
import struct
import json

import tornado.ioloop
import tornado.stack_context
import tornado.iostream

import imc.async

class AsyncMCD:
    def __init__(self):
        def _conn():
            print('conn')

        self.TYPE_INT = 0
        self.TYPE_BYTES = 1
        self.TYPE_STR = 2
        self.TYPE_JSON = 3

        self._ioloop = tornado.ioloop.IOLoop.instance()
        self._opaque_count = 0
        self._opaque_map = {}

        self._stream = tornado.iostream.IOStream(socket.socket(socket.AF_INET,socket.SOCK_STREAM,0))
        self._stream.connect(('10.8.0.6',11211),_conn)

        self._recv_loop()

    def get(self,key):
        def _recv(opcode,status,opaque,cas,extra,key,value):
            del self._opaque_map[opaque]

            if status != 0:
                imc.async.ret(retid,None)

            else:
                flag, = struct.unpack('!I',extra)
                if flag == self.TYPE_INT:
                    ret, = struct.unpack('!Q',value)

                elif flag == self.TYPE_BYTES:
                    ret = value

                elif flag == self.TYPE_STR:
                    ret = value.decode('utf-8')

                elif flag == self.TYPE_JSON:
                    ret = json.loads(value.decode('utf-8'))

                imc.async.ret(retid,ret)

        if not isinstance(key,str):
            raise TypeError

        key = bytes(key,'utf-8')
        keylen = len(key)
        
        opaque = self._get_opaque(_recv)
        header = self._request_header(0x00,keylen,0,0,keylen,opaque,0)
        data = bytes(bytearray().join([header,key]))
        
        self._stream.write(data)

        retid = imc.async.get_retid()
        return imc.async.switch_top()

    def set(self,key,value,expiration = 0):
        def _recv(opcode,status,opaque,cas,extra,key,value):
            del self._opaque_map[opaque]
            imc.async.ret(retid,status)

        if not isinstance(key,str):
            raise TypeError

        key = bytes(key,'utf-8')
        keylen = len(key)

        if isinstance(value,int):
            value_type = self.TYPE_INT
            value = struct.pack('!Q',value)

        elif isinstance(value,bytes):
            value_type = self.TYPE_BYTES

        elif isinstance(value,str):
            value_type = self.TYPE_STR
            value = bytes(value,'utf-8')

        else:
            value_type = 2
            value = bytes(json.dumps(value),'utf-8')

        valuelen = len(value)

        extra = struct.pack('!II',value_type,expiration)
        extralen = len(extra)

        opaque = self._get_opaque(_recv)
        header = self._request_header(0x01,keylen,extralen,0,extralen + keylen + valuelen,opaque,0)
        data = bytes(bytearray().join([header,extra,key,value]))

        self._stream.write(data)

        retid = imc.async.get_retid()
        return imc.async.switch_top()

    def _get_opaque(self,data):
        self._opaque_count += 1
        self._opaque_map[self._opaque_count] = data

        return self._opaque_count

    def _request_header(self,opcode,keylen,extralen,vid,totallen,opaque,cas):
        return struct.pack('!BBHBBHIIQ',0x80,opcode,keylen,extralen,0x0,vid,totallen,opaque,cas)

    def _recv_loop(self):
        def __recv(data):
            def ___recvdata(data):
                extra = data[0:extralen]
                key = data[extralen:extralen + keylen]
                value = data[extralen + keylen:totallen]

                self._opaque_map[opaque](opcode,status,opaque,cas,extra,key,value)
                self._stream.read_bytes(24,__recv)

            header = struct.unpack('!BBHBBHIIQ',data)
            opcode = header[1]
            keylen = header[2]
            extralen = header[3]
            status = header[5]
            totallen = header[6]
            opaque = header[7]
            cas = header[8]

            if totallen == 0:
                self._opaque_map[opaque](opcode,status,opaque,cas,bytes(),bytes(),bytes())
                self._stream.read_bytes(24,__recv)

            else:
                self._stream.read_bytes(totallen,___recvdata)

        self._stream.read_bytes(24,__recv)
