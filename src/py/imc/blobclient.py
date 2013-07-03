#! /usr/bin/env python

import os

from imc.auth import Auth
import imc.async
from imc.proxy import Proxy

from collections import Counter

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

    def __del__(self):
        self._proxy.unregister_call('blobclient/', 'get_update')

    def _server_call(self, func, *args):
        server = self._server + 'blobserver/'
        with Auth.change_current_iden(self._idendesc):
            for i in range(5):
                sta, ret = self._proxy.call(server, func, 10000,
                                            self._link, *args)
                if sta or (not sta and ret == 'Enoexist'):
                    break
        return (sta, ret)

    def _client_call(self, otherclient, func, *args):
        otherclient += 'blobclient/'
        with TOJAuth.change_current_iden(self._idendesc):
            for i in range(5):
                sta, ret = self._proxy.call(otherclient, func, 10000,
                                            self._link, *args)
                if sta or (not sta and ret == 'Enoexist'):
                    break
        return (sta, ret)

    def connect_server(self, serverlink=None):
        if serverlink:
            self._server = serverlink
        sta, ret = self._server_call('connect_client',
                                     self._cachetable.get_blob_list())
        if sta:
            if ret:
                self._is_connected = True
            else:
                pass
        else:
            pass
        if self._is_connected:
            # TODO:
            pass


    def open_container(self, container, method):
        sta, ret = self._server_call('open_container', container, method)
        if not sta:
            # TODO:
            # pend operation when client can't imc call server
            return None
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
    def sync(self):
        for blobname_rev in self._deltags:
            self.del_real_blob(blobname_rev)
        # for container in self._containers:
            # if self._containers[container] == 'ALWAYS':
                # for blob in self._cachetable.get_blob_list(container):
                    # self.update(blob)

    @imc.async.caller
    def get_update(self, blobname, info, filekey=None):
        if info is None:
            self.del_blob(blobname)
        elif filekey is not None:
            rev = info['rev']
            if self.recv_blob(filekey, blobname, rev).wait() == 'Success':
                self.update_blob(blobname, info)
                sta, ret = self._server_call('recv_update_result',
                                             blobname, "Success", rev)
                if not sta:
                    # TODO:
                    pass
        else:
            self.update_blob(blobname, info)
        return self._link

    def update(self, blobname):
        cacherev = self._cachetable.get_blob_info(blobname, 'rev')
        if cacherev == None:
            cacherev = 0

        sta, ret = self._server_call('check_blob', blobname, cacherev)

        if not sta:
            # TODO:
            # pend operation when client can't imc call server
            pass
        elif ret == 'up_to_date':
            pass
        elif ret == 'no_exist':
            self._cachetable.del_blob(blobname)
            if cacherev:
                self.del_real_blob(''.join([blobname, '_', str(cacherev)]))
        else:
            info = ret['info']
            rev = info['rev']
            for i in range(4):
                rst = self.recv_blob(ret['filekey'], blobname, rev).wait()
                sta, ret = self._server_call('recv_update_result', blobname, 
                                             rst, rev, True)

                if 'Success' == ret:
                    self.update_blob(blobname, info)
                    break

    def commit(self, commit_info, force_flag, blobhandle):
        filekey = None
        if not commit_info['deltag'] and commit_info['written']:
            result = self.send_blob(blobhandle._tmpfile)
            filekey = result.filekey
        sta, ret = self._server_call('recv_commit', commit_info,
                                     force_flag, filekey)
        if not sta:
            # TODO:
            # pend operation when client can't imc call server
            return False
        else:
            # TODO:
            # if commit success , copy tmpfile to location
            if ret:
                blobhandle.copy_tmp()

    # TODO:
    # opencounts ?
    def send_blob(self, blobpath, otherclient=None):
        if otherclient is None:
            return self._proxy.sendfile(self._server, blobpath)
        else:
            return self._proxy.sendfile(otherclient, blobpath)

    def recv_blob(self, filekey, blobname, rev):
        blobpath = os.path.join(self._location, blobname +  '_' + str(rev))
        return self._proxy.recvfile(filekey, blobpath)

    def update_blob(self, blobname, info):
        rev = self._cachetable.get_blob_info(blobname, 'rev')
        blobname_rev = ''.join([blobname, '_', str(rev)])
        self.del_real_blob(blobname_rev)
        self._cachetable.update_blob(blobname, info)

    def del_blob(self, blobname):
        rev = self._cachetable.get_blob_info(blobname, 'rev')
        blobname_rev = ''.join([blobname, '_', str(rev)])
        self._cachetable.del_blob(blobname)
        self.del_real_blob(blobname_rev)

    def del_real_blob(self, blobname_rev):
        if self._opencounts[blobname_rev] == 0:
            path = os.path.join(self._location, blobname_rev)
            self.BlobHandle.del_blob(path)
        else:
            self._deltags.add(blobname_rev)

    def open(self, container, blobname, flag):
        if container not in self._containers:
            raise Exception("this container isn't open")
        blob = ''.join([container, '_', blobname])
        self.update(blob)
        info = self._cachetable.get_blob_info(blob)
        if info is None:
            if (not flag & self.BlobHandle.WRITE or 
                not flag & self.BlobHandle.CREATE):
                raise ValueError("the blob doesn't exist, so you must "
                                 "add a create flag")
            else:
                info = {'container': container,
                        'rev': 0,
                        'metadata': '',
                        'size': None,
                        'commit_time': None}
        try:
            handle = self.BlobHandle(blob, info, flag, self)
        except ValueError:
            raise
        else:
            blob = ''.join(blob, '_', str(handle.get_rev()))
            self._opencounts[blob] += 1
            return handle

    def close(self, blobhandle):
        blob = ''.join([blobhandle._name, '_',
                        str(blobhandle.get_rev())])
        self._opencounts[blob] -= 1

