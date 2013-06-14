from tojauth import TOJAuth
from asyncdb import AsyncDB
from user import UserMg
import imc.proxy
import config

class Mail:
    _accessid = 3

    MAIL_TYPE_INBOX = 1
    MAIL_TYPE_SENT_BACKUP = 2
    MAIL_TYPE_DRAFT = 3

    TITLE_LEN_MIN = 1
    TITLE_LEN_MAX = 256
    CONTENT_LEN_MIN = 0
    CONTENT_LEN_MAX = 65536

    LIST_ITEM_PER_PAGE = 20

    def __init__(self, mod_idendesc, get_link):
        Mail.instance = self
        Mail.db = AsyncDB(config.CORE_DBNAME, config.CORE_DBUSER, 
                config.CORE_DBPASSWORD)
        Mail._idendesc = mod_idendesc
        self.get_link = get_link

    @imc.async.caller
    def send_mail(self, to_uid, title, content):
        if(
            type(to_uid) != int or
            type(title) != str or
            type(content) != str
        ):
            return 'Eparameter'

        if len(title) < self.TITLE_LEN_MIN:
            return 'Etitle_too_short'
        elif len(title) > self.TITLE_LEN_MAX:
            return 'Etitle_too_long'
        elif len(content) < self.CONTENT_LEN_MIN:
            return 'Econtent_too_short'
        elif len(content) > self.CONTENT_LEN_MAX:
            return 'Econtent_too_long'

        user_iden = TOJAuth.get_current_iden()
        try:
            uid = user_iden['uid']
        except KeyError:
            return 'Euid_error'

        if not UserMg.instance.does_uid_exist(to_uid):
            return 'Eto_uid_not_exist'

        with TOJAuth.change_current_iden(self._idendesc):
            self._add_mail(
                to_uid, uid, self.MAIL_TYPE_INBOX, True, title, content
            )
            self._add_mail(
                uid, uid, self.MAIL_TYPE_SENT_BACKUP, False, title,content
            )


    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _add_mail(self, uid, from_uid, mail_type, unread, title, content):
        cur = self.db.cursor()
        sqlstr = ('INSERT INTO "MAIL" ("uid", "from_uid", "mail_type", '
                  '"unread", "title", "content") VALUES (%s, %s, %s, %s, %s, '
                  '%s) RETURNING "mailid";')
        sqlarr = (uid, from_uid, mail_type, unread, title, content)
        cur.execute(sqlstr, sqlarr)

        mailid = None
        for data in cur:
            mailid = data[0]

        return mailid

    @imc.async.caller
    def recv_mail(self, mailid):
        if(
            type(mailid) != int
        ):
            return 'Eparameter'

        user_iden = TOJAuth.get_current_iden()
        try:
            uid = user_iden['uid']
        except KeyError:
            return 'Euid_error'

        with TOJAuth.change_current_iden(self._idendesc):
            mail = self._get_mail(mailid)

        if mail == None:
            return 'Eno_such_mailid'
        if mail['to_uid'] != uid:
            TOJAuth.check_access(
                self._accessid, TOJAuth.ACCESS_EXECUTE)(lambda x:x)(0)

        with TOJAuth.change_current_iden(self._idendesc):
            self._set_unread_stat(mailid, False)

        return mail

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _get_mail(self, mailid):
        cur = self.db.cursor()
        sqlstr = ('SELECT * FROM "MAIL" WHERE "mailid" = %s;')
        sqlarr = (mailid, )
        cur.execute(sqlstr, sqlarr)

        ret = None
        for data in cur:
            ret = {}
            ret['mailid'] = data[0]
            ret['to_uid'] = data[1]
            ret['from_uid'] = data[2]
            ret['mail_type'] = data[3]
            ret['title'] = data[5]
            ret['content'] = data[6]
            ret['send_time'] = data[7]

            ret['to_username'] = (
                UserMg.instance.get_user_info_by_uid(data[1])['username'])
            ret['from_username'] = (
                UserMg.instance.get_user_info_by_uid(data[2])['username'])

        return ret

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _set_unread_stat(self, mailid, unread):
        cur = self.db.cursor()
        sqlstr = ('UPDATE "MAIL" SET "unread" = %s WHERE "mailid" = %s;')
        sqlarr = (unread, mailid)
        cur.execute(sqlstr, sqlarr)

    @imc.async.caller
    def list_mail(
        self, mail_type, start_index = 1, end_index = LIST_ITEM_PER_PAGE
    ):
        if(
            type(mail_type) != int
        ):
            return 'Eparameter'

        user_iden = TOJAuth.get_current_iden()
        try:
            uid = user_iden['uid']
        except KeyError:
            return 'Euid_error'
        
        with TOJAuth.change_current_iden(self._idendesc):
            maillist = self._get_maillist(
                uid, mail_type, start_index, end_index)

        return maillist

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _get_maillist(self, uid, mail_type, start_index, end_index):
        cur = self.db.cursor()
        sqlstr = ('SELECT "mailid", "from_uid", "unread", "title", '
                  '"send_time" FROM "MAIL" WHERE "uid" = %s AND "mail_type" = '
                  '%s ORDER BY "mailid" ASC LIMIT %s OFFSET %s;')
        sqlarr = (uid, mail_type, end_index - start_index + 1, start_index - 1)
        cur.execute(sqlstr, sqlarr)

        ret = []

        for data in cur:
            item = {}
            item['mailid'] = data[0]
            item['from_uid'] = data[1]
            item['unread'] = data[2]
            item['title'] = data[3]
            item['send_time'] = data[4]

            item['from_username'] = (
                UserMg.instance.get_user_info_by_uid(data[1])['username'])
 
            ret.append(item) 
         
        return ret

    @imc.async.caller
    def del_mail(self, mailid):
        if(
            type(mailid) != int
        ):
            return 'Eparameter'

        user_iden = TOJAuth.get_current_iden()
        try:
            uid = user_iden['uid']
        except KeyError:
            return 'Euid_error'

        with TOJAuth.change_current_iden(self._idendesc):
            mail = self._get_mail(mailid)

        if mail == None:
            return 'Eno_such_mailid'
        if mail['to_uid'] != uid:
            TOJAuth.check_access(
                self._accessid, TOJAuth.ACCESS_EXECUTE)(lambda x:x)(0)
        
        with TOJAuth.change_current_iden(self._idendesc):
            self._del_mail(mailid)

    @TOJAuth.check_access(_accessid, TOJAuth.ACCESS_EXECUTE)
    def _del_mail(self, mailid):
        cur = self.db.cursor()
        sqlstr = ('DELETE FROM "MAIL" WHERE "mailid" = %s;')
        sqlarr = (mailid, )
        cur.execute(sqlstr, sqlarr)
