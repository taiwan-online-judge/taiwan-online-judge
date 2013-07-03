from imc.auth import Auth
import config
from asyncdb import AsyncDB

class TOJAuth(Auth):
    ACCESS_READ     = 0x1
    ACCESS_WRITE    = 0x2
    ACCESS_CREATE   = 0x4
    ACCESS_DELETE   = 0x8
    ACCESS_SETPER   = 0x10
    ACCESS_EXECUTE  = 0x20

    ACCESS_ALL      = -1

    ROLETYPE_USER   = 1
    ROLETYPE_3RD    = 2
    ROLETYPE_MOD    = 3
    ROLETYPE_TOJ    = 4
    ROLETYPE_GROUP  = 5
    ROLETYPE_GUEST  = 6

    ROLEID_TOJ      = 1
    ROLEID_MOD      = 2
    ROLEID_GUEST    = 99

    ROLEID_SQUARE_ADMIN_GROUP   = 101
    ROLEID_PROBLEM_ADMIN_GROUP  = 102

    ROLEID_USER_GROUP   = 201

    _accessid = 1

    def __init__(self, pubkey, privkey = None):
        super().__init__()

        self.set_verifykey(pubkey)
        if privkey != None:
            self.set_signkey(privkey)

        TOJAuth.instance = self
        TOJAuth.db = AsyncDB(config.CORE_DBNAME, config.CORE_DBUSER,
                config.CORE_DBPASSWORD)

    def create_iden(self, link, idenid, roletype, payload = {}):
        iden = payload
        iden.update({
            'link' : link,
            'idenid' : idenid,
            'roletype' : roletype
        })

        return self.sign_iden(iden)

    def verify_iden(self, conn_link, idendesc):
        iden = self.get_iden(idendesc) 
        if iden == None:
            return False

        if conn_link != iden['link']:
            return False

        return True
    
    @staticmethod
    def check_access(accessid, access_mask):
        def wrapper(f):
            def wrapfunc(*args):
                idenid = TOJAuth.get_current_iden()['idenid']
                ok = False
                
                cur = TOJAuth.instance.db.cursor()

                if not ok:
                    sqlstr = ('SELECT "owner_idenid" FROM "ACCESS" WHERE '
                            '"accessid"=%s;')
                    sqlarr = (accessid, )
                    cur.execute(sqlstr, sqlarr)
                    for data in cur:
                        owner_idenid = data[0]
                        if owner_idenid == idenid:
                            ok = True

                if not ok:
                    sqlstr = ('SELECT "ACCESS_ROLE"."permission" FROM '
                              '"ACCESS_ROLE" INNER JOIN "IDEN_ROLE" ON '
                              '"ACCESS_ROLE"."roleid" = "IDEN_ROLE"."roleid" '
                              'WHERE "ACCESS_ROLE"."accessid"= %s AND '
                              '"IDEN_ROLE"."idenid" = %s;')
                    sqlarr = (accessid, idenid)
                    cur.execute(sqlstr, sqlarr)

                    permission = 0
                    for data in cur:
                        permission = permission | data[0]

                    if (permission & access_mask) == access_mask:
                        ok = True

                if ok:
                    return f(*args);
                else:
                    raise Exception('TOJAuth.check_access() : PERMISSION DENIED')

            return wrapfunc

        return wrapper

    @staticmethod
    def check_access_func(accessid, access_mask):
        TOJAuth.check_access(accessid, access_mask)(lambda x:x)(0)

    def create_access(self, owner_idenid):
        self.check_access_func(self._accessid, self.ACCESS_EXECUTE)

        cur = self.db.cursor()
        sqlstr = ('INSERT INTO "ACCESS" ("owner_idenid") VALUES (%s) '
                'RETURNING "accessid";')
        sqlarr = (owner_idenid, )
        cur.execute(sqlstr, sqlarr)

        for data in cur:
            accessid = data[0]
        return accessid

    def del_access(self, accessid):
        self.check_access_func(accessid, self.ACCESS_SETPER)

        cur = self.db.cursor()
        sqlstr = ('DELETE FROM "ACCESS_ROLE" WHERE "accessid" = %s;')
        sqlarr = (accessid, )
        cur.execute(sqlstr, sqlarr)
        
        sqlstr = ('DELETE FROM "ACCESS" WHERE "accessid" = %s;')
        sqlarr = (accessid, )
        cur.execute(sqlstr, sqlarr)
        
    def set_access_list(self, accessid, roleid, permission):
        self.check_access_func(accessid, self.ACCESS_SETPER)

        cur = self.db.cursor()
        table = 'ACCESS_ROLE'
        cond = {
                'accessid' : accessid,
                'roleid' : roleid
                }
        value = {
                'permission' : permission
                }
        cur.upsert(table, cond, value)

    def del_access_list(self, accessid, roleid):
        self.check_access_func(accessid, self.ACCESS_SETPER)

        cur = self.db.cursor()
        sqlstr = ('DELETE FROM "ACCESS_ROLE" WHERE "accessid" = %s '
                'AND "roleid" = %s;')
        sqlarr = (accessid, roleid)
        cur.execute(sqlstr, sqlarr)        

    def create_role(self, rolename, roletype):
        self.check_access_func(self._accessid, self.ACCESS_EXECUTE)

        cur = self.db.cursor()    
        sqlstr = ('INSERT INTO "ROLE" ("rolename", "roletype") VALUES (%s, %s)'
                ' RETURNING "roleid";')
        sqlarr = (rolename, roletype)
        cur.execute(sqlstr, sqlarr)
        for data in cur:
            roleid = data[0]

        if(roleid != None):
            self.set_role_relation(roleid, roleid)

        return roleid

    def set_role_relation(self, idenid, roleid):
        self.check_access_func(self._accessid, self.ACCESS_EXECUTE)

        cur = self.db.cursor()
        table = 'IDEN_ROLE'
        cond = {
                'idenid' : idenid,
                'roleid' : roleid
                }
        cur.upsert(table, cond)

    def del_role_relation(self, idenid, roleid):
        self.check_access_func(self._accessid, self.ACCESS_EXECUTE)

        cur = self.db.cursor()
        sqlstr = ('DELETE FROM "IDEN_ROLE" WHERE "idenid"=%s '
                'AND "roleid"=%s;')
        sqlarr = (idenid, roleid)
        cur.execute(sqlstr, sqlarr)

    def set_owner(self, idenid, accessid):
        self.check_access_func(accessid, self.ACCESS_SETPER)

        cur = self.db.cursor()
        sqlstr = ('UPDATE "ACCESS" SET "owner_idenid"=%s WHERE "accessid"=%s;')
        sqlarr = (idenid, accessid)
        cur.execute(sqlstr, sqlarr)

    def get_user_auth_list(self, idenid):
        self.check_access_func(self._accessid, self.ACCESS_SETPER)
        
        cur = self.db.cursor()
        sqlstr = ('SELECT "ACCESS_ROLE"."accessid", "ACCESS_ROLE"."permission" '
                  'FROM "ACCESS_ROLE" INNER JOIN "IDEN_ROLE" ON "ACCESS_ROLE"'
                  '."roleid" = "IDEN_ROLE"."roleid" WHERE "IDEN_ROLE"'
                  '."idenid" = %s;')
        sqlarr = (idenid, )
        cur.execute(sqlstr, sqlarr)

        ret_set = {}
        for data in cur:
            accessid = data[0]
            permission = data[1]

            if not accessid in ret_set:
                ret_set[accessid] = 0

            ret_set[accessid] = ret_set[accessid] | permission

        ret = []
        for accessid in ret_set:
            obj = {}
            obj['accessid'] = accessid
            obj['permission'] = ret_set[accessid]
            ret.append(obj)

        return ret

