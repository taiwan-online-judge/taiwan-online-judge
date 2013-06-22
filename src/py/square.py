from tojauth import TOJAuth
from asyncdb import AsyncDB
from user import UserMg
import imc.proxy
import config

class SquareMg:
    _accessid = 4

    TITLE_LEN_MIN = 1
    TITLE_LEN_MAX = 100

    SQUARE_CATE_NUM_MAX = 50

    def __init__(self, mod_idendesc, get_link_fn):
        SquareMg.instance = self
        SquareMg.db = AsyncDB(config.CORE_DBNAME, config.CORE_DBUSER, 
                config.CORE_DBPASSWORD)
        SquareMg._idendesc = mod_idendesc
        self.get_link = get_link_fn

    @imc.async.caller
    def create_square(self, title, hidden, sqmodid, category = []):
        if(
            type(title) != str or
            type(hidden) != bool or
            type(sqmodid) != int or
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

        if len(category) > self.SQUARE_CATE_NUM_MAX:
            return 'Etoo_many_category'

        category = list(set(category))

        for cateid in category:
            if not self.does_cateid_exist(cateid):
                return 'Eno_such_cateid'

        sqid = self._create_square(title, hidden, sqmodid)
        self._set_square_category(sqid, category)
        return {'sqid': sqid}

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_CREATE)
    def _create_square(self, title, hidden, sqmodid):
        cur = self.db.cursor()
        sqlstr = ('INSERT INTO "SQUARE" ("title", "hidden", "sqmodid", '
                  '"accessid") VALUES (%s, %s, %s, %s) RETURNING "sqid";')
        sqlarr = (title, hidden, sqmodid, 0)
        cur.execute(sqlstr, sqlarr)

        sqid = None
        for data in cur:
            sqid = data[0]

        if sqid != None:
            user_idenid = TOJAuth.get_current_iden()['idenid']
            with TOJAuth.change_current_iden(self._idendesc):
                accessid = TOJAuth.instance.create_access(user_idenid)

            sqlstr = ('UPDATE "SQUARE" SET "accessid" = %s WHERE "sqid" = %s;')
            sqlarr = (accessid, sqid)
            cur.execute(sqlstr, sqlarr)

            with TOJAuth.change_current_iden(self._idendesc):
                TOJAuth.instance.set_access_list(
                    accessid, TOJAuth.ROLEID_SQUARE_ADMIN_GROUP, 
                    TOJAuth.ACCESS_ALL
                )

            # sqmod.create_square_data(sqid)

        return sqid;

    @imc.async.caller
    def delete_square(self, sqid):
        if(
            type(sqid) != int
        ):
            return 'Eparameter'

        if not self.does_sqid_exist(sqid):
            return 'Eno_such_sqid'

        self._delete_square(self, sqid)
    
    def _delete_square(self, sqid):
        accessid = self.get_accessid_by_sqid(sqid)
        TOJAuth.check_access_func(accessid, TOJAuth.ACCESS_DELETE)

        # sqmod.delete_square_data(sqid)

        with TOJAuth.change_current_iden(self._idendesc):
            TOJAuth.instance.del_access(accessid)

        cur = self.db.cursor()
        sqlstr = ('DELETE FROM "SQUARE" WHERE "sqid" = %s;')
        sqlarr = (sqid, )
        cur.execute()

    @imc.async.caller
    def list_square(self, cateid = None):
        if(
            cateid != None and type(cateid) != int
        ):
            return 'Eparameter'

        ret = None
        if cateid == None:
            ret = self._list_square_all()
        else:
            if not self.does_cateid_exist(cateid):
                return 'Eno_such_cateid'
            ret = self._list_square_category(cateid)

        return ret

    def _list_square_category(self, cateid):
        cur = self.db.cursor()
        sqlstr = ('SELECT "sqid", "title", "start_time", "end_time", "hidden",'
                  ' "sqmodid" FROM "SQUARE" WHERE %s = ANY ("cateid");')
        sqlarr = (cateid, )
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
            ret.append(obj)

        return ret

    def _list_square_all(self):
        cur = self.db.cursor()
        sqlstr = ('SELECT "sqid", "title", "start_time", "end_time", "hidden",'
                  ' "sqmodid" FROM "SQUARE";')
        cur.execute(sqlstr)

        ret = []
        for data in cur:
            obj = {}
            obj['sqid'] = data[0]
            obj['title'] = data[1]
            obj['start_time'] = data[2]
            obj['end_time'] = data[3]
            obj['hidden'] = data[4]
            obj['sqmodid'] = data[5]
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

    @imc.async.caller
    def set_square_category(self, sqid, category):
        if(
            type(sqid) != int or
            type(category) != list
        ):
            return 'Eparameter'

        for cateid in category:
            if(
                type(cateid) != int
            ):
                return 'Eparameter'

        if len(category) > self.SQUARE_CATE_NUM_MAX:
            return 'Etoo_many_category'

        category = list(set(category))
        
        if not self.does_sqid_exist(sqid):
            return 'Eno_such_sqid'

        for cateid in category:
            if not self.does_cateid_exist(cateid):
                return 'Eno_such_cateid'

        self._set_square_category(sqid, category)
        
    def _set_square_category(self, sqid, category):
        sq_accessid = self.get_accessid_by_sqid(sqid)
        TOJAuth.check_access_func(sq_accessid, TOJAuth.ACCESS_WRITE)

        cur = self.db.cursor()
        sqlstr = ('UPDATE "SQUARE" SET "cateid" = %s WHERE "sqid" = %s;')
        sqlarr = (category, sqid)
        cur.execute(sqlstr, sqlarr)

    def get_square_info_by_sqid(self, sqid):
        cur = self.db.cursor()
        sqlstr = ('SELECT "sqid", "title", "start_time", "end_time", '
                  '"hidden", "sqmodid", "cateid" FROM "SQUARE" WHERE '
                  '"sqid" = %s;')
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
            ret['cateid'] = data[6]

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

class Square:
    pass

class Group:
    pass
