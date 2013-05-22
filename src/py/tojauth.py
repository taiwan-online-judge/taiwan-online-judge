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

    def __init__(self,pubkey,privkey = None):
        super().__init__()

        self.set_verifykey(pubkey)
        if privkey != None:
            self.set_signkey(privkey)

        TOJAuth.instance = self
        TOJAuth.db = AsyncDB(config.CORE_DBNAME,config.CORE_DBUSER,
                config.CORE_DBPASSWORD)

    def create_iden(self,linkclass,linkid):
        iden = {
            'linkclass':linkclass,
            'linkid':linkid
        }
        return self.sign_iden(iden)

    def get_iden(self,conn_linkclass,conn_linkid,idendesc):
        iden = super().get_iden(idendesc) 
        if iden == None:
            return None

        if conn_linkclass == 'client' and conn_linkid != iden['linkid']:
            return None

        return iden
    
    def check_access(self, accessid, access_mask):
        def wrapper(f):
            idenid = self.current_iden['idenid']
            ok = False
            
            cur = self.db.cursor()

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
                sqlstr = ('SELECT "ACCESS_ROLE"."permission" FROM "ACCESS_ROLE"'
                        ' INNER JOIN "IDEN_ROLE" ON "ACCESS_ROLE"."roleid" = '
                        '"IDEN_ROLE"."roleid" WHERE "ACCESS_ROLE"."accessid"=%s'
                        ' AND "IDEN_ROLE"."idenid"=%s;')
                sqlarr = (accessid, idenid)
                cur.execute(sqlstr, sqlarr)

                for data in cur:
                    permission = data[0]
                    if (permission & access_mask) == access_mask:
                        ok = True
                        break

            if ok:
                return f
            else:
                raise Exception('TOJAuth.check_access() : PERMISSION DENIED')

        return wrapper

    def create_access(self):
        self.check_access(self.auth_accessid, self.ACCESS_EXECUTE)(0)
        cur = self.db.cursor()
        sqlstr = ('INSERT INTO "ACCESS" ("owner_idenid") VALUES (%s) '
                'RETURNING "accessid";')
        sqlarr = (self.current_iden['idenid'], )
        cur.execute(sqlstr, sqlarr)
        for data in cur:
            accessid = data[0]
        return accessid
        
    def set_access_list(self, accessid, roleid, permission):
        self.check_access(accessid, self.ACCESS_SETPER)(0)

        def _db_write(accessid, roleid, permission):
            cur = self.db.cursor()
            if not self._does_access_list_exist(cur, accessid, roleid):
                sqlstr = ('INSERT INTO "ACCESS_ROLE" ("accessid", "roleid", '
                        '"permission") VALUES (%s, %s, %s);')
                sqlarr = (accessid, roleid, permission)
            else:
                sqlstr = ('UPDATE "ACCESS_ROLE" SET "permission"=%s '
                        'WHERE "accessid"=%s AND "roleid"=%s;')
                sqlarr = (permission, accessid, roleid)
            cur.execute(sqlstr, sqlarr)
        
        _db_write(accessid, roleid, permission)

    def del_access_list(self, accessid, roleid):
        self.check_access(accessid, self.ACCESS_SETPER)(0)

        def _db_write(accessid, roleid):
            cur = self.db.cursor()
            if self._does_access_list_exist(cur, accessid, roleid):
                sqlstr = ('DELETE FROM "ACCESS_ROLE" WHERE "accessid"=%s '
                        'AND "roleid"=%s;')
                sqlarr = (accessid, roleid)
                cur.execute(sqlstr, sqlarr)
            else:
                raise Exception('TOJAuth.del_access_list() : Access object '
                        'doesn\'t exist')
        
        _db_write(accessid, roleid)

    def _does_access_list_exist(self, cur, accessid, roleid):
        sqlstr = ('SELECT COUNT(*) FROM "ACCESS_ROLE" WHERE '
                '"accessid"=%s AND "roleid"=%s;')
        sqlarr = (accessid, roleid)
        cur.execute(sqlstr, sqlarr)
        for data in cur:
            count = data[0]
        return count>0

    def create_role(self, rolename, roletype):
        self.check_access(self.auth_accessid, self.ACCESS_EXECUTE)(0)
        cur = self.db.cursor()    
        sqlstr = ('INSERT INTO "ROLE" ("rolename") VALUES (%s)'
                ' RETURNING "roleid";')
        sqlarr = (rolename, )
        cur.execute(sqlstr, sqlarr)
        for data in cur:
            roleid = data[0]
        return roleid

    def set_role_relation(self, idenid, roleid):
        self.check_access(self.auth_accessid, self.ACCESS_EXECUTE)(0)

        def _db_write(idenid, roleid):
            cur = self.db.cursor()
            if not self._does_role_relation_exist(cur, idenid, roleid):
                sqlstr = ('INSERT INTO "IDEN_ROLE" ("idenid", "roleid") '
                        'VALUES (%s, %s);')
                sqlarr = (idenid, roleid)
                cur.execute(sqlstr, sqlarr)

        _db_write(idenid, roleid)

    def del_role_relation(self, idenid, roleid):
        self.check_access(self.auth_accessid, self.ACCESS_EXECUTE)(0)

        def _db_write(idenid, roleid):
            cur = self.db.cursor()
            if self._does_role_relation_exist(cur, idenid, roleid):
                sqlstr = ('DELETE FROM "IDEN_ROLE" WHERE "idenid"=%s '
                        'AND "roleid"=%s;')
                sqlarr = (idenid, roleid)
                cur.execute(sqlstr, sqlarr)
            else:
                raise Exception('TOJAuth.del_role_relation() : Role relation '
                        'doesn\'t exist')

        _db_write(idenid, roleid)

    def _does_role_relation_exist(self, cur, idenid, roleid):
        sqlstr = ('SELECT COUNT(*) FROM "IDEN_ROLE" WHERE "idenid"=%s '
                'AND "roleid"=%s;')
        sqlarr = (idenid, roleid)
        cur.execute(sqlstr, sqlarr)
        for data in cur:
            count = data[0]
        return count>0

    def set_owner(self, idenid, accessid):
        self.check_access(accessid, self.ACCESS_SETPER)(0)
        cur = self.db.cursor()
        sqlstr = ('UPDATE "ACCESS" SET "owner_idenid"=%s WHERE "accessid"=%s;')
        sqlarr = (idenid, accessid)
        cur.execute(sqlstr, sqlarr)

