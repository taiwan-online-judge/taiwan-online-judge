import json

import config
import imc.async
from tojauth import TOJAuth
from asyncdb import AsyncDB

class Data:
    def __init__(self,dataid,datatype,source,target,status,data,gid,gcount):
        self.dataid = dataid
        self.datatype = datatype
        self.source = source
        self.target = target
        self.data = data
        self.gid = gid
        self,gcount = gcount

class DispatchMg:
    _accessid = -1
    
    def __init__(self,mod_idendesc,get_link_fn):
        self.DATATYPE_CHALLENGE = 1
        self.DATATYPE_STATUS = 2

        self.DATASTSTUS_PEND = 1
        self.DATASTSTUS_WAIT = 2
        self.DATASTSTUS_DONE = 3

        self._idendesc = mod_idendesc
        self.get_link = get_link_fn
        self.db = AsyncDB(config.CORE_DBNAME,config.CORE_DBUSER,
                          config.CORE_DBPASSWORD)

        self.collector_namemap = {}

    @imc.async.caller
    @TOJAuth.check_access(_accessid,TOJAuth.ACCESS_WRITE)
    def _add_challenge(self,source,target,data,gid = None,gcount = 1):
        cur = self.db.cursor()

        cur.execute(('INSERT INTO "DATA_POOL" '
                    '("type","source","target","gid","gcount","status","data") '
                    'VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING "dataid";'),
                    (self.DATATYPE_CHALLENGE,source,target,gid,gcount,
                     self.DATASTSTUS_PEND,json.dumps(data,'utf-8')))

        if cur.rowcount == 0:
            return 'Efailed'

        dataid = cur.fetchone()[0]

        data = Data(dataid,self.DATATYPE_CHALLENGE,source,target,
                    self.DATASTATUS_PEND,data,gid,gcount)

        return {'dataid':dataid}

    @imc.async.caller
    def _register_challenge_collector(self,name):
        link = TOJAuth.get_current_iden()
        linkclass = link.split('/')[1]
        if linkclass != 'backend':
            return 'Efailed'

        return self._register_collector(link,''.join(['challenge/',name]))

    @imc.async.caller
    def _register_status_collector(self,name):
        link = TOJAuth.get_current_iden()
        linkclass = link.split('/')[1]
        if linkclass != 'backend':
            return 'Efailed'

        return self._register_collector(link,''.join(['status/',name]))
        
    @imc.async.caller
    def _unregister_challenge_collector(self,name):
        link = TOJAuth.get_current_iden();
        linkclass = link.split('/')[1]
        if linkclass != 'backend':
            return 'Efailed'

        return self._unregister_collector(link,''.join(['challenge/',name]))
        
    @imc.async.caller
    def _unregister_status_collector(self,name):
        link = TOJAuth.get_current_iden();
        linkclass = link.split('/')[1]
        if linkclass != 'backend':
            return 'Efailed'

        return self._unregister_collector(link,''.join(['challenge/',name]))

    def _register_collector(self,link,name):
        if name not in self.collector_namemap:
            self.collector_namemap[name] = {}

        self.collector_namemap[name][link] = {}

        return 'Success'

    def _unregister_collector(self,link,name):
        if name not in self.collector_namemap:
            return 'Success'

        self.collector_namemap[name].pop(link)

        return 'Success'

    def _dispatch_data(self,datatype,target):
        pass
