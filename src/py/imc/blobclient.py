#! /usr/bin/env python

import os
import uuid
from collections import Counter

from imc.auth import Auth
import imc.async
from imc.proxy import Proxy

class BlobClient:
    def __init__(self, proxy, auth, idendesc, link, serverlink,
            location, cachetable, BlobHandle):
        self._proxy = proxy
        self._auth = auth
        self._idendesc = idendesc
        self._link = link
        self._server = serverlink
        self._is_connected = False
        self._location = location
        self._cachetable = cachetable
        self.BlobHandle = BlobHandle
        self._opencounts = Counter()
        self._containers = dict()
        self._deltags = set()
        self.connect_server()
        self._proxy.register_call('blobclient/', 'get_update',
                                  self.get_update)
        self._proxy.register_call('blobclient/', 'get_request',
                                  self.get_request)
        
        self.clean()
##################debug code##########################
        print('blobclient: init')
        # self.show_status()

    def show_status(self):
        print('blobclient: containers=>\n', self._containers)
        print('blobclient: blobs=>\n', self._cachetable.get_blob_list())
        print('blobclient: opencounts=>\n', self._opencounts)
        print('blobclient: deltags=>\n', self._deltags)
######################################################

    def __del__(self):
        self._proxy.unregister_call('blobclient/', 'get_update')
        self._proxy.unregister_call('blobclient/', 'get_request')

    def _server_call(self, func, *args):
        if not self._is_connected:
            if not self.connect_server():
                pass
            
        server = self._server + 'blobserver/'
        with Auth.change_current_iden(self._idendesc):
            sta, ret = self._proxy.call(server, func, 10000,
                                        self._link, *args)
        if not sta:
            self._is_connected = False
        return (sta, ret)

    def _client_call(self, otherclient, func, *args):
        otherclient += 'blobclient/'
        with TOJAuth.change_current_iden(self._idendesc):
            sta, ret = self._proxy.call(otherclient, func, 10000,
                                        self._link, *args)
        return (sta, ret)

    def connect_server(self, serverlink=None):
        if serverlink:
            self._server = serverlink
        server = self._server + 'blobserver/'
        with Auth.change_current_iden(self._idendesc):
            sta, ret = self._proxy.call(server, 'connect_client', 10000,
                                        self._link)
        self._is_connected = sta
        if self._is_connected:
            # TODO:
            pass


    def open_container(self, container, method):
        sta, ret = self._server_call('open_container', container, method)
        if not sta:
            # TODO:
            # pend operation when client can't imc call server
            return 'Edisconnected'
        if ret:
            self._containers[container] = method
            return True
        else:
            return False

    def close_container(self, container):
        sta, ret = self._server_call('close_container', container)
        if not sta:
            # TODO:
            # pend operation when client can't imc call server
            return None
        if ret:
            del self._containers[container]
            return True
        else:
            return False

    # TODO:
    # periodically call this function to clean old data and do something else
    # ex: send pending operation
    def clean(self):
        del_list = list(self._deltags)
        for rev in del_list:
            self.del_real_blob(rev)
        del_list = []
        for blob, rev in (self._cachetable.get_blob_list().items()):
            if not self.blob_exists(rev):
                del_list.append(blob)
        for container, name in del_list:
            self.del_blob(container, name)
        # for container in self._containers:
            # if self._containers[container] == 'ALWAYS':
                # for blob in self._cachetable.get_blob_list(container):
                    # self.update(blob)

    @imc.async.caller
    def get_update(self, container, name):
        self.update(container, name)
        # pass

    def update(self, container, name, force=False):
        info = self._cachetable.get_blob_info(container, name)
        if info and not force and self.blob_exists(info['rev']):
            cacherev = info['rev']
            cachesha1 = info['sha1']
        else:
            cacherev = None
            cachesha1 = None
        sta, ret = self._server_call('check_blob', container, name,
                                     cacherev, cachesha1)

        if not sta:
            # TODO:
            # pend operation when client can't imc call server
            return 'Efailed'
        elif ret[0] == 'up_to_date':
            return info
        elif ret[0] == 'no_exist':
            self._cachetable.del_blob(container, name)
            if cacherev:
                self.del_real_blob(cacherev)
            return None
        else:
            filekey, info = ret
            if filekey:
                rst = self.recv_blob(filekey, info['rev']).wait()
            else:
                if self.copy_blob(cacherev, info['rev']):
                    rst = 'Success'
                else:
                    rst = None
            if 'Success' == rst:
                self.update_blob(info)
                return info
            else:
                return 'Efailed'

    def commit(self, commit_info, force_flag, blobhandle):
        sta, ret = self._server_call('recv_commit', commit_info, force_flag)
        if not sta:
            # TODO:
            # pend operation when client can't imc call server
            # local commit
            return False
        else:
            if ret:
                if ret['rev']:
                    if blobhandle.copy_tmp(ret['rev']):
                        self.update_blob(ret)
                        return True
                    else:
                        pass
                else:
                    self.del_blob(ret['container'], ret['name'])
                    return True
            else:
                return False

    def open(self, container, name, flag):
        if container not in self._containers:
            raise Exception("this container isn't open")
        if (flag & self.BlobHandle.CREATE and
            not flag & self.BlobHandle.WRITE):
            raise ValueError("invalid flag")
        info = self.update(container, name)
        info = 'Efailed'
        if info == 'Efailed':
            info = self._cachetable.get_blob_info(container, name)
        if info is None:
            if (not flag & self.BlobHandle.WRITE or 
                not flag & self.BlobHandle.CREATE):
                raise ValueError("the blob doesn't exist, so you must "
                                 "add a create flag")
            else:
                info = {'container': container,
                        'name': name,
                        'rev': None,
                        'sha1': None,
                        'metadata': '',
                        'size': None,
                        'commit_time': None}
        else:
            self._opencounts[info['rev']] += 1
        handle = self.BlobHandle(info, flag, self)
        return handle

    def close(self, rev):
        if self._opencounts[rev] > 0:
            self._opencounts[rev] -= 1

    # @imc.async.caller
    # def send_to_other(self, info, otherclient):
        # pass

    @imc.async.caller
    def get_request(self, target):
        result = self.send_blob(target)
        if result:
            return result.filekey
        else:
            return None

    # def request_blob(self, container, name):
        # sta, ret = self._server_call('get_request', container, name)
        # if not sta:
            # return False
        # else:
            # return ret

    def send_blob(self, blobpath, otherclient=None):
        try:
            if otherclient:
                ret = self._proxy.sendfile(otherclient, blobpath)
            else:
                ret = self._proxy.sendfile(self._server, blobpath)
        except ConnectionError:
            return 'Efailtosend'
        else:
            return ret

    def recv_blob(self, filekey, filename):
        blobpath = os.path.join(self._location, filename)
        return self._proxy.recvfile(filekey, blobpath)

    def update_blob(self, info):
        rev = self._cachetable.get_blob_info(info['container'],
                                             info['name'], 'rev')
        if rev:
            self.del_real_blob(rev)
        self._cachetable.update_blob(info)

    def del_blob(self, container, name):
        rev = self._cachetable.get_blob_info(container, name, 'rev')
        self._cachetable.del_blob(container, name)
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
