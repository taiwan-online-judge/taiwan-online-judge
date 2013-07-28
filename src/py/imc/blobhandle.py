#! /usr/bin/env python

from abc import abstractmethod
import os

class BlobHandle:
    READ = 0x1
    WRITE = 0x2
    CREATE = 0x4
    DELETE = 0x8
    WRITEMETA = 0x10
    def __init__(self, info, flag, blobclient):
        self._info = info
        self._flag = flag
        self._blobclient = blobclient
        self._location = self._blobclient._location
        self._is_closed = False
        self._deltag = False
        self._createtag = False
        self._tmpfile = None
        if info['rev']:
            self._blobpath = os.path.join(self._location, self._info['rev'])
        else:
            self._blobpath = None
        if flag & BlobHandle.CREATE:
            self._createtag = True
        if flag & BlobHandle.WRITE:
            self._tmpfile = self.gen_tmp()

    def __del__(self):
        if self._flag & BlobHandle.WRITE:
            self.del_tmp()
        self.close()
    
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
        written_bytes = self._write(data, offset)
        self._info['size'] = self._get_size()
        return written_bytes

    def rename(self, newname):
        if self._is_closed:
            raise Exception("This Blob is closed")
        if not self._flag & BlobHandle.DELETE:
            raise Exception("Permission Denied")
        self._info['name'] = newname
        
    def delete(self, deltag=True):
        if self._is_closed:
            raise Exception("This Blob is closed")
        if not self._flag & BlobHandle.DELETE:
            raise Exception("Permission Denied")
        self._deltag = deltag

    def close(self):
        self._is_closed = True
        self._blobclient.close(self._info['rev'])

    def get_metadata(self):
        if self._is_closed:
            raise Exception("This Blob is closed")
        return self._info['metadata']

    def set_metadata(self, metadata):
        if self._is_closed:
            raise Exception("This Blob is closed")
        if not self._flag & BlobHandle.WRITEMETA:
            raise Exception("Permission Denied")
        self._info['metadata'] = metadata

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

    def get_sha1(self):
        if self._is_closed:
            raise Exception("This Blob is closed")
        return self._info['sha1']

    def commit(self, flag):
        if self._is_closed:
            raise Exception("This Blob is closed")
        self._info['sha1'] = self._sha1(self._tmpfile)
        commit_info = dict()
        commit_info['info'] = self._info
        commit_info['target'] = self._tmpfile
        if self._deltag:
            commit_info['deltag'] = True
            commit_info['createtag'] = False
        else:
            commit_info['deltag'] = False
            commit_info['createtag'] = self._createtag
        return self._blobclient.commit(commit_info, flag, self)

    def copy_tmp(self, rev):
        path = os.path.join(self._location, rev)
        return self.copy_file(self._tmpfile, path)

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
    def _sha1(file):
        # calculate the sha1 of file
        # return string
       pass

    @staticmethod
    @abstractmethod
    def copy_file(source, dest):
        # return Boolean
        pass

    @staticmethod
    @abstractmethod
    def del_blob(blobpath):
        pass
        
    @staticmethod
    @abstractmethod
    def file_exists(path):
        # return Boolean
        pass
