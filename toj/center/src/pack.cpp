#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<unistd.h>
#include<fcntl.h>
#include<libtar.h>
#include<bzlib.h>
#include<map>

#include"pack.h"

static int pack_copenfn(const char *pathname,int flags,...){
    int fd;
    pack_bzinfo *bzinfo;

    if((fd = open(pathname,flags,0644)) == -1){
	return -1;
    }

    bzinfo = new pack_bzinfo;
    bzinfo->len = 0;
    bzinfo->off = 0;
    bzinfo->endflag = false;
    bzinfo->bzs.bzalloc = NULL;
    bzinfo->bzs.bzfree = NULL;
    bzinfo->bzs.opaque = NULL;
    BZ2_bzCompressInit(&bzinfo->bzs,9,0,0);

    pack_fdmap.insert(std::pair<int,pack_bzinfo*>(fd,bzinfo));

    return fd;
}
static int pack_cclosefn(long fd){
    int ret;
    pack_bzinfo *bzinfo;

    bzinfo = pack_fdmap.find(fd)->second;
    pack_fdmap.erase(fd);

    bzinfo->bzs.next_in = NULL;
    bzinfo->bzs.avail_in = 0;
    while(true){
	bzinfo->bzs.next_out = bzinfo->buf;
	bzinfo->bzs.avail_out = PACK_BUFSIZE;
	ret = BZ2_bzCompress(&bzinfo->bzs,BZ_FINISH);

	if(bzinfo->bzs.avail_out != PACK_BUFSIZE){
	    write(fd,bzinfo->buf,PACK_BUFSIZE - bzinfo->bzs.avail_out);
	}
	if(ret == BZ_STREAM_END){
	    break;
	}
    }

    BZ2_bzCompressEnd(&bzinfo->bzs);
    delete bzinfo;
    return close(fd);
}
static ssize_t pack_cwritefn(long fd,const void *buf,size_t count){
    pack_bzinfo *bzinfo;

    bzinfo = pack_fdmap.find(fd)->second;

    bzinfo->bzs.next_in = (char*)buf;
    bzinfo->bzs.avail_in = count;
    while(bzinfo->bzs.avail_in > 0){
	bzinfo->bzs.next_out = bzinfo->buf;
	bzinfo->bzs.avail_out = PACK_BUFSIZE;
	BZ2_bzCompress(&bzinfo->bzs,BZ_RUN);
	if(bzinfo->bzs.avail_out != PACK_BUFSIZE){
	    write(fd,bzinfo->buf,PACK_BUFSIZE - bzinfo->bzs.avail_out);
	}
    }

    return count;
}
static int pack_xopenfn(const char *pathname,int flags,...){
    int fd;
    pack_bzinfo *bzinfo;

    if((fd = open(pathname,flags)) == -1){
	return -1;
    }

    bzinfo = new pack_bzinfo;
    bzinfo->len = 0;
    bzinfo->off = 0;
    bzinfo->endflag = false;
    bzinfo->bzs.bzalloc = NULL;
    bzinfo->bzs.bzfree = NULL;
    bzinfo->bzs.opaque = NULL;
    BZ2_bzDecompressInit(&bzinfo->bzs,0,0);

    pack_fdmap.insert(std::pair<int,pack_bzinfo*>(fd,bzinfo));

    return fd;
}
static int pack_xclosefn(long fd){
    int ret;
    pack_bzinfo *bzinfo;

    bzinfo = pack_fdmap.find(fd)->second;
    pack_fdmap.erase(fd);
    BZ2_bzDecompressEnd(&bzinfo->bzs);
    delete bzinfo;

    return close(fd);
}
static ssize_t pack_xreadfn(long fd,void *buf,size_t count){
    int ret;
    pack_bzinfo *bzinfo;

    bzinfo = pack_fdmap.find(fd)->second;

    bzinfo->bzs.next_out = (char*)buf;
    bzinfo->bzs.avail_out = count;
    while(bzinfo->endflag == false){
	if(bzinfo->len == 0){
	    ret = read(fd,bzinfo->buf,PACK_BUFSIZE);
	    bzinfo->len = ret;
	    bzinfo->off = 0;
	}
	if(bzinfo->len == 0){
	    break;
	}

	bzinfo->bzs.next_in = bzinfo->buf + bzinfo->off;
	bzinfo->bzs.avail_in = bzinfo->len;
	while(bzinfo->bzs.avail_in > 0 && bzinfo->bzs.avail_out > 0){
	    if(BZ2_bzDecompress(&bzinfo->bzs) != BZ_OK){
		bzinfo->endflag = true;
		break;
	    }
	}
	bzinfo->off += bzinfo->len - bzinfo->bzs.avail_in;
	bzinfo->len = bzinfo->bzs.avail_in;

	if(bzinfo->bzs.avail_out == 0){
	    break;
	}
    }

    return count - bzinfo->bzs.avail_out;
}

int pack_pack(char *packpath,char *dirpath){
    tartype_t tartype;
    TAR *tarp;

    tartype.openfunc = pack_copenfn;
    tartype.closefunc = pack_cclosefn;
    tartype.readfunc = (readfunc_t)read;
    tartype.writefunc = pack_cwritefn;
    tar_open(&tarp,packpath,&tartype,O_WRONLY | O_CREAT,0644,TAR_GNU);

    tar_append_tree(tarp,dirpath,".");
    tar_close(tarp);

    return 0;
}
int pack_unpack(char *packpath,char *dirpath){
    tartype_t tartype;
    TAR *tarp;

    tartype.openfunc = pack_xopenfn;
    tartype.closefunc = pack_xclosefn;
    tartype.readfunc = pack_xreadfn;
    tartype.writefunc = (writefunc_t)write;
    tar_open(&tarp,packpath,&tartype,O_RDONLY,0644,TAR_GNU);

    tar_extract_all(tarp,dirpath);
    tar_close(tarp);

    return 0;
}
