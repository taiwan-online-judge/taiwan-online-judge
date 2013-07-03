from tojauth import TOJAuth
from asyncdb import AsyncDB
import mod
from imc.proxy import Proxy
import imc.proxy
import config

class Notice:
    _accessid = 5

    NOTICE_LIST_NUM = 10

    def __init__(self, mod_idendesc, get_link_fn):
        Notice.db = AsyncDB(config.CORE_DBNAME, config.CORE_DBUSER, 
                            config.CORE_DBPASSWORD)
        Notice._idendesc = mod_idendesc
        self.get_link = get_link_fn

        Proxy.instance.register_call(
            'core/notice/', 'list_notice', self.list_notice)
        Proxy.instance.register_call(
            'core/notice/', 'read_notice', self.read_notice)
        Proxy.instance.register_call(
            'core/notice/', 'del_notice', self.del_notice)
        Proxy.instance.register_call(
            'core/notice/', 'get_unseen_count', self.get_unseen_count)

    def unload(self):
        Proxy.instance.unregister_call(
            'core/notice/', 'list_notice')
        Proxy.instance.unregister_call(
            'core/notice/', 'read_notice')
        Proxy.instance.unregister_call(
            'core/notice/', 'del_notice')
        Proxy.instance.unregister_call(
            'core/notice/', 'get_unseen_count')

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def send_notice(self, uid, title, content, noticemod_path, metadata):
        cur = self.db.cursor()

        noticemodid = None

        if noticemod_path != None: 
            sqlstr = ('SELECT "noticemodid" FROM "NOTICEMOD" WHERE "path" '
                      '= %s;')
            sqlarr = (noticemod_path, )
            cur.execute(sqlstr, sqlarr)

            for data in cur:
                noticemodid = data[0]

            if noticemodid == None:
                sqlstr = ('INSERT INTO "NOTICEMOD" ("path") VALUES (%s) '
                          'RETURNING "noticemodid";')
                sqlarr = (noticemod_path, )
                cur.execute(sqlstr, sqlarr)
                for data in cur:
                    noticemodid = data[0]

        sqlstr = ('INSERT INTO "NOTICE" ("uid", "title", "content", '
                  '"noticemodid", "metadata") VALUES (%s, %s, %s, %s, %s) '
                  'RETURNING "noticeid";')
        sqlarr = (uid, title, content, noticemodid, metadata)
        cur.execute(sqlstr, sqlarr)

        noticeid = None
        for data in cur:
            noticeid = data[0]

        unseen_count = self._get_unseen_count(uid)
        self.set_unseen_count(uid, unseen_count + 1)

        return noticeid

    @imc.async.caller
    def del_notice(self, noticeid):
        if(
            type(noticeid) != int
        ):
            return 'Eparameter'

        notice = self.get_notice(noticeid)
        if notice == None:
            return 'Enoticeid'

        with TOJAuth.change_current_iden(self._idendesc):
            self._del_notice(noticeid)
            self.notify_client(notice['uid'])

        return 'Success'

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _del_notice(self, noticeid):    
        cur = self.db.cursor()
        sqlstr = ('DELETE FROM "NOTICE" WHERE "noticeid" = %s;')
        sqlarr = (noticeid, )
        cur.execute(sqlstr, sqlarr)
    
    @imc.async.caller
    def list_notice(self, start_index = 0, list_num = NOTICE_LIST_NUM):
        if(
            type(start_index) != int or
            type(list_num) != int
        ):
            return 'Eparameter'

        uid = mod.UserMg.get_current_uid()
        if uid == None:
            return 'Euid'

        with TOJAuth.change_current_iden(self._idendesc):
            ret = self._list_notice(uid, start_index, list_num)

        return ret

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _list_notice(self, uid, start_index, list_num):
        cur = self.db.cursor()
        sqlstr = ('SELECT "noticeid", "title", "content", "time", '
                  '"noticemodid", "metadata", "unread" FROM "NOTICE" WHERE '
                  '"uid" = %s ORDER BY "noticeid" DESC LIMIT %s OFFSET %s;')
        sqlarr = (uid, list_num, start_index)
        cur.execute(sqlstr, sqlarr)

        ret = []
        for data in cur:
            obj = {}
            obj['noticeid'] = data[0]
            obj['title'] = data[1]
            obj['content'] = data[2]
            obj['time'] = data[3]
            obj['noticemodid'] = data[4]
            obj['metadata'] = data[5]
            obj['unread'] = data[6]
            ret.append(obj)

        self.set_unseen_count(uid, 0)

        return ret

    @imc.async.caller
    def read_notice(self, noticeid):
        if(
            type(noticeid) != int
        ):
            return 'Eparameter'

        notice = self.get_notice(noticeid)
        if notice == None:
            return 'Enoticeid'

        with TOJAuth.change_current_iden(self._idendesc):
            self.set_notice_unread(noticeid, False)

        return 'Success'

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def set_notice_unread(self, noticeid, unread):
        cur = self.db.cursor()
        sqlstr = ('UPDATE "NOTICE" SET "unread" = %s WHERE "noticeid" = %s;')
        sqlarr = (unread, noticeid)
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def get_unseen_count(self):
        uid = mod.UserMg.get_current_uid()
        if uid == None:
            return 'Euid'

        with TOJAuth.change_current_iden(self._idendesc):
            unseen_count = self._get_unseen_count(uid)

        return {'unseen_count': unseen_count}

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _get_unseen_count(self, uid):
        cur = self.db.cursor()
        sqlstr = ('SELECT "unseen_count" FROM "NOTICE_UNSEEN" WHERE '
                  '"uid" = %s;')
        sqlarr = (uid, )
        cur.execute(sqlstr, sqlarr)

        unseen_count = None
        for data in cur:
            unseen_count = data[0]

        return unseen_count

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def set_unseen_count(self, uid, unseen_count):
        old_unseen_count = self._get_unseen_count(uid)

        cur = self.db.cursor()
        sqlstr = ('UPDATE "NOTICE_UNSEEN" SET "unseen_count" = %s WHERE '
                  '"uid" = %s;')
        sqlarr = (unseen_count, uid)
        cur.execute(sqlstr, sqlarr)

        if old_unseen_count != unseen_count:
            self.notify_client(uid)

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def create_unseen_count(self, uid):
        cur = self.db.cursor()
        sqlstr = ('INSERT INTO "NOTICE_UNSEEN" ("uid", "unseen_count") '
                  'VALUES (%s, %s);')
        sqlarr = (uid, 0)
        cur.execute(sqlstr, sqlarr)

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def notify_client(self, uid):
        unseen_count = self._get_unseen_count(uid)

        for link in self.get_link('client', uid = uid):
            Proxy.instance.call_async(
                link + 'core/notice/', 'update_notice', 10000, None, 
                unseen_count
            )

    def get_notice(self, noticeid):
        cur = self.db.cursor()
        sqlstr = ('SELECT "noticeid", "uid", "title", "content", "time", '
                  '"noticemodid", "metadata", "unread" FROM "NOTICE" WHERE '
                  '"noticeid" = %s;')
        sqlarr = (noticeid, )
        cur.execute(sqlstr, sqlarr)

        ret = None
        for data in cur:
            ret = {}
            ret['noticeid'] = data[0]
            ret['uid'] = data[1]
            ret['title'] = data[2]
            ret['content'] = data[3]
            ret['time'] = data[4]
            ret['noticemodid'] = data[5]
            ret['metadata'] = data[6]
            ret['unread'] = data[7]

        if ret == None:
            return None

        uid = mod.UserMg.get_current_uid()
        if uid != ret['uid']:
            TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_EXECUTE)

        return ret

