from tojauth import TOJAuth
from asyncdb import AsyncDB
import mod
import com
import imc.async
from imc.proxy import Proxy
import config
from problem import Problem

class pmod_test(Problem):
    _pmod_name = 'pmod_test'

    def __init__(self, mod_idendesc, get_link_fn, proid):
        self._proid = proid
        self._idendesc = mod_idendesc
        self.get_link = get_link_fn

        self._proinfo = mod.ProblemMg.get_problem_info_by_proid(self._proid)
        self._accessid = mod.ProblemMg.get_accessid_by_proid(self._proid)

        self.db = AsyncDB(config.MOD_DBNAME, config.MOD_DBUSER, 
                          config.MOD_DBPASSWORD)

        self._reg_path = 'pro/' + str(self._proid) + '/'

        Proxy.instance.register_call(
            self._reg_path, 'add_mode', self.add_mode)
        Proxy.instance.register_call(
            self._reg_path, 'del_mode', self.del_mode)
        Proxy.instance.register_call(
            self._reg_path, 'set_mode', self.set_mode)
        Proxy.instance.register_call(
            self._reg_path, 'get_mode', self.get_mode)
        Proxy.instance.register_call(
            self._reg_path, 'list_mode', self.list_mode)
        Proxy.instance.register_call(
            self._reg_path, 'add_testmode', self.add_testmode)
        Proxy.instance.register_call(
            self._reg_path, 'del_testmode', self.del_testmode)
        Proxy.instance.register_call(
            self._reg_path, 'set_testmode', self.set_testmode)
        Proxy.instance.register_call(
            self._reg_path, 'get_testmode', self.get_testmode)
        Proxy.instance.register_call(
            self._reg_path, 'list_testmode', self.list_testmode)
        Proxy.instance.register_call(
            self._reg_path, 'set_testdata', self.set_testdata)
        Proxy.instance.register_call(
            self._reg_path, 'get_testdata', self.get_testdata)

    def unload(self, force):
        Proxy.instance.unregister_call(
            self._reg_path, 'add_mode')
        Proxy.instance.unregister_call(
            self._reg_path, 'del_mode')
        Proxy.instance.unregister_call(
            self._reg_path, 'set_mode')
        Proxy.instance.unregister_call(
            self._reg_path, 'get_mode')
        Proxy.instance.unregister_call(
            self._reg_path, 'list_mode')
        Proxy.instance.unregister_call(
            self._reg_path, 'add_testmode')
        Proxy.instance.unregister_call(
            self._reg_path, 'del_testmode')
        Proxy.instance.unregister_call(
            self._reg_path, 'set_testmode')
        Proxy.instance.unregister_call(
            self._reg_path, 'get_testmode')
        Proxy.instance.unregister_call(
            self._reg_path, 'set_testdata')
        Proxy.instance.unregister_call(
            self._reg_path, 'get_testdata')

    @staticmethod
    @TOJAuth.check_access(mod.ProblemMg._accessid, TOJAuth.ACCESS_CREATE)
    def create_problem_data(proid):
        db = AsyncDB(config.MOD_DBNAME, config.MOD_DBUSER, 
                     config.MOD_DBPASSWORD)

        cur = db.cursor()
        sqlstr = ('INSERT INTO "PMOD_TEST_MODE" ("proid", "modeid", '
                  '"content", "testmodeid") VALUES (%s, %s, %s, %s);')
        sqlarr = (proid, 1, '', None)
        cur.execute(sqlstr, sqlarr)        

    @staticmethod
    @TOJAuth.check_access(mod.ProblemMg._accessid, TOJAuth.ACCESS_DELETE)
    def delete_problem_data(proid):
        db = AsyncDB(config.MOD_DBNAME, config.MOD_DBUSER, 
                     config.MOD_DBPASSWORD)

        cur = db.cursor()
        sqlstr = ('DELETE FROM "PMOD_TEST_MODE" WHERE "proid" = %s;')
        sqlarr = (proid, )
        cur.execute(sqlstr, sqlarr)

        sqlstr = ('DELETE FROM "PMOD_TEST_TESTMODE" WHERE "proid" = %s;')
        sqlarr = (proid, )
        cur.execute(sqlstr, sqlarr)

        sqlstr = ('DELETE FROM "PMOD_TEST_TESTDATA" WHERE "proid" = %s;')
        sqlarr = (proid, )
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def add_mode(self, content, testmodeid):
        if(
            (content != None and type(content) != str) or
            (testmodeid != None and type(testmodeid) != int)
        ):
            return 'Eparameter'

        if testmodeid != None and not self._does_testmodeid_exist(testmodeid):
            return 'Etestmodeid'

        self._add_mode(None, content, testmodeid)

        return 'Success'

    def _add_mode(self, modeid, content, testmodeid):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqltab = ('INSERT INTO "PMOD_TEST_MODE" (')
        sqlcol = ('"proid", "content", "testmodeid"')
        sqlval = (') VALUES (%s, %s, %s')
        sqlend = (');')
        sqlarr = [self._proid, content, testmodeid]

        if modeid != None:
            sqlcol = sqlcol + ', "modeid"'
            sqlval = sqlval + ', %s'
            sqlarr.append(modeid)

        sqlstr = sqltab + sqlcol + sqlval + sqlend
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def del_mode(self, modeid):
        if(
            type(modeid) != int
        ):
            return 'Eparameter'

        if modeid == 1 or not self._does_modeid_exist(modeid):
            return 'Emodeid'

        self._del_mode(modeid)

        return 'Success'

    def _del_mode(self, modeid):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('DELETE FROM "PMOD_TEST_MODE" WHERE "proid" = %s AND '
                  '"modeid" = %s;')
        sqlarr = (self._proid, modeid)
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def set_mode(self, modeid, content, testmodeid):
        if(
            type(modeid) != int or
            (content != None and type(content) != str) or
            (testmodeid != None and type(testmodeid) != int)
        ):
            return 'Eparameter'

        if not self._does_modeid_exist(modeid):
            return 'Emodeid'

        if testmodeid != None and not self._does_testmodeid_exist(testmodeid):
            return 'Etestmodeid'

        self._set_mode(modeid, content, testmodeid)

        return 'Success'

    def _set_mode(self, modeid, content, testmodeid):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('UPDATE "PMOD_TEST_MODE" SET "content" = %s, '
                  '"testmodeid" = %s WHERE "proid" = %s AND "modeid" = %s;')
        sqlarr = (content, testmodeid, self._proid, modeid)
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def get_mode(self, modeid):
        if(
            type(modeid) != int
        ):
            return 'Eparameter'

        mode = self._get_mode_by_modeid(modeid)

        if mode == None:
            return 'Emodeid'

        return mode

    @imc.async.caller
    def list_mode(self):
        mode_list = self._list_mode()

        return mode_list        

    def _list_mode(self):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('SELECT "modeid", "testmodeid" FROM "PMOD_TEST_MODE" '
                  'WHERE "proid" = %s ORDER BY "modeid" ASC;')
        sqlarr = (self._proid, )
        cur.execute(sqlstr, sqlarr)

        mode_list = []
        for data in cur:
            obj = {}
            obj['modeid'] = data[0]
            obj['testmodeid'] = data[1]

            mode_list.append(obj)

        return mode_list
    
    @imc.async.caller
    def add_testmode(self, testmodename, timelimit, memlimit):
        if(
            type(testmodename) != str or
            (timelimit != None and type(timelimit) != int) or
            (memlimit != None and type(memlimit) != int)
        ):
            return 'Eparameter'

        if timelimit != None and timelimit < 0:
            return 'Etimelimit'
        if memlimit != None and memlimit < 0:
            return 'Ememlimit'

        self._add_testmode(testmodename, timelimit, memlimit)

        return 'Success'

    def _add_testmode(self, testmodename, timelimit, memlimit):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('INSERT INTO "PMOD_TEST_TESTMODE" ("proid", "testmodename", '
                  '"timelimit", "memlimit") VALUES (%s, %s, %s, %s);')
        sqlarr = (self._proid, testmodename, timelimit, memlimit)
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def del_testmode(self, testmodeid):
        if(
            type(testmodeid) != int
        ):
            return 'Eparameter'

        if not self._does_testmodeid_exist(testmodeid):
            return 'Etestmodeid'

        self._del_testmode(testmodeid)

        return 'Success'

    def _del_testmode(self, testmodeid):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('DELETE FROM "PMOD_TEST_TESTMODE" WHERE "proid" = %s AND '
                  '"testmodeid" = %s;')
        sqlarr = (self._proid, testmodeid)
        cur.execute(sqlstr, sqlarr)

        sqlstr = ('DELETE FROM "PMOD_TEST_TESTDATA" WHERE "proid" = %s AND '
                  '"testmodeid" = %s;')
        sqlarr = (self._proid, testmodeid)
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def set_testmode(self, testmodeid, testmodename, timelimit, memlimit):
        if(
            type(testmodeid) != int or
            type(testmodename) != str or
            (timelimit != None and type(timelimit) != int) or
            (memlimit != None and type(memlimit) != int)
        ):
            return 'Eparameter'

        if not self._does_testmodeid_exist(testmodeid):
            return 'Etestmodeid'

        if timelimit != None and timelimit < 0:
            return 'Etimelimit'
        if memlimit != None and memlimit < 0:
            return 'Ememlimit'

        self._set_testmode(testmodeid, testmodename, timelimit, memlimit)

        return 'Success'

    def _set_testmode(self, testmodeid, testmodename, timelimit, memlimit):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('UPDATE "PMOD_TEST_TESTMODE" SET "testmodename" = %s, '
                  '"timelimit" = %s, "memlimit" = %s WHERE "proid" = %s AND '
                  '"testmodeid" = %s;')
        sqlarr = (testmodename, timelimit, memlimit, self._proid, testmodeid)
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def get_testmode(self, testmodeid):
        if(
            type(testmodeid) != int
        ):
            return 'Eparameter'

        if not self._does_testmodeid_exist(testmodeid):
            return 'Etestmodeid'

        testmode = self._get_testmode(testmodeid)

        return testmode

    def _get_testmode(self, testmodeid):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('SELECT "testmodeid", "testmodename", "timelimit", '
                  '"memlimit" FROM "PMOD_TEST_TESTMODE" WHERE "proid" = %s AND '
                  '"testmodeid" = %s;')
        sqlarr = (self._proid, testmodeid)
        cur.execute(sqlstr, sqlarr)

        testmode = None
        for data in cur:
            testmode = {}
            testmode['testmodeid'] = data[0]
            testmode['testmodename'] = data[1]
            testmode['timelimit'] = data[2]
            testmode['memlimit'] = data[3]

        return testmode

    @imc.async.caller
    def list_testmode(self):
        testmode_list = self._list_testmode()

        return testmode_list

    def _list_testmode(self):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('SELECT "testmodeid", "testmodename", "timelimit", '
                  '"memlimit" FROM "PMOD_TEST_TESTMODE" WHERE "proid" = %s '
                  'ORDER BY "testmodeid" ASC;')
        sqlarr = (self._proid, )
        cur.execute(sqlstr, sqlarr)

        testmode_list = []
        for data in cur:
            obj = {}
            obj['testmodeid'] = data[0]
            obj['testmodename'] = data[1]
            obj['timelimit'] = data[2]
            obj['memlimit'] = data[3]

            testmode_list.append(obj)

        return testmode_list

    @imc.async.caller
    def set_testdata(self, testmodeid, testdata):
        if(
            type(testmodeid) != int or
            type(testdata) != list
        ):
            return 'Eparameter'

        for test in testdata:
            if type(test) != list:
                return 'Eparameter'
            if(
                'testid' not in test or
                type(test['testid']) != int or
                'timelimit' not in test or
                type(test['timelimit']) != int or
                'memlimit' not in test or
                type(test['memlimit']) != int or
                'subtask' not in test or
                type(test['subtask']) != int
            ):
                return 'Eparameter'

            if test['timelimit'] != None and test['timelimit'] < 0:
                return 'Etimelimit'
            if test['memlimit'] != None and test['memlimit'] < 0:
                return 'Ememlimit'

        if not self._does_testmodeid_exist(testmodeid):
            return 'Etestmodeid'

        self._set_testdata(testmodeid, testdata)

        return 'Success'

    def _set_testdata(self, testmodeid, testdata):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('DELETE FROM "PMOD_TEST_TESTDATA" WHERE "proid" = %s AND '
                  '"testmodeid" = %s;')
        sqlarr = (self._proid, testmodeid)
        cur.execute(sqlstr, sqlarr)

        if len(testdata) == 0:
            return

        sqltab = ('INSERT INTO "PMOD_TEST_TESTDATA" ("proid", "testmodeid", '
                  '"order", "testid", "timelimit", "memlimit", "subtask") '
                  'VALUES')
        sqlval = ()
        sqlend = (';')
        sqlarr = []

        cnt = 0
        for test in testdata:
            if cnt == 0:
                sqlval = sqlval + ' '
            else:
                sqlval = sqlval + ', '

            cnt = cnt + 1
            sqlval = sqlval + '(%s, %s, %s, %s, %s, %s, %s)'
            sqlarr.append(self._proid)
            sqlarr.append(testmodeid)
            sqlarr.append(cnt)
            sqlarr.append(test['testid'])
            sqlarr.append(test['timelimit'])
            sqlarr.append(test['memlimit'])
            sqlarr.append(test['subtask'])

        sqlstr = sqltab + sqlval + sqlend
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def get_testdata(self, testmodeid):
        if(
            type(testmodeid) != int
        ):
            return 'Eparameter'

        if not self._does_testmodeid_exist(testmodeid):
            return 'Etestmodeid'

        testdata = self._get_testdata(testmodeid)

        return testdata

    def _get_testdata(self, testmodeid):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('SELECT "order", "testid", "timelimit", "memlimit", '
                  '"subtask" FROM "PMOD_TEST_TESTDATA" WHERE "proid" = %s AND '
                  '"testmodeid" = %s ORDER BY "order" ASC;')
        sqlarr = (self._proid, testmodeid)
        cur.execute(sqlstr, sqlarr)

        testdata = []
        for data in cur:
            obj = {}
            obj['order'] = data[0]
            obj['testid'] = data[1]
            obj['timelimit'] = data[2]
            obj['memlimit'] = data[3]
            obj['subtask'] = data[4]

            testdata.append(obj)

        return testdata

    def _does_modeid_exist(self, modeid):
        mode = self._get_mode_by_modeid(modeid)

        return mode != None

    def _get_mode_by_modeid(self, modeid):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('SELECT "proid", "modeid", "content", "testmodeid" FROM '
                  '"PMOD_TEST_MODE" WHERE "proid" = %s AND "modeid" = %s;')
        sqlarr = (self._proid, modeid)
        cur.execute(sqlstr, sqlarr)

        mode = None
        for data in cur:
            mode = {}
            mode['proid'] = data[0]
            mode['modeid'] = data[1]
            mode['content'] = data[2]
            mode['testmodeid'] = data[3]

        return mode

    def _does_testmodeid_exist(self, testmodeid):
        testmode_info = self._get_testmode_info(testmodeid)

        return testmode_info != None

    def _get_testmode_info(self, testmodeid):
        TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('SELECT "proid", "testmodeid", "testmodename", "timelimit",'
                  ' "memlimit" FROM "PMOD_TEST_TESTMODE" WHERE "proid" = %s '
                  'AND "testmodeid" = %s;')
        sqlarr = (self._proid, testmodeid)
        cur.execute(sqlstr, sqlarr)

        testmode_info = None
        for data in cur:
            testmode_info = {}
            testmode_info['proid'] = data[0]
            testmode_info['testmodeid'] = data[1]
            testmode_info['testmodename'] = data[2]
            testmode_info['timelimit'] = data[3]
            testmode_info['memlimit'] = data[4]

        return testmode_info
        
