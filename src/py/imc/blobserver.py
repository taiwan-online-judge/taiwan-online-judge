#! /usr/bin/env python

import os

from imc.auth import Auth
import imc.async
from imc.proxy import Proxy

from collections import Counter

class BlobServer:
    def __init__(self, proxy, auth, idendesc, link,
            location, blobtable, BlobHandle):

        self._proxy = proxy
        self._auth = auth
        self._idendesc = idendesc
        self._link = link
        self._location = location
        self._blobtable = blobtable
        self.BlobHandle = BlobHandle
        self._clients = {}
        self._containers = dict.fromkeys(self._blobtable.get_container_list(),
                                         dict())
        self._proxy.register_call('blobserver/', 'connect_client',
                                  self.connect_client)
        self._proxy.register_call('blobserver/', 'open_container',
                                  self.open_container)
        self._proxy.register_call('blobserver/', 'close_container',
                                  self.close_container)
        self._proxy.register_call('blobserver/', 'check_blob',
                                  self.check_blob)
        self._proxy.register_call('blobserver/', 'recv_update_result',
                                  self.recv_update_result)
        self._proxy.register_call('blobserver/', 'recv_commit',
                                  self.recv_commit)

    def __del__(self):
        self._proxy.unregister_call('blobserver/', 'connect_client')
        self._proxy.unregister_call('blobserver/', 'open_container')
        self._proxy.unregister_call('blobserver/', 'close_container')
        self._proxy.unregister_call('blobserver/', 'check_blob')
        self._proxy.unregister_call('blobserver/', 'recv_update_result')
        self._proxy.unregister_call('blobserver/', 'recv_commit')
        
    def _client_call(self, client, func, timeout=10000, *args):
        client += 'blobclient/'
        with Auth.change_current_iden(self._idendesc):
            for i in range(5):
                sta, ret = self._proxy.call(client, func, timeout, *args)
                if sta or (not sta and ret == 'Enoexist'):
                    break
        return (sta, ret)

    def _client_call_async(self, client, func, callback, 
                           timeout=10000, *args, **kwargs):
        client += 'blobclient/'
        with Auth.change_current_iden(self._idendesc):
            for i in range(5):
                sta, ret = self._proxy.call_async(client, func, timeout,
                                                  callback, *args)
                if sta or (not sta and ret == 'Enoexist'):
                    break
        return (sta, ret)

    @imc.async.caller
    def connect_client(self, client, cache_list):
        if client not in self._clients:
            self._clients.update({client: cache_list})
        else:
            self._clients[client] = cache_list

    def disconnect_client(self, client):
        try:
            self._clients.pop[client]
        except ValueError:
            raise Exception("this client doesn't exist")

    def create_container(self, container):
        self._blobtable.create_container(container)
        self._containers[container] = dict()

    def del_container(self, container):
        try:
            self._blobtable.del_container(container)
            del self._containers[container]
        except:
            raise

    @imc.async.caller
    def open_container(self, client, container, method):
        try:
            self._containers[container][client] = method
        except KeyError:
            return False
        else:
            return True

    @imc.async.caller
    def close_container(self, client, container):
        try:
            self._containers[container].pop(client)
        except KeyError:
            raise

    def update_blob(self, blobname, info):
        self._blobtable.update_blob(blobname, info)

    def del_blob(self, blobname):
        rev = self._blobtable.get_blob_info(blobname, 'rev')
        blobname_rev = ''.join([blobname, '_', str(rev)])
        self._blobtable.del_blob(blobname)
        self.del_real_blob(blobname_rev)

    def del_real_blob(self, blobname_rev):
        blobpath = self._location + blobname_rev
        self.BlobHandle.del_blob(blobpath)

    def send_blob(self, client, blobname):
        rev = str(self._blobtable.get_blob_info(blobname, 'rev'))
        blobpath = os.path.join(self._location, blobname + '_' + rev)
        return self._proxy.sendfile(client, blobpath)

    def recv_blob(self, filekey, blobname, rev):
        blobpath = os.path.join(self._location, blobname +  '_' + str(rev))
        ret =  self._proxy.recvfile(filekey, blobpath)

        return ret

    @imc.async.caller
    def check_blob(self, client, blobname, cacherev):
        rev = self._blobtable.get_blob_info(blobname, 'rev')
        if rev is None:
            return 'no_exist'
        elif cacherev < rev:
            result = self.send_blob(client, blobname)
            response = {'filekey': result.filekey,
                        'info': self._blobtable.get_blob_info(blobname)}
            return response
        else:
            return 'up_to_date'

    @imc.async.caller
    def recv_update_result(self, client, blobname, result,
                           cacherev, retry=False):
        if client not in self._clients:
            return None
        else:
            if result == 'Success':
                self._clients[client].append({blobname: cacherev})
                return 'Success'
            elif retry:
                result = self.send_blob(client, blobname)
                response = {'filekey': result.filekey,
                            'info': self._blobtable.get_blob_info(blobname)}
                return response
            else:
                return 'Finish'

    def send_update(self, clients, blobname, info, written):
        result_table = dict.fromkeys(clients)
        def recv_result(result):
            nonlocal result_table
            nonlocal blobname
            nonlocal info
            sta, client = result
            # TODO:
            # limit retry
            if not sta:
                self._client_call_async(client, 'get_update',
                                        recv_result,
                                        blobname, info, 
                                        result_table[client].filekey)
            else:
                if result_table[client] is None:
                    result_table.pop(client)
                elif result_table[client].wait() != 'Success':
                    result_table[client] = self.send_blob(client, blobname)
                    self._client_call_async(client, 'get_update',
                                            recv_result,
                                            blobname, info, 
                                            result_table[client].filekey)
                else:
                    result_table.pop(client)

        for client in clients:
            if written:
                result_table[client] = self.send_blob(client, blobname)
            else:
                result_table[client] = None
            sta, ret = self._client_call(client, 'get_update',
                                         recv_result,
                                         blobname, info, 
                                         result_table[client].filekey)
            if not sta:
                # TODO:
                pass

    @imc.async.caller
    def recv_commit(self, client, commit_info, force_flag, filekey=None):
        blobname = commit_info['blobname']
        info = commit_info['info']
        rev = self._blobtable.get_blob_info(blobname, 'rev')
        if rev is None:
            if commit_info['createtag']:
                rev = 0
            else:
                return False
        elif info['rev'] < rev and not force_flag:
            return False

        if commit_info['deltag']:
            self.del_blob(blobname)
            clients = set()
            for needed_client, method in (
                self._containers[info['container']].items()
            ):
                if method == "ACTIVE":
                    clients.add(needed_client)
            clients.discard(client)
            self.send_update(clients, blobname, None, False)
            result = True
        else:
            info['rev'] = rev + 1
            if commit_info['written']:
                status = self.recv_blob(filekey, blobname, rev + 1)
                result = status.wait()
                if rev:
                    self.del_real_blob(''.join([blobname, '_', str(rev)]))
            else:
                result = True
        if result:
            self.update_blob(blobname, info)
            clients = set()
            for needed_client, method in (
                self._containers[info['container']].items()):
                if method == "ACTIVE":
                    clients.add(needed_client)
            clients.discard(client)
            self.send_update(clients, blobname, 
                             info, commit_info['written'])

            return True
        else:
            return False



################### Testing Code #######################
'''
if __name__ == '__main__':
    global blob_serv

    blob_serv = BlobServer()
    blob_serv.listen(5730)

    #http_serv = tornado.httpserver.HTTPServer(tornado.web.Application([
    #    ('/conn',WebConnHandler),
    #]))
    #http_serv.listen(83)

    tornado.ioloop.IOLoop.instance().start()
'''
