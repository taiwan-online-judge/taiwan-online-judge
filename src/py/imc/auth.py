import time
import json
import binascii
import contextlib

import tornado.stack_context
from Crypto.PublicKey import RSA
from Crypto.Hash import SHA512
from Crypto.Signature import PKCS1_v1_5

current_idendata = (None,None)

class Auth:
    def __init__(self):
        global current_idendata

        self._cache_hashmap = {}
        current_idendata = (None,None)

        Auth.instance = self

    @staticmethod
    def get_current_iden():
        global current_idendata

        iden,idendesc = current_idendata
        return iden
    
    @staticmethod
    def get_current_idendesc():
        global current_idendata

        iden,idendesc = current_idendata
        return idendesc

    @staticmethod
    def change_current_iden(idendesc = None,auth = None):
        @contextlib.contextmanager
        def context():
            global current_idendata

            auth = None

            if auth == None:
                auth = Auth.instance

            if idendesc == None:
                iden = None

            else:
                iden = auth.get_iden(idendesc)
                if iden == None:
                    raise ValueError('Illegal idendesc')

            old_idendata = current_idendata
            current_idendata = (iden,idendesc)
            
            try:
                yield

            finally:
                current_idendata = old_idendata

        return tornado.stack_context.StackContext(context)

    def set_signkey(self,key):
        self._signer = PKCS1_v1_5.new(RSA.importKey(key))

    def set_verifykey(self,key):
        self._verifier = PKCS1_v1_5.new(RSA.importKey(key))

    def sign_iden(self,iden):
        data = json.dumps(iden)
        sign = binascii.hexlify(self._sign(bytes(data,'utf-8'))).decode('utf-8')

        return json.dumps([data,sign])

    def verify_iden(self,conn_link,idendesc):
        pair = json.loads(idendesc)
        data = pair[0]
        sign = pair[1]

        return self._verify(bytes(data,'utf-8'),binascii.unhexlify(sign))

    def get_iden(self,idendesc):
        pair = json.loads(idendesc)
        data = pair[0]
        sign = pair[1]

        if self._verify(bytes(data,'utf-8'),binascii.unhexlify(sign)):
            return json.loads(data)

        else:
            return None

    def _sign(self,data):
        return self._signer.sign(SHA512.new(data))

    def _verify(self,data,sig):
        h = SHA512.new(data)
        if h in self._cache_hashmap:
            return True

        if self._verifier.verify(h,sig) == True:
            self._cache_hashmap[h] = True

            return True
        else:
            return False
