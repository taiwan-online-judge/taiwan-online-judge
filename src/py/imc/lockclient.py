from imc import async
from imc.auth import Auth

class LockClient:
    def __init__(self,proxy,idendesc,serverlink):
        self.RWLOCK_READ = 1
        self.RWLOCK_WRITE = 2

        self._proxy = proxy
        self._idendesc = idendesc
        self._callpath = serverlink + 'lockserver/'

        self.rwlock_namemap = {}

        self._proxy.register_call('lockclient/','sync_write_lock',
                                  self.sync_write_lock)
        self._proxy.register_call('lockclient/','sync_write_unlock',
                                  self.sync_write_unlock)

        with Auth.change_current_iden(self._idendesc):
            self._proxy.instance.call(self._callpath,'connect_client',10000)

        LockClient.instance = self

    def read_lock(self,lockname):
        while True:
            if lockname not in self.rwlock_namemap:
                self.rwlock_namemap[lockname] = {
                    'state':self.RWLOCK_READ,
                    'count':1,
                    'waitlist':[]
                }

                break

            else:
                lock = rwlock_namemap[lockname]
                if lock['state'] == self.RWLOCK_READ:
                    lock['count'] += 1
                    break

                else:
                    retid = async.get_retid()
                    lock['waitlist'].append(retid)
                    async.switch_top()

    def read_unlock(self,lockname):
        try:
            lock = self.rwlock_namemap[lockname]

        except KeyError:
            return

        if lock['state'] != self.RWLOCK_READ:
            return

        lock['count'] -= 1
        if lock['count'] <= 0:
            waitlist = lock['waitlist']
            for retid in waitlist:
                asycn.ret(retid)

            del self.rwlock_namemap[lockname]

    def write_lock(self,lockname):
        with Auth.change_current_iden(self._idendesc):
            self._proxy.instance.call(self._callpath,'write_lock',3600000,
                                      lockname)

    def write_unlock(self,lockname):
        with Auth.change_current_iden(self._idendesc):
            self._proxy.instance.call(self._callpath,'write_unlock',10000,
                                      lockname)

    @async.caller
    def sync_write_lock(self,lockname):
        while True:
            if lockname not in self.rwlock_namemap:
                self.rwlock_namemap[lockname] = {
                    'state':self.RWLOCK_WRITE,
                    'count':1,
                    'waitlist':[]
                }

                break

            else:
                lock = self.rwlock_namemap[lockname]
                retid = async.get_retid()
                lock['waitlist'].append(retid)

        return 'Success'

    @async.caller
    def sync_write_unlock(self,lockname):
        try:
            lock = self.rwlock_namemap[lockname]

        except KeyError:
            return 'Enoexist'

        if lock['state'] != self.RWLOCK_WRITE:
            return 'Enoexist'

        waitlist = lock['waitlist']
        for retid in waitlist:
            asycn.ret(retid)

        del self.rwlock_namemap[lockname]

        return 'Success'
