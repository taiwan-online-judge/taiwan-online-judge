import json
import random

import config
import com
import imc.async
from imc.proxy import Proxy
from tojauth import TOJAuth
from asyncdb import AsyncDB

class Data:
    def __init__(self,dataid,datatype,source,target,status,data,gid,timestamp):
        self.dataid = dataid
        self.datatype = datatype
        self.source = source
        self.target = target
        self.status = status
        self.data = data
        self.gid = gid

    def store(self,db):

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
    def _add_challenge(self,source,target,data,gid = None):
        cur = self.db.cursor()

        if gid == None:
            gid = com.suid()

        cur.execute(('INSERT INTO "DATA_POOL" '
                    '("datatype","source","target","gid","status","data") '
                    'VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING "dataid";'),
                    (self.DATATYPE_CHALLENGE,source,target,gid,
                     self.DATASTSTUS_PEND,json.dumps(data,'utf-8')))

        if cur.rowcount == 0:
            return 'Efailed'

        dataid = int(cur.fetchone()[0])
        self._dispatch_data(self.DATATYPE_CHALLENGE,gid)

        return {'dataid':dataid}
    
    @imc.async.caller
    @TOJAuth.check_access(_accessid,TOJAuth.ACCESS_WRITE)
    def _add_status(self,source,target,data,gid = None):
        cur = self.db.cursor()

        cur.execute(('INSERT INTO "DATA_POOL" '
                    '("datatype","source","target","gid","status","data") '
                    'VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING "dataid";'),
                    (self.DATATYPE_CHALLENGE,source,target,gid,
                     self.DATASTSTUS_PEND,json.dumps(data,'utf-8')))

        if cur.rowcount == 0:
            return 'Efailed'

        dataid = int(cur.fetchone()[0])
        _dispatch_data(datatype,gid)

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

        return self._unregister_collector(link,''.join(['status/',name]))

    def _register_collector(self,datatype,link,name):
        if datatype == self.DATATYPE_CHALLENGE:
            key = 'challenge/' + name

        elif datatype == self.DATATYPE_STATUS:
            key = 'status/' + name

        if key not in self.collector_namemap:
            self.collector_namemap[key] = {}

        self.collector_namemap[key][link] = {}
        
        cur = db.cursor()
        cur.execute('SELECT "dataid","gid" WHERE "target"=%s',
                    (name))

        return 'Success'

    def _unregister_collector(self,datatype,link,name):
        if datatype == self.DATATYPE_CHALLENGE:
            key = 'challenge/' + name

        elif datatype == self.DATATYPE_STATUS:
            key = 'status/' + name

        if key not in self.collector_namemap:
            return 'Success'

        self.collector_namemap[key].pop(link)

        return 'Success'

    def _dispatch_data(self,datatype,gid):
        def __collector_cb(result):
            stat,ret = result

            cur = db.cursor()

            if stat == False or len(ret) != len(datalist):
                cur.execute(('UPDATE "DATA_POOL" SET "status"=%s '
                             'WHERE "dataid" IN %s'),
                            (self.DATASTATUS_WAIT,tuple(datalist)))

                _dispatch_data(datatype,gid)

                return

            waitlist = []
            donelist = []
            for dataid,action in ret:
                if action == self.DATASTATUS_WAIT:
                    waitlist.append(dataid)

                else action == self.DATASTATUS_DONE:
                    donelist.append(dataid)

            if len(waitlist) > 0:
                cur.execute(('UPDATE "DATA_POOL" SET "status"=%s '
                             'WHERE "dataid" IN %s'),
                            (self.DATASTATUS_WAIT,tuple(waitlist)))

                if cur.rowcount == 0:
                    #TODO
                    raise Exception('dispatch update failed')

            if len(donelist) > 0:
                cur.execute(('UPDATE "DATA_POOL" SET "status"=%s '
                             'WHERE "dataid" IN %s'),
                            (self.DATASTATUS_DONE,tuple(donelist)))

                if cur.rowcount == 0:
                    #TODO
                    raise Exception('dispatch update failed')

        cur = db.cursor()

        cur.execute(('SELECT "dataid","source","target","status","data",'
                     '"timestamp" FROM "DATA_POOL" '
                     'WHERE "datatype"=%s AND status!=%s AND "gid"=%s '
                     'ORDER BY "dataid" ASC;'),
                    (datatype,self.DATASTATUS_DONE,gid))

        if cur.rowcount == 0:
            return

        waitflag = False
        datalist = []
        for pair in cur:
            data = {
                'dataid':pair[0],
                'datatype':datatype,
                'soruce':pair[1],
                'target':pair[2],
                'status':pair[3],
                'data':json.loads(pair[4],'utf-8'),
                'timestamp':pair[5]
            }

            if data['status'] == self.DATASTSTUS_WAIT:
                waitflag = True
                break

            datalist.append(data)

        if waitflag == True:
            return

        target = datalist[0]['target']
        last_dataid = datalist[-1]['dataid']
        cur.execute(('UPDATE "DATA_POOL" SET "status"=%s '
                     'WHERE "dataid"<=%s AND '
                     '"datatype"=%s AND status=%s AND "gid"=%s;'),
                    (last_dataid,datatype,self.DATASTATUS_WAIT,gid))

        if cur.rowcount == 0:
            #TODO
            raise Exception('dispatch update failed')
        
        if datatype == self.DATATYPE_CHALLENGE:
            prefix = 'challenge/'
            
        elif datatype == self.DATATYPE_STATUS:
            prefix = 'status/'

        links = list(self.collector_namemap[prefix + target].values())
        worker_link = links[random.randrange(len(links))]

        Proxy.instance.call_async(
            ''.join([worker_link,'dispatch/collector/',prefix],target,10000,
                    __collector_cb,datalist)

