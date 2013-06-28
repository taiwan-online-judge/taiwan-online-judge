import datetime

from tojauth import TOJAuth
from asyncdb import AsyncDB
import mod
import com
import imc.async
from imc.proxy import Proxy
import config

class SquareMg:
    _accessid = 4

    TITLE_LEN_MIN = 1
    TITLE_LEN_MAX = 100
    INTRO_LEN_MIN = 0
    INTRO_LEN_MAX = 1000
    LOGO_LEN_MIN = 0
    LOGO_LEN_MAX = 200

    SQUARE_CATE_NUM_MAX = 50

    JOIN_REJECT = 1
    JOIN_ACCEPT = 2
    JOIN_PENDING = 3

    STATUS_WAITING = 1
    STATUS_RUNNING = 2
    STATUS_ENDED = 3

    def __init__(self, mod_idendesc, get_link_fn):
        SquareMg.db = AsyncDB(config.CORE_DBNAME, config.CORE_DBUSER, 
                config.CORE_DBPASSWORD)
        SquareMg._idendesc = mod_idendesc
        self.get_link = get_link_fn
        self._sqmod_list = {}

        Proxy.instance.register_call(
            'core/square/', 'list_category', self.list_category)
        Proxy.instance.register_call(
            'core/square/', 'list_square', self.list_square)
        Proxy.instance.register_call(
            'core/square/', 'join_square', self.join_square)
        Proxy.instance.register_call(
            'core/square/', 'quit_square', self.quit_square)
        Proxy.instance.register_call(
            'core/square/', 'create_square', self.create_square)
        Proxy.instance.register_call(
            'core/square/', 'delete_square', self.delete_square)
        Proxy.instance.register_call(
            'core/square/', 'set_square', self.imc_set_square)

    def unload(self):
        Proxy.instance.unregister_call(
            'core/square/', 'list_category')
        Proxy.instance.unregister_call(
            'core/square/', 'list_square')
        Proxy.instance.unregister_call(
            'core/square/', 'join_square')
        Proxy.instance.unregister_call(
            'core/square/', 'quit_square')
        Proxy.instance.unregister_call(
            'core/square/', 'create_square')
        Proxy.instance.unregister_call(
            'core/square/', 'delete_square')
        Proxy.instance.unregister_call(
            'core/square/', 'set_square')

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def load_square(self, sqid):
        if sqid in self._sqmod_list:
            return self._sqmod_list[sqid]

        sqinfo = self.get_square_info_by_sqid(sqid)
        sqmodname = self.get_sqmodname_by_sqmodid(sqinfo['sqmodid'])
        sqmod = mod.load_sqmod(sqmodname)
        self._sqmod_list[sqid] = sqmod(self._idendesc, self.get_link, sqid)

        return self._sqmod_list[sqid]

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def unload_square(self, sqid):
        if sqid in self._sqmod_list:
            self._sqmod_list[sqid].unload(True)
            del self._sqmod_list[sqid]

    @imc.async.caller
    def create_square(self, title, hidden, sqmodid, intro, logo, category = []):
        if(
            type(title) != str or
            type(hidden) != bool or
            type(sqmodid) != int or
            type(category) != list or
            type(intro) != str or
            type(logo) != str
        ):
            return 'Eparameter'

        for cateid in category:
            if(
                type(cateid) != int
            ):
                return 'Eparameter'

        if len(title) < self.TITLE_LEN_MIN:
            return 'Etitle_too_short'
        elif len(title) > self.TITLE_LEN_MAX:
            return 'Etitle_too_long'
        elif len(intro) < self.INTRO_LEN_MIN:
            return 'Eintro_too_short'
        elif len(intro) > self.INTRO_LEN_MAX:
            return 'Eintro_too_long'
        elif len(logo) < self.INTRO_LEN_MIN:
            return 'Elogo_too_short'
        elif len(logo) > self.INTRO_LEN_MAX:
            return 'Elogo_too_long'

        if len(category) > self.SQUARE_CATE_NUM_MAX:
            return 'Etoo_many_category'

        category = list(set(category))

        for cateid in category:
            if not self.does_cateid_exist(cateid):
                return 'Eno_such_cateid'

        if not self.does_sqmodid_exist(sqmodid):
            return 'Eno_such_sqmodid'

        sqid = self._create_square(title, hidden, sqmodid, intro, logo)
        self._set_square_category(sqid, category)
        return {'sqid': sqid}

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_CREATE)
    def _create_square(self, title, hidden, sqmodid, intro, logo):
        cur = self.db.cursor()
        sqlstr = ('INSERT INTO "SQUARE" ("title", "hidden", "sqmodid", '
                  '"intro", "logo", "accessid") VALUES (%s, %s, %s, %s, '
                  '%s, %s) RETURNING "sqid";')
        sqlarr = (title, hidden, sqmodid, intro, logo, 0)
        cur.execute(sqlstr, sqlarr)

        sqid = None
        for data in cur:
            sqid = data[0]

        if sqid == None:
            return None

        user_idenid = TOJAuth.get_current_iden()['idenid']
        with TOJAuth.change_current_iden(self._idendesc):
            accessid = TOJAuth.instance.create_access(user_idenid)

        sqlstr = ('UPDATE "SQUARE" SET "accessid" = %s WHERE "sqid" = %s;')
        sqlarr = (accessid, sqid)
        cur.execute(sqlstr, sqlarr)

        TOJAuth.instance.set_access_list(
            accessid, TOJAuth.ROLEID_SQUARE_ADMIN_GROUP, 
            TOJAuth.ACCESS_ALL
        )

        sqmodname = self.get_sqmodname_by_sqmodid(sqmodid)
        sqmod = mod.load_sqmod(sqmodname)

        sqmod.create_square_data(sqid)

        return sqid;

    @imc.async.caller
    def delete_square(self, sqid):
        if(
            type(sqid) != int
        ):
            return 'Eparameter'

        if not self.does_sqid_exist(sqid):
            return 'Eno_such_sqid'

        self._delete_square(sqid)

        return 'Success'
    
    def _delete_square(self, sqid):
        accessid = self.get_accessid_by_sqid(sqid)
        TOJAuth.check_access_func(accessid, TOJAuth.ACCESS_DELETE)

        sqinfo = self.get_square_info_by_sqid(sqid)
        sqmodname = self.get_sqmodname_by_sqmodid(sqinfo['sqmodid'])
        sqmod = mod.load_sqmod(sqmodname)

        with TOJAuth.change_current_iden(self._idendesc):
            self.unload_square(sqid)

        sqmod.delete_square_data(sqid)

        with TOJAuth.change_current_iden(self._idendesc):
            TOJAuth.instance.del_access(accessid)

        cur = self.db.cursor()
        sqlstr = ('DELETE FROM "SQUARE" WHERE "sqid" = %s;')
        sqlarr = (sqid, )
        cur.execute(sqlstr, sqlarr)

        sqlstr = ('DELETE FROM "SQUARE_USER" WHERE "sqid" = %s;')
        sqlarr = (sqid, )
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def imc_set_square(self, sqid, title, start_time, end_time, hidden, intro, 
                       logo, category):

        if start_time != None:
            start_time = com.isoptime(start_time)
            if start_time == None:
                return 'Eparameter'

        if end_time != None:
            end_time = com.isoptime(end_time)
            if end_time == None:
                return 'Eparameter'

        if(
            type(sqid) != int or
            type(title) != str or
            (start_time != None and type(start_time) != datetime.datetime) or
            (end_time != None and type(end_time) != datetime.datetime) or
            type(hidden) != bool or
            type(intro) != str or
            type(logo) != str or
            type(category) != list
        ):
            return 'Eparameter'

        for cateid in category:
            if(
                type(cateid) != int
            ):
                return 'Eparameter'

        if len(title) < self.TITLE_LEN_MIN:
            return 'Etitle_too_short'
        elif len(title) > self.TITLE_LEN_MAX:
            return 'Etitle_too_long'
        elif len(intro) < self.INTRO_LEN_MIN:
            return 'Eintro_too_short'
        elif len(intro) > self.INTRO_LEN_MAX:
            return 'Eintro_too_long'
        elif len(logo) < self.INTRO_LEN_MIN:
            return 'Elogo_too_short'
        elif len(logo) > self.INTRO_LEN_MAX:
            return 'Elogo_too_long'
        elif len(category) > self.SQUARE_CATE_NUM_MAX:
            return 'Etoo_many_category'

        if not self.does_sqid_exist(sqid):
            return 'Esqid'

        category = list(set(category))

        for cateid in category:
            if not self.does_cateid_exist(cateid):
                return 'Eno_such_cateid'

        self.set_square(sqid, title, start_time, end_time, hidden, intro, logo)
        self._set_square_category(sqid, category)

        return 'Success'

    def set_square(self, sqid, title, start_time, end_time, hidden, intro, 
                    logo):
        accessid = self.get_accessid_by_sqid(sqid)
        TOJAuth.check_access_func(accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('UPDATE "SQUARE" SET "title" = %s, "start_time" = %s, '
                  '"end_time" = %s, "hidden" = %s, "intro" = %s, "logo" = %s '
                  'WHERE "sqid" = %s;')
        sqlarr = (title, start_time, end_time, hidden, intro, logo, sqid)
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def list_square(self, cateid = None):
        if(
            cateid != None and type(cateid) != int
        ):
            return 'Eparameter'

        ret = None
        if cateid != None and not self.does_cateid_exist(cateid):
            return 'Eno_such_cateid'

        uid = mod.UserMg.get_current_uid()

        ret = self._list_square_category(cateid, uid)

        return ret

    def _list_square_category(self, cateid, uid):
        cur = self.db.cursor()
        sqlsel = ('SELECT "SQUARE"."sqid", "title", "start_time", "end_time", '
                  '"hidden", "sqmodid", "intro", "logo", "cateid"')
        sqlfrom = (' FROM "SQUARE"')
        sqlwhere = (' WHERE true')
        sqlorder = (' ORDER BY "SQUARE"."sqid" ASC')
        sqlarr = []

        if uid != None:
            sqlsel = sqlsel + (', "active"')
            sqlfrom = sqlfrom + (' LEFT JOIN "SQUARE_USER" ON "SQUARE"."sqid"'
                                 ' = "SQUARE_USER"."sqid" AND "SQUARE_USER".'
                                 '"uid" = %s')
            sqlarr.append(uid)
        
        if cateid != None:
            sqlwhere = sqlwhere + (' AND %s = ANY ("cateid")')
            sqlarr.append(cateid)

        sqlstr = sqlsel + sqlfrom + sqlwhere + sqlorder + ';'
        cur.execute(sqlstr, sqlarr)

        ret = []
        for data in cur:
            obj = {}
            obj['sqid'] = data[0]
            obj['title'] = data[1]
            obj['start_time'] = data[2]
            obj['end_time'] = data[3]
            obj['hidden'] = data[4]
            obj['sqmodid'] = data[5]
            obj['intro'] = data[6]
            obj['logo'] = data[7]
            obj['cateid'] = data[8]

            if 0 in obj['cateid']:
                obj['cateid'] = []

            if uid != None:
                obj['active'] = data[9]

            nowtime = datetime.datetime.now()

            if obj['start_time'] == None:
                obj['status'] = self.STATUS_RUNNING
            elif nowtime < obj['start_time']:
                obj['status'] = self.STATUS_WAITING
            elif obj['end_time'] == None:
                obj['status'] = self.STATUS_RUNNING
            elif nowtime > obj['end_time']:
                obj['status'] = self.STATUS_ENDED
            else:
                obj['status'] = self.STATUS_RUNNING

            ret.append(obj)
        
        return ret

    @imc.async.caller
    def create_group():
        pass

    @imc.async.caller
    def del_group():
        pass

    @imc.async.caller
    def list_group():
        pass

    @imc.async.caller
    def group_create_square():
        pass
    
    @imc.async.caller
    def group_remove_square():
        pass

    @imc.async.caller
    def group_list_square():
        pass

    @imc.async.caller
    def create_category(self, catename):
        if(
            type(catename) != str
        ):
            return 'Eparameter'

        cateid = self._create_category(catename)
        return cateid

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_CREATE)
    def _create_category(self, catename):
        cur = self.db.cursor()
        sqlstr = ('INSERT INTO "CATEGORY" ("catename") VALUES (%s) RETURNING '
                  '"cateid";')
        sqlarr = (catename, )
        cur.execute(sqlstr, sqlarr)

        cateid = None
        for data in cur:
            cateid = data[0]

        return cateid

    def _set_square_category(self, sqid, category):
        sq_accessid = self.get_accessid_by_sqid(sqid)
        TOJAuth.check_access_func(sq_accessid, TOJAuth.ACCESS_WRITE)

        if category == {}:
            category = {0}

        cur = self.db.cursor()
        sqlstr = ('UPDATE "SQUARE" SET "cateid" = %s WHERE "sqid" = %s;')
        sqlarr = (category, sqid)
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def list_category(self):
        cur = self.db.cursor()
        sqlstr = ('SELECT "cateid", "catename" FROM "CATEGORY" ORDER BY '
                  '"cateid" ASC;')
        cur.execute(sqlstr)

        cate_list = []
        for data in cur:
            cate = {}
            cate['cateid'] = data[0]
            cate['catename'] = data[1]
            
            if cate['cateid'] == 0:
                zerocate = cate
            else:            
                cate_list.append(cate)
        
        cate_list.append(zerocate)

        return cate_list

    @imc.async.caller
    def join_square(self, sqid):
        if(
            type(sqid) != int
        ):
            return 'Eparameter'

        uid = mod.UserMg.get_current_uid()
        if uid == None:
            return 'Euid'

        sq = self.get_square_info_by_sqid(sqid)
        if sq == None:
            return 'Eno_such_sqid'

        with TOJAuth.change_current_iden(self._idendesc):
            sqobj = self.load_square(sqid)

        result = sqobj.join_square(uid)

        if result == self.JOIN_REJECT:
            return 'Ereject'
        elif result == self.JOIN_PENDING:
            with TOJAuth.change_current_iden(self._idendesc):
                self._set_user_square_relation(uid, sqid, False)
            return {'active': False}
        elif result == self.JOIN_ACCEPT:
            with TOJAuth.change_current_iden(self._idendesc):
                self._set_user_square_relation(uid, sqid, True)
            
            return {'active': True}
        else:
            return 'Ejoin_sq_error'

    @imc.async.caller
    def quit_square(self, sqid):
        if(
            type(sqid) != int
        ):
            return 'Eparameter'

        uid = mod.UserMg.get_current_uid()
        if uid == None:
            return 'Euid'

        sq = self.get_square_info_by_sqid(sqid)
        if sq == None:
            return 'Eno_such_sqid'

        with TOJAuth.change_current_iden(self._idendesc):
            sqobj = self.load_square(sqid)

        sqobj.quit_square(uid)
        
        with TOJAuth.change_current_iden(self._idendesc):
            self._del_user_square_relation(uid, sqid)

        return 'Success'

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_WRITE)
    def _set_user_square_relation(self, uid, sqid, active):
        cur = self.db.cursor()
        name = 'SQUARE_USER'
        cond = {
            'sqid': sqid,
            'uid': uid
        }
        value = {
            'active': active
        }
        cur.upsert(name, cond, value)

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_WRITE)
    def _del_user_square_relation(self, uid, sqid):
        cur = self.db.cursor()
        sqlstr = ('DELETE FROM "SQUARE_USER" WHERE "uid" = %s AND "sqid" = %s;')
        sqlarr = (uid, sqid)
        cur.execute(sqlstr, sqlarr)

    def get_square_info_by_sqid(self, sqid):
        cur = self.db.cursor()
        sqlstr = ('SELECT "sqid", "title", "start_time", "end_time", '
                  '"hidden", "sqmodid", "intro", "logo", "cateid" FROM '
                  '"SQUARE" WHERE "sqid" = %s;')
        sqlarr = (sqid, )
        cur.execute(sqlstr, sqlarr)

        ret = None
        for data in cur:
            ret = {}
            ret['sqid'] = data[0]
            ret['title'] = data[1]
            ret['start_time'] = data[2]
            ret['end_time'] = data[3]
            ret['hidden'] = data[4]
            ret['sqmodid'] = data[5]
            ret['intro'] = data[6]
            ret['logo'] = data[7]
            ret['cateid'] = data[8]

            if 0 in ret['cateid']:
                ret['cateid'] = []

        return ret

    def does_sqid_exist(self, sqid):
        ret = self.get_square_info_by_sqid(sqid)
        return ret != None

    def get_accessid_by_sqid(self, sqid):
        cur = self.db.cursor()
        sqlstr = ('SELECT "accessid" FROM "SQUARE" WHERE "sqid" = %s;')
        sqlarr = (sqid, )
        cur.execute(sqlstr, sqlarr)

        accessid = None
        for data in cur:
            accessid = data[0]

        return accessid

    def get_catename_by_cateid(self, cateid):
        cur = self.db.cursor()
        sqlstr = ('SELECT "catename" FROM "CATEGORY" WHERE "cateid" = %s;')
        sqlarr = (cateid, )
        cur.execute(sqlstr, sqlarr)

        catename = None
        for data in cur:
            catename = data[0]

        return catename

    def does_cateid_exist(self, cateid):
        catename = self.get_catename_by_cateid(cateid)
        return catename != None

    def get_sqmodname_by_sqmodid(self, sqmodid):
        cur = self.db.cursor()
        sqlstr = ('SELECT "sqmodname" FROM "SQMOD" WHERE "sqmodid" = %s;')
        sqlarr = (sqmodid, )
        cur.execute(sqlstr, sqlarr)

        sqmodname = None
        for data in cur:
            sqmodname = data[0]

        return sqmodname

    def does_sqmodid_exist(self, sqmodid):
        sqmodname = self.get_sqmodname_by_sqmodid(sqmodid)
        return sqmodname != None

class Square:
    def unload(self):
        pass

class Group:
    pass

