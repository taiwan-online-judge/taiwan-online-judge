import psycopg2
from Crypto.Hash import SHA512

from tojauth import TOJAuth
from asyncdb import AsyncDB
import imc.proxy
import config

class User:
    _accessid = 2

    USERNAME_LEN_MIN = 5
    USERNAME_LEN_MAX = 50
    PASSWORD_LEN_MIN = 5
    PASSWORD_LEN_MAX = 50
    NICKNAME_LEN_MIN = 1
    NICKNAME_LEN_MAX = 50
    EMAIL_LEN_MIN = 5
    EMAIL_LEN_MAX = 100
    AVATAR_LEN_MIN = 0
    AVATAR_LEN_MAX = 200
    ABOUTME_LEN_MIN = 0
    ABOUTME_LEN_MAX = 1000

    def __init__(self, mod_idendesc, get_link):
        User.instance = self
        User.db = AsyncDB(config.CORE_DBNAME, config.CORE_DBUSER, 
                config.CORE_DBPASSWORD)
        User._idendesc = mod_idendesc
        self.get_link = get_link

    @imc.async.caller
    def register(self, username, password, nickname, email, avatar, aboutme):
        if(
            type(username) != str or
            type(password) != str or
            type(nickname) != str or
            type(email) != str or
            type(avatar) != str or
            type(aboutme) != str
        ):
            return 'Eparameter'

        if len(username) < self.USERNAME_LEN_MIN:
            return 'Eusername_too_short'
        elif len(username) > self.USERNAME_LEN_MAX:
            return 'Eusername_too_long'
        elif len(password) < self.PASSWORD_LEN_MIN:
            return 'Epassword_too_short'
        elif len(password) > self.PASSWORD_LEN_MAX:
            return 'Epassword_too_long'
        elif len(nickname) < self.NICKNAME_LEN_MIN:
            return 'Enickname_too_short'
        elif len(nickname) > self.NICKNAME_LEN_MAX:
            return 'Enickname_too_long'
        elif len(email) < self.EMAIL_LEN_MIN:
            return 'Eemail_too_short'
        elif len(email) > self.EMAIL_LEN_MAX:
            return 'Eemail_too_long'
        elif len(avatar) < self.AVATAR_LEN_MIN:
            return 'Eavatar_too_short'
        elif len(avatar) > self.AVATAR_LEN_MAX:
            return 'Eavatar_too_long'
        elif len(aboutme) < self.ABOUTME_LEN_MIN:
            return 'Eaboutme_too_short'
        elif len(aboutme) > self.ABOUTME_LEN_MAX:
            return 'Eaboutme_too_long'

        passhash = self._password_hash(password)

        with TOJAuth.change_current_iden(self._idendesc):
            try:
                uid = self._create_user(
                    username, passhash, nickname, email, avatar, aboutme)
            except psycopg2.IntegrityError:
                return 'Eusername_already_exists'

        return {'uid' : uid}

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _create_user(self, username, passhash, nickname, email, avatar, 
            aboutme):
        roleid = TOJAuth.instance.create_role(username, TOJAuth.ROLETYPE_USER)

        cur = self.db.cursor()
        sqlstr = ('INSERT INTO "USER" ("username", "passhash", "nickname", '
                '"email", "avatar", "aboutme", "idenid") '
                'VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING "uid";')
        sqlarr = (username, passhash, nickname, email, avatar, aboutme, roleid)
        cur.execute(sqlstr, sqlarr)

        for data in cur:
            uid = data[0]
        return uid

    @imc.async.caller
    def login(self, username, password):
        if(
            type(username) != str or
            type(password) != str
        ):
            return 'Eparameter'

        uid = self.get_uid_by_username(username)
        if uid == None:
            return 'Eno_such_uid'

        passhash = self._password_hash(password)

        cur = self.db.cursor()
        sqlstr = ('SELECT "idenid" FROM "USER" WHERE "uid" = %s '
                  'AND "passhash" = %s;')
        sqlarr = (uid, passhash)
        cur.execute(sqlstr, sqlarr)

        idenid = None
        for data in cur:
            idenid = data[0]

        if idenid == None:
            return 'Ewrong_password'
        
        with TOJAuth.change_current_iden(self._idendesc):
            idendesc = TOJAuth.instance.create_iden(
                TOJAuth.get_current_iden()['link'], idenid, TOJAuth.ROLETYPE_USER, {'uid' : uid}
            )

        ret = {
            'idendesc' : idendesc,
            'uid' : uid,
            'hash' : self._uid_passhash_hash(uid, passhash)
        }

        return ret

    @imc.async.caller
    def cookie_login(self, uid, uphash):
        if(
            type(uid) != int or
            type(uphash) != str
        ):
            return 'Eparameter'

        idenid = None
        real_uphash = None

        cur = self.db.cursor()
        sqlstr = ('SELECT "idenid", "passhash" FROM "USER" WHERE "uid" = %s;')
        sqlarr = (uid, )
        cur.execute(sqlstr, sqlarr)

        for data in cur:
            idenid = data[0]
            real_uphash = self._uid_passhash_hash(uid, data[1])

        if idenid == None:
            return 'Eno_such_uid'

        if real_uphash != uphash:
            return 'Ewrong_uphash'

        with TOJAuth.change_current_iden(self._idendesc):
            idendesc = TOJAuth.instance.create_iden(
                TOJAuth.get_current_iden()['link'], idenid, TOJAuth.ROLETYPE_USER, {'uid' : uid}
            )

        ret = {
            'idendesc' : idendesc,
            'uid' : uid,
            'hash' : uphash
        }

        return ret

    @imc.async.caller
    def get_user_info(self, uid):
        if(
            type(uid) != int
        ):
            return 'Eparameter'

        ret = self._get_user_info_by_uid(uid)
        if ret == None:
            return 'Eno_such_uid'
        
        return ret

    @imc.async.caller
    def set_user_info(self, uid, nickname, email, avatar, aboutme):
        if(
            type(uid) != int or
            type(nickname) != str or
            type(email) != str or
            type(avatar) != str or
            type(aboutme) != str
        ):
            return 'Eparameter'

        if len(nickname) < self.NICKNAME_LEN_MIN:
            return 'Enickname_too_short'
        elif len(nickname) > self.NICKNAME_LEN_MAX:
            return 'Enickname_too_long'
        elif len(email) < self.EMAIL_LEN_MIN:
            return 'Eemail_too_short'
        elif len(email) > self.EMAIL_LEN_MAX:
            return 'Eemail_too_long'
        elif len(avatar) < self.AVATAR_LEN_MIN:
            return 'Eavatar_too_short'
        elif len(avatar) > self.AVATAR_LEN_MAX:
            return 'Eavatar_too_long'
        elif len(aboutme) < self.ABOUTME_LEN_MIN:
            return 'Eaboutme_too_short'
        elif len(aboutme) > self.ABOUTME_LEN_MAX:
            return 'Eaboutme_too_long'

        idenid = self.get_idenid_by_uid(uid)
        if idenid == None:
            return 'Eno_such_uid'

        if idenid != TOJAuth.get_current_iden()['idenid']:
            TOJAuth.check_access(
                self._accessid, TOJAuth.ACCESS_EXECUTE)(lambda x:x)(0)

        cur = self.db.cursor()
        sqlstr = ('UPDATE "USER" SET "nickname" = %s, "email" = %s, '
                  '"avatar" = %s, "aboutme" = %s WHERE "uid" = %s;')
        sqlarr = (nickname, email, avatar, aboutme, uid)
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def change_user_password(self, uid, old_password, new_password):
        if(
            type(uid) != int or
            type(old_password) != str or
            type(new_password) != str
        ):
            return 'Eparameter'

        if len(new_password) < self.PASSWORD_LEN_MIN:
            return 'Epassword_too_short'
        elif len(new_password) > self.PASSWORD_LEN_MAX:
            return 'Epassword_too_long'
        
        idenid = self.get_idenid_by_uid(uid)
        if idenid == None:
            return 'Eno_such_uid'

        if idenid != TOJAuth.get_current_iden()['idenid']:
            TOJAuth.check_access(
                self._accessid, TOJAuth.ACCESS_EXECUTE)(lambda x:x)(0)

        old_passhash = self._password_hash(old_password)

        cur = self.db.cursor()
        sqlstr = ('SELECT "idenid" FROM "USER" WHERE "uid" = %s '
                  'AND "passhash" = %s;')
        sqlarr = (uid, old_passhash)
        cur.execute(sqlstr, sqlarr)

        idenid = None
        for data in cur:
            idenid = data[0]

        if idenid == None:
            return 'Ewrong_old_password'

        new_passhash = self._password_hash(new_password)

        sqlstr = ('UPDATE "USER" SET "passhash" = %s WHERE "uid" = %s;')
        sqlarr = (new_passhash, uid)
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def oauth_login(self):
        raise NotImplementedError
    
    def _password_hash(self, password):
        h = SHA512.new(bytes(password + config.USER_PASSHASH_SALT, 'utf-8'))
        return h.hexdigest()

    def _uid_passhash_hash(self, uid, passhash):
        return self._password_hash(
            'GENGJIAN_WEISUO_KING^^' + str(uid) + '@E__E@' + passhash + 'Yo!')

    def _get_user_info_by_uid(self, uid):
        cur = self.db.cursor()
        sqlstr = ('SELECT * FROM "USER" WHERE "uid" = %s;')
        sqlarr = (uid, )
        cur.execute(sqlstr, sqlarr)

        ret = None
        for data in cur:
            ret = {}
            ret['uid'] = data[0]
            ret['username'] = data[1]
            ret['nickname'] = data[3]
            ret['email'] = data[4]
            ret['avatar'] = data[5]
            ret['aboutme'] = data[6]

        return ret

    def get_idenid_by_uid(self, uid):
        cur = self.db.cursor()
        sqlstr = ('SELECT "idenid" FROM "USER" WHERE "uid" = %s;')
        sqlarr = (uid, )
        cur.execute(sqlstr, sqlarr)

        ret = None
        for data in cur:
            ret = data[0]

        return ret

    def get_uid_by_username(self, username):        
        cur = self.db.cursor()
        sqlstr = ('SELECT "uid" FROM "USER" WHERE "username" = %s;')
        sqlarr = (username, )
        cur.execute(sqlstr, sqlarr)

        uid = None
        for data in cur:
            uid = data[0]

        return uid

    def does_username_exist(self, username):
        uid = self.get_uid_by_username(username)

        return uid != None

