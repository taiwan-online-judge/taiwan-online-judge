from imc import async
from imc.auth import Auth

class LockServer:
    def __init__(self,proxy,idendesc):
        self._proxy = proxy
        self._idendesc = idendesc
        self.client_linkmap = set()

        self._proxy.register_call('lockserver/','connect_client',
                                  self.connect_client)
        self._proxy.register_call('lockserver/','write_lock',
                                  self.write_lock)
        self._proxy.register_call('lockserver/','write_unlock',
                                  self.write_unlock)

        LockServer.instance = self

    @async.caller
    def connect_client(self):
        link = Auth.get_current_iden()['link']
        self.client_linkmap.add(link) 

    @async.caller
    def write_lock(self,lockname):
        def _send(link):
            def __cb(result):
                nonlocal count

                stat,ret = result
                if stat == False and ret == 'Enoexist':
                    self.client_linkmap.pop(link,None)

                count -= 1
                if count == 0:
                    async.ret(retid)

            self._proxy.call_async(link + 'lockclient/',
                                   'sync_write_lock',
                                   3600000,
                                   __cb,
                                   lockname)
        
        with Auth.change_current_iden(self._idendesc):
            links = list(self.client_linkmap)
            count = len(links)
            retid = async.get_retid()
            for link in links:
                _send(link)

        async.switch_top()
            
    @async.caller
    def write_unlock(self,lockname):
        def _cb(result):
            stat,ret = result
            if stat == False and ret == 'Enoexist':
                self.client_linkmap.pop(link,None)

        with Auth.change_current_iden(self._idendesc):
            links = list(self.client_linkmap)
            for link in links:
                self._proxy.call_async(link + 'lockclient/',
                                       'sync_write_unlock',
                                       10000,
                                       _cb,
                                       lockname)
