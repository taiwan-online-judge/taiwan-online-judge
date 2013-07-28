#! /usr/bin/env python

import os
import uuid
from collections import Counter

from imc.auth import Auth
import imc.async
from imc.proxy import Proxy

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
        self._clients = set()
        self._opencounts = Counter()
        self._deltags = set()
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
        self._proxy.register_call('blobserver/', 'recv_commit',
                                  self.recv_commit)

        self.clean()
##################debug code##########################
        print('blobserver: init')
        self.show_status()

    def show_status(self):
        print('blobserver: containers =>\n', self._containers)
        print('blobserver: blobs =>\n', self._blobtable.get_blob_list())
######################################################

    def __del__(self):
        self._proxy.unregister_call('blobserver/', 'connect_client')
        self._proxy.unregister_call('blobserver/', 'open_container')
        self._proxy.unregister_call('blobserver/', 'close_container')
        self._proxy.unregister_call('blobserver/', 'check_blob')
        self._proxy.unregister_call('blobserver/', 'recv_commit')
        
    def _client_call(self, client, func, *args, timeout=10000):
        client += 'blobclient/'
        with Auth.change_current_iden(self._idendesc):
            sta, ret = self._proxy.call(client, func, timeout, *args)
        if not sta:
            self.disconnect_client(client)
        return (sta, ret)

    def _client_call_async(self, client, func, callback, 
                           *args, timeout=10000):
        client += 'blobclient/'
        with Auth.change_current_iden(self._idendesc):
            self._proxy.call_async(client, func, timeout, callback, *args)

    @imc.async.caller
    def connect_client(self, client):
        if client not in self._clients:
            self._clients.add(client)

    def disconnect_client(self, client):
        try:
            self._clients.remove(client)
        except KeyError:
            print("client", client, "doesn't exist")

    def create_container(self, container):
        if container not in self._containers:
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
            return False
        else:
            return True

    def clean(self):
        del_list = list(self._deltags)
        for rev in del_list:
            self.del_real_blob(rev)
        del_list = []
        for blob, rev in (self._blobtable.get_blob_list().items()):
            if not self.blob_exists(rev):
                del_list.append(blob)
        for container, name in del_list:
            self.del_blob(container, name)


    @imc.async.caller
    def check_blob(self, client, container, name, cacherev, cachesha1):
        info = self._blobtable.get_blob_info(container, name)
        if info is None:
            return ('no_exist', None)
        elif cacherev != info['rev']:
            if cachesha1 != info['sha1']:
                result = self.send_blob(container, name, client)
                return (result.filekey, info)
            else:
                return (None, info)
        else:
            return ('up_to_date', None)

    def get_update_list(self, container):
        clients = set()
        for client, method in (self._containers[container].items()):
            if method == "ACTIVE":
                clients.add(client)
        return clients

    def send_update(self, client, container, name):
        def recv_result(result):
            nonlocal client
            nonlocal container
            nonlocal name
            sta, ret = result
            # TODO:
            # limit retry
            if not sta:
                # self._client_call_async(client, 'get_update',
                                        # recv_result, container, name)
                self.disconnect_client(client)
                self._containers[container].pop(client)

        self._client_call_async(client, 'get_update',
                                recv_result, container, name)

    @imc.async.caller
    def recv_commit(self, client, commit_info, force_flag):
        clientinfo = commit_info['info']
        container = clientinfo['container']
        name = clientinfo['name']
        info = self._blobtable.get_blob_info(container, name)
        if info is None:
            if not commit_info['createtag']:
##################debug code##########################
                print("blob doesn't exist, please add createtag")
##################debug code##########################
                return False
        elif info['rev'] != clientinfo['rev'] and not force_flag:
##################debug code##########################
            print("revision conflict")
##################debug code##########################
            return False

        if commit_info['deltag']:
            clientinfo['rev'] = None
            self.del_blob(container, name)
            return clientinfo
        else:
            clientinfo['rev'] = str(uuid.uuid4())
            if not info or info['sha1'] != clientinfo['sha1']:
                filekey = self.request_blob(client, commit_info['target'])
                if (filekey == 'Efailtosend' or
                    filekey == 'Edisconnected'):
                    return False
            else:
                filekey = None
            if filekey:
                status = self.recv_blob(filekey, clientinfo['rev'])
                result = status.wait()
            else:
                if info:
                    result = self.copy_blob(info['rev'], clientinfo['rev'])
                else:
                    result = False
            if result:
                if clientinfo['rev']:
                    self.update_blob(clientinfo)
                    if info:
                        self.del_real_blob(info['rev'])
                clients = self.get_update_list(container)
                clients.discard(client)
                for cli in clients:
                   self.send_update(cli, container, name)
                return clientinfo
            else:
                return False

    # @imc.async.caller
    # def get_request(self, client, container, name):
        # result = self.send_blob(client, container, name)
        # if result:
            # return result.filekey
        # else:
            # return None

    def request_blob(self, client, target):
        sta, ret = self._client_call(client, 'get_request', target)
        if not sta:
            return 'Edisconnected'
        else:
            return ret

    def send_blob(self, container, name, client):
        rev = self._blobtable.get_blob_info(container, name, 'rev')
        if not rev:
            return False
        else:
            def send_finish(result):
                nonlocal rev
                if self._opencounts[rev] > 0:
                    self._opencounts[rev] -= 1

            blobpath = os.path.join(self._location, rev)
            try:
                ret = self._proxy.sendfile(client, blobpath)
            except ConnectionError:
                return False
            else:
                self._opencounts[rev] += 1
                ret.wait_async(send_finish)
                return ret

    def recv_blob(self, filekey, filename):
        blobpath = os.path.join(self._location, filename)
        return self._proxy.recvfile(filekey, blobpath)

    def update_blob(self, info):
        self._blobtable.update_blob(info)

    def del_blob(self, container, name):
        rev = self._blobtable.get_blob_info(container, name, 'rev')
        self._blobtable.del_blob(container, name)
        if rev:
            self.del_real_blob(rev)

    def del_real_blob(self, rev):
        self._deltags.add(rev)
        if self._opencounts[rev] == 0:
            self._deltags.remove(rev)
            path = os.path.join(self._location, rev)
            self.BlobHandle.del_blob(path)

    def copy_blob(self, rev, newrev):
        path = os.path.join(self._location, rev)
        newpath = os.path.join(self._location, newrev)
        return self.BlobHandle.copy_file(path, newpath)

    def vertify_blob(self, rev, sha1):
        blobpath = os.path.join(self._location, rev)
        return self.BlobHandle._sha1(blobpath) == sha1

    def blob_exists(self, rev):
        return self.BlobHandle.file_exists(os.path.join(self._location, rev))
