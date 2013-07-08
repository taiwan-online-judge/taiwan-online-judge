import socket
import struct
import json

import tornado.ioloop
import tornado.stack_context
import tornado.iostream

import imc.async

import time
from asyncdb import AsyncDB

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

    def get(self,ori_key):
        def _recv(opcode,status,opaque,cas,extra,key,value):
            del self._opaque_map[opaque]

            if status != 0:
                imc.async.ret(retid,None)

            else:
                flag, = struct.unpack('!I',extra)
                if flag == self.TYPE_INT:
                    ret = int(value)

                elif flag == self.TYPE_BYTES:
                    ret = value

                elif flag == self.TYPE_STR:
                    ret = value.decode('utf-8')

                elif flag == self.TYPE_JSON:
                    ret = json.loads(value.decode('utf-8'))

                imc.async.ret(retid,ret)

        if not isinstance(ori_key,str):
            raise TypeError

        key = bytes(ori_key,'utf-8')
        keylen = len(key)
        
        opaque = self._get_opaque(_recv)
        header = self._request_header(0x00,keylen,0,0,keylen,opaque,0)
        data = bytes(bytearray().join([header,key]))
        
        self._stream.write(data)

        retid = imc.async.get_retid()
        return imc.async.switch_top()

    def mget(self,keys):
        def _recv(opcode,status,opaque,cas,extra,key,value):
            del self._opaque_map[opaque]

            if status == 0:
                flag, = struct.unpack('!I',extra)
                if flag == self.TYPE_INT:
                    ret = int(value)

                elif flag == self.TYPE_BYTES:
                    ret = value

                elif flag == self.TYPE_STR:
                    ret = value.decode('utf-8')

                elif flag == self.TYPE_JSON:
                    ret = json.loads(value.decode('utf-8'))

                rets[key_opaqmap[opaque]] = value

        for key in keys:
            if not isinstance(key,str):
                raise TypeError

        rets = {}
        key_opaqmap = {}
        qkeys = keys[:-1]

        for ori_key in qkeys:
            key = bytes(ori_key,'utf-8')
            keylen = len(key)
            
            opaque = self._get_opaque(_recv)
            key_opaqmap[opaque] = ori_key
            header = self._request_header(0x09,keylen,0,0,keylen,opaque,0)
            data = bytes(bytearray().join([header,key]))
            
            self._stream.write(data)

        ret = self.get(keys[-1])
        if ret != None:
            rets[keys[-1]] = ret

        return rets

    def set(self,key,value,expiration = 0):
        return self._store(0x01,key,value,expiration)

    def add(self,key,value,expiration = 0):
        return self._store(0x02,key,value,expiration)
    
    def replace(self,key,value,expiration = 0):
        return self._store(0x03,key,value,expiration)

    def _store(self,opcode,ori_key,value,expiration):
        def _recv(opcode,status,opaque,cas,extra,key,value):
            del self._opaque_map[opaque]

            imc.async.ret(retid,status)

        if not isinstance(ori_key,str):
            raise TypeError

        key = bytes(ori_key,'utf-8')
        keylen = len(key)

        if isinstance(value,int):
            value_type = self.TYPE_INT
            value = bytes(str(value),'ascii')

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
        header = self._request_header(opcode,keylen,extralen,0,extralen + keylen + valuelen,opaque,0)
        data = bytes(bytearray().join([header,extra,key,value]))

        self._stream.write(data)

        retid = imc.async.get_retid()
        return imc.async.switch_top()

    def delete(self,ori_key):
        def _recv(opcode,status,opaque,cas,extra,key,value):
            del self._opaque_map[opaque]

            imc.async.ret(retid,status)

        if not isinstance(ori_key,str):
            raise TypeError

        key = bytes(ori_key,'utf-8')
        keylen = len(key)
        
        opaque = self._get_opaque(_recv)
        header = self._request_header(0x04,keylen,0,0,keylen,opaque,0)
        data = bytes(bytearray().join([header,key]))
        
        self._stream.write(data)

        retid = imc.async.get_retid()
        return imc.async.switch_top()

    def inc(self,key,value,initial = None,expiration = 0):
        return self._count(0x05,key,value,initial,expiration) 

    def dec(self,key,value,initial = None,expiration = 0):
        return self._count(0x06,key,value,initial,expiration) 

    def _count(self,opcode,ori_key,value,initial,expiration):
        def _recv(opcode,status,opaque,cas,extra,key,value):
            del self._opaque_map[opaque]

            if status == 1:
                raise KeyError(ori_key)

            imc.async.ret(retid,struct.unpack('!Q',value))

        if not isinstance(ori_key,str):
            raise TypeError

        if not isinstance(value,int):
            raise TypeError

        if initial != None and not isinstance(initial,int):
            raise TypeError

        key = bytes(ori_key,'utf-8')
        keylen = len(key)

        if initial == None:
            extra = struct.pack('!qqI',value,0,0xFFFFFFFF)
        
        else:
            extra = struct.pack('!qqI',value,initial,expiration)
        
        extralen = len(extra)

        opaque = self._get_opaque(_recv)
        header = self._request_header(opcode,keylen,extralen,0,extralen + keylen,opaque,0)
        data = bytes(bytearray().join([header,extra,key]))

        self._stream.write(data)

        retid = imc.async.get_retid()
        return imc.async.switch_top()

    def _dec(self,key,value):
        pass

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


@imc.async.caller
def testmcd():
    data = 23
    
    st = time.perf_counter();

    for i in range(0,256):
        mc.set('bob_' + str(i),data)

    et = time.perf_counter();
    print(et - st)

    st = time.perf_counter();

    #for i in range(0,256):
    #    ret = mc.get('bob_' + str(i))

    print(mc.dec('bob_0',10))

    keys = []
    for i in range(0,256):
        keys.append('bob_' + str(i))

    ret = mc.mget(keys)
    print(len(ret))

    et = time.perf_counter();
    print(et - st)

@imc.async.caller
def testdb():
    data = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    cur = db.cursor()

    st = time.perf_counter();

    for i in range(0,1024):
        cur.execute('INSERT INTO "mcdtest" VALUES(%s,%s)',('bob2_' + str(i),data))

    et = time.perf_counter();
    print(et - st)

    st = time.perf_counter();

    for i in range(0,1024):
        cur.execute('SELECT "value" FROM "mcdtest" WHERE "key"=%s',('bob2_' + str(i),))

    et = time.perf_counter();
    print(et - st)

mc = AsyncMCD()
db = AsyncDB('testdb','pzread','pz3655742')
testmcd()

tornado.ioloop.IOLoop.instance().start()
