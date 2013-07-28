from tojauth import TOJAuth
from asyncdb import AsyncDB
import mod
import com
import imc.async
from imc.proxy import Proxy
import config

class TestdataMg:
    _accessid = 7
    
    def __init__(self, mod_idendesc, get_link_fn):
        TestdataMg.db = AsyncDB(config.CORE_DBNAME, config.CORE_DBUSER, 
                                config.CORE_DBPASSWORD)
        TestdataMg._idendesc = mod_idendesc
        self.get_link = get_link_fn

        Proxy.instance.register_call(
            'core/testdata/', 'add_testdata', self.add_testdata)
        Proxy.instance.register_call(
            'core/testdata/', 'update_testdata', self.update_testdata)
        Proxy.instance.register_call(
            'core/testdata/', 'get_testdata', self.get_testdata)
        Proxy.instance.register_call(
            'core/testdata/', 'del_testdata', self.del_testdata)

    def unload(self):
        Proxy.instance.unregister_call(
            'core/testdata/', 'add_testdata')
        Proxy.instance.unregister_call(
            'core/testdata/', 'update_testdata')
        Proxy.instance.unregister_call(
            'core/testdata/', 'get_testdata')
        Proxy.instance.unregister_call(
            'core/testdata/', 'del_testdata')

    @imc.async.caller
    def add_testdata(self, blobname, expire, proid, info):
        if expire != None:
            expire = com.isoptime(expire)
            if expire == None:
                return 'Eparameter'

        if(
            type(blobname) != str or
            (proid != None and type(proid) != int) or
            type(info) != str
        ):
            return 'Eparameter'

        testid = self._add_testdata(blobname, expire, proid, info)

        return testid

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _add_testdata(self, blobname, expire, proid, info):
        cur = self.db.cursor()

        sqlstr = ('INSERT INTO "TESTDATA" ("blobname", "expire", "proid", '
                  '"info") VALUES (%s, %s, %s, %s) RETURNING "testid";')
        sqlarr = (blobname, expire, proid, info)
        cur.execute(sqlstr, sqlarr)

        testid = None
        for data in cur:
            testid = data[0]

        return testid

    @imc.async.caller
    def update_testdata(self, testid, blobname, expire, proid, info):
        if expire != None:
            expire = com.isoptime(expire)
            if expire == None:
                return 'Eparameter'

        if(
            type(testid) != int or
            type(blobname) != str or
            (proid != None and type(proid) != int) or
            type(info) != str
        ):
            return 'Eparameter'

        if not self.does_testid_exist(testid):
            return 'Etestid'

        self._update_testdata(testid, blobname, expire, proid, info)

        return 'Success'

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _update_testdata(self, testid, blobname, expire, proid, info):
        cur = self.db.cursor()

        sqlstr = ('UPDATE "TESTDATA" SET "blobname" = %s, "expire" = %s, '
                  '"proid" = %s, "info" = %s WHERE "testid" = %s;')
        sqlarr = (blobname, expire, proid, info, testid)
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def get_testdata(self, testid):
        if(
            type(testid) != int
        ):
            return 'Eparameter'

        testdata = self._get_testdata(self, testid)

        if testdata == None:
            return 'Etestid'
        
        return testdata

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _get_testdata(self, testid):
        cur = self.db.cursor()

        sqlstr = ('SELECT "testid", "blobname", "expire", "proid", "info" '
                  'FROM "TESTDATA" WHERE "testid" = %s;')
        sqlarr = (testid, )
        cur.execute(sqlstr, sqlarr)

        testdata = None
        for data in cur:
            testdata = {}
            testdata['testid'] = data[0]
            testdata['blobname'] = data[1]
            testdata['expire'] = data[2]
            testdata['proid'] = data[3]
            testdata['info'] = data[4]

        return testdata

    @imc.async.caller
    def del_testdata(self, testid):
        if(
            type(testid) != int
        ):
            return 'Eparameter'

        if not self.does_testid_exist(testid):
            return 'Etestid'

        self._del_testdata(testid)

        return 'Success'

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _del_testdata(self, testid):
        cur = self.db.cursor()

        sqlstr = ('DELETE FROM "TESTDATA" WHERE "testid" = %s;')
        sqlarr = (testid, )
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def list_testdata(self, proid = None):
        if(
            (proid != None and type(proid) != int)
        ):
            return 'Eparameter'

        testdata_list = self._list_testdata(self, proid)

        return testdata_list

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _list_testdata(self, proid):
        cur = self.db.cursor()

        sqlstr = ('SELECT "testid", "proid", "info", "expire" FROM '
                  '"TESTDATA"')
        sqlarr = []

        if proid != None:
            sqlstr = sqlstr + ' WHERE "proid" = %s'
            sqlarr.append(proid)

        sqlstr = sqlstr + ' ORDER BY "testid" ASC;'
        cur.execute(sqlstr, sqlarr)

        testdata_list = []
        for data in cur:
            obj = {}
            obj['testid'] = data[0]
            obj['proid'] = data[1]
            obj['info'] = data[2]
            obj['expire'] = data[3]

            testdata_list.append(obj)

        return testdata_list

    def does_testid_exist(self, testid):
        testdata = self._get_testdata(self, testid)

        return testdata != None

