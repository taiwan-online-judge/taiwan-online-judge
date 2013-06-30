from tojauth import TOJAuth
from asyncdb import AsyncDB
import mod
import com
import imc.async
from imc.proxy import Proxy
import config

class ProblemMg:
    _accessid = 6

    TITLE_LEN_MIN = 1
    TITLE_LEN_MAX = 100

    def __init__(self, mod_idendesc, get_link_fn):
        ProblemMg.db = AsyncDB(config.CORE_DBNAME, config.CORE_DBUSER, 
                               config.CORE_DBPASSWORD)
        ProblemMg._idendesc = mod_idendesc
        self.get_link = get_link_fn
        self._pmod_list = {}

        Proxy.instance.register_call(
            'core/problem/', 'create_problem', self.create_problem)
        Proxy.instance.register_call(
            'core/problem/', 'delete_problem', self.delete_problem)
        Proxy.instance.register_call(
            'core/problem/', 'set_problem', self.imc_set_problem)
        Proxy.instance.register_call(
            'core/problem/', 'list_problem', self.list_problem)
        Proxy.instance.register_call(
            'core/problem/', 'list_pmod', self.list_pmod)

    def unload(self):
        Proxy.instance.unregister_call(
            'core/problem/', 'create_problem')
        Proxy.instance.register_call(
            'core/problem/', 'delete_problem')
        Proxy.instance.unregister_call(
            'core/problem/', 'set_problem')
        Proxy.instance.unregister_call(
            'core/problem/', 'list_problem')
        Proxy.instance.unregister_call(
            'core/problem/', 'list_problem')

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def load_problem(self, proid):
        if proid in self._pmod_list:
            return self._pmod_list[proid]

        proinfo = self.get_problem_info_by_proid(proid)
        pmodname = self.proinfo['pmodname']
        pmod = mod.load_pmod(pmodname)
        self._pmod_list[proid] = pmod(self._idendesc, self.get_link, proid)

        return self._pmod_list[proid]

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def unload_problem(self, proid):
        if proid in self._pmod_list:
            self._pmod_list[proid].unload(True)
            del self._pmod_list[proid]

    @imc.async.caller
    def create_problem(self, title, pmodid):
        if(
            type(title) != str or
            type(pmodid) != int
        ):
            return 'Eparameter'

        if len(title) < self.TITLE_LEN_MIN:
            return 'Etitle_too_short'
        elif len(title) > self.TITLE_LEN_MAX:
            return 'Etitle_too_long'

        if not self.does_pmodid_exist(pmodid):
            return 'Epmodid'

        proid = self._create_problem(title, pmodid)
        return {'proid': proid}

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_CREATE)
    def _create_problem(self, title, pmodid):
        cur = self.db.cursor()
        sqlstr = ('INSERT INTO "PROBLEM" ("title", "pmodid", "accessid") '
                  'VALUES (%s, %s, %s) RETURNING "proid";')
        sqlarr = (title, pmodid, 0)
        cur.execute(sqlstr, sqlarr)

        proid = None
        for data in cur:
            proid = data[0]

        if proid == None:
            return None

        user_idenid = TOJAuth.get_current_iden()['idenid']
        with TOJAuth.change_current_iden(self._idendesc):
            accessid = TOJAuth.instance.create_access(user_idenid)

        sqlstr = ('UPDATE "PROBLEM" SET "accessid" = %s WHERE "proid" = %s;')
        sqlarr = (accessid, proid)
        cur.execute(sqlstr, sqlarr)

        TOJAuth.instance.set_access_list(
            accessid, TOJAuth.ROLEID_PROBLEM_ADMIN_GROUP, 
            TOJAuth.ACCESS_ALL
        )

        # pmodname = self.get_pmodname_by_pmodid(pmodid)
        # pmod = mod.load_pmod(pmodname)
        
        # pmod.create_problem_data(proid)

        return proid

    @imc.async.caller
    def delete_problem(self, proid):
        if(
            type(proid) != int
        ):
            return 'Eparameter'

        if not self.does_proid_exist(proid):
            return 'Eproid'

        self._delete_problem(proid)

        return 'Success'

    def _delete_problem(self, proid):
        accessid = self.get_accessid_by_proid(proid)
        TOJAuth.check_access_func(accessid, TOJAuth.ACCESS_DELETE)

        # proinfo = self.get_problem_info_by_proid(proid)
        # pmodname = proinfo['pmodname']
        # pmod = mod.load_pmod(pmodname)

        with TOJAuth.change_current_iden(self._idendesc):
            self.unload_problem(proid)

        # pmod.delete_problem_data(proid)
        
        TOJAuth.instance.del_access(accessid)
        
        cur = self.db.cursor()
        sqlstr = ('DELETE FROM "PROBLEM" WHERE "proid" = %s;')
        sqlarr = (proid, )
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def imc_set_problem(self, proid, title):
        if(
            type(proid) != int or
            type(title) != str
        ):
            return 'Eparameter'

        if len(title) < self.TITLE_LEN_MIN:
            return 'Etitle_too_short'
        elif len(title) > self.TITLE_LEN_MAX:
            return 'Etitle_too_long'

        if not self.does_proid_exist(proid):
            return 'Eproid'

        self.set_problem(proid, title)

        return 'Success'

    def set_problem(self, proid, title):
        accessid = self.get_accessid_by_proid(proid)
        TOJAuth.check_access_func(accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('UPDATE "PROBLEM" SET "title" = %s WHERE "proid" = %s;')
        sqlarr = (title, proid)
        cur.execute(sqlstr, sqlarr)
    
    @imc.async.caller
    def list_problem(self):
        ret = self._list_problem()

        return ret

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _list_problem(self):
        cur = self.db.cursor()
        sqlstr = ('SELECT "proid", "title", "pmodid" FROM "PROBLEM" ORDER BY '
                  '"proid" ASC;')
        cur.execute(sqlstr)

        problem_list = []
        for data in cur:
            obj = {}
            obj['proid'] = data[0]
            obj['title'] = data[1]
            obj['pmodid'] = data[2]

            problem_list.append(obj)

        return problem_list

    @imc.async.caller
    def get_problem_info(self, proid):
        if(
            type(proid) != int
        ):
            return 'Eparameter'

        ret = self.get_problem_info_by_proid(proid)

        if ret == None:
            return 'Eproid'

        return ret        

    @imc.async.caller
    def list_pmod(self):
        cur = self.db.cursor()
        sqlstr = ('SELECT "pmodid", "pmodname", "info" FROM "PMOD" ORDER BY '
                  '"pmodid" ASC;')
        cur.execute(sqlstr)

        pmod_list = []
        for data in cur:
            obj = {}
            obj['pmodid'] = data[0]
            obj['pmodname'] = data[1]
            obj['info'] = data[2]

            pmod_list.append(obj)

        return pmod_list

    def get_accessid_by_proid(self, proid):
        cur = self.db.cursor()
        sqlstr = ('SELECT "accessid" FROM "PROBLEM" WHERE "proid" = %s;')
        sqlarr = (proid, )
        cur.execute(sqlstr, sqlarr)

        accessid = None
        for data in cur:
            accessid = data[0]

        return accessid

    def get_problem_info_by_proid(self, proid):
        cur = self.db.cursor()
        sqlstr = ('SELECT "proid", "title", "pmodid" FROM "PROBLEM" WHERE '
                  '"proid" = %s;')
        sqlarr = (proid, )
        cur.execute(sqlstr, sqlarr)

        ret = None
        for data in cur:
            ret = {}
            ret['proid'] = data[0]
            ret['title'] = data[1]
            ret['pmodid'] = data[2]

            # ret['pmodname'] = self.get_pmodname_by_pmodid(obj['pmodid'])

        return ret

    def does_proid_exist(self, proid):
        pro_info = self.get_problem_info_by_proid(proid)
        
        return pro_info != None

    def get_pmodname_by_pmodid(self, pmodid):
        return 'ABC'

    def does_pmodid_exist(self, pmodid):
        pmodname = self.get_pmodname_by_pmodid(pmodid)

        return pmodname != None

class Problem:
    def unload(self, Force):
        pass

