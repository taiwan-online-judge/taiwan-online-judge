#! /usr/bin/env python

from abc import abstractmethod

class BlobTable:
    @abstractmethod
    def __init__(self):
        pass

    # client
    # server
    @abstractmethod
    def get_blob_list(self, container=None):
        # return a dict {blobname:rev}
        # if container is not None , only return blobs in that container
        pass

    # client
    # server
    @abstractmethod
    def get_blob_info(self, blobname, attr=None):
        # if the blobname doesn't exist, return None
        if attr is None:
            # return blob info
            pass
        else:
            # return specific attribute
            pass

    # server
    @abstractmethod
    def create_container(self, container):
        pass

    # server
    @abstractmethod
    def del_container(self, container):
        pass
    
    # server
    @abstractmethod
    def get_container_list(self):
        # return a set of container
        pass

    # client
    # server
    @abstractmethod
    def update_blob(self, blobname, info):
        pass

    # client
    # server
    @abstractmethod
    def del_blob(self, blobname):
        pass

"""
info:
    rev (int)
    container (str)
    metadata (str)
    size (???)
    commit_time (???)
"""
