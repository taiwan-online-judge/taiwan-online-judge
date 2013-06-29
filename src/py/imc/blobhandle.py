#! /usr/bin/env python

from abc import abstractmethod

class BlobHandle:
    READ = 0x1
    WRITE = 0x2
    CREATE = 0x4
    DELETE = 0x8
    WRITEMETA = 0x10
    def __init__(self, name, info, flag, blobclient):
        self._name = name
        self._info = info
        self._flag = flag
        self._blobclient = blobclient
        self._location = self._blobclient._location
        self._is_closed = False
        self._deltag = False
        self._written = False
        self._createtag = False
        self._need_commit = False
        self._tmpfile = None
        self._blobpath = ''.join([self._location, self._name,
                                  '_', str(self.get_rev())])
        if flag & BlobHandle.CREATE:
            if not flag & BlobHandle.WRITE:
                raise Exception("invalid flag")
            else:
                self._need_commit = True
                self._createtag = True
                self._written = True
        if flag & BlobHandle.WRITE:
            self._tmpfile = self.gen_tmp()

    def __del__(self):
        self._del_tmp()
        self._blobclient.close(self)

    def create(self):
        self._create(self.location + self._name)
    
    def read(self, length, offset):
        if self._is_closed:
            raise Exception("This Blob is closed")
        if not self._flag & BlobHandle.READ:
            raise Exception("Permission Denied")
        return self._read(length, offset)

    def write(self, data, offset):
        if self._is_closed:
            raise Exception("This Blob is closed")
        if not self._flag & BlobHandle.WRITE:
            raise Exception("Permission Denied")
        self._need_commit = True
        written_bytes = self._write(data, offset)
        self._written = bool(written_bytes)
        self._info['size'] = self._get_size()
        return written_bytes

    def rename(self, newname):
        if self._is_closed:
            raise Exception("This Blob is closed")
        if not self._flag & BlobHandle.DELETE:
            raise Exception("Permission Denied")
        self._need_commit = True
        
    def delete(self, deltag=True):
        if self._is_closed:
            raise Exception("This Blob is closed")
        if not self._flag & BlobHandle.DELETE:
            raise Exception("Permission Denied")
        self._need_commit = True
        self._deltag = deltag

    def close(self):
        self._is_closed = True
        if self._flag != BlobHandle.READ:
            self._blobclient.close(self)

    def get_metadata(self):
        if self._is_closed:
            raise Exception("This Blob is closed")
        return self._info['metadata']

    def set_metadata(self, metadata):
        if self._is_closed:
            raise Exception("This Blob is closed")
        if not self._flag & BlobHandle.WRITEMETA:
            raise Exception("Permission Deniedd")
        self._info['metadata'] = metadata
        self._need_commit = True

    def get_rev(self):
        if self._is_closed:
            raise Exception("This Blob is closed")
        return self._info['rev']

    def get_container(self):
        if self._is_closed:
            raise Exception("This Blob is closed")
        return self._info['container']

    def get_size(self):
        if self._is_closed:
            raise Exception("This Blob is closed")
        return self._info['size']

    def commit(self, flag):
        if self._is_closed:
            raise Exception("This Blob is closed")
        if not self._need_commit:
            return False
        commit_info = dict()
        commit_info['blobname'] = self._name
        if self._deltag:
            commit_info['deltag'] = True
        else:
            commit_info['deltag'] = False
            commit_info['createtag'] = self._createtag
            commit_info['info'] = self._info
            commit_info['written'] = self._written
        return self._blobclient.commit(commit_info, flag, self)

    @abstractmethod
    def gen_tmp(self):
        # return tmp file path
        pass

    @abstractmethod
    def del_tmp(self):
        pass

    @abstractmethod
    def _read(self, length, offset):
        pass

    @abstractmethod
    def _write(self, data, offset):
        pass

    @abstractmethod
    def _get_size(self):
        pass

    @staticmethod
    @abstractmethod
    def del_blob(blobpath):
        pass
        

