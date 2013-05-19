#include<string.h>
#include<dirent.h>
#include<unistd.h>
#include<fcntl.h>
#include<limits.h>
#include<ftw.h>
#include<libtar.h>
#include<bzlib.h>
#include<sys/stat.h>
#include<sys/sendfile.h>
#include<map>
#include<vector>
#include<string>

#include"tool.h"

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

    printf("      %d\n",fd);
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

    printf("    %d\n",fd);
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

int tool_pack(char *pack_path,char *dir_path){
    tartype_t tar_type;
    TAR *tarp;
    char tpath[2] = {'.','\0'};

    tar_type.openfunc = pack_copenfn;
    tar_type.closefunc = pack_cclosefn;
    tar_type.readfunc = (readfunc_t)read;
    tar_type.writefunc = pack_cwritefn;
    tar_open(&tarp,pack_path,&tar_type,O_WRONLY | O_CREAT,0644,TAR_GNU);

    tar_append_tree(tarp,dir_path,tpath);
    tar_close(tarp);

    return 0;
}
int tool_unpack(char *pack_path,char *dir_path){
    tartype_t tar_type;
    TAR *tarp;

    tool_cleardir(dir_path);
    mkdir(dir_path,0775);

    tar_type.openfunc = pack_xopenfn;
    tar_type.closefunc = pack_xclosefn;
    tar_type.readfunc = pack_xreadfn;
    tar_type.writefunc = (writefunc_t)write;
    tar_open(&tarp,pack_path,&tar_type,O_RDONLY,0644,TAR_GNU);

    tar_extract_all(tarp,dir_path);
    tar_close(tarp);

    return 0;
}

static int cleardir_callback(const char *path,const struct stat *st,int flag,struct FTW *ftw_buf){
    if(ftw_buf->level == 0){
	return 0;
    }

    if(S_ISDIR(st->st_mode)){
	rmdir(path);
    }else{
	unlink(path);
    }
    return 0;
}
int tool_cleardir(char *path){
    nftw(path,cleardir_callback,64,FTW_DEPTH | FTW_PHYS);
    return 0;
}
static int copydir_travel(char *old_path,int old_len,char *new_path,int new_len){
    int i;
    int j;
    int len;

    DIR *dirp; 
    char *buf;
    dirent *entry;
    std::vector<std::string> wait_list;
    const char *tname;

    int infd;
    int outfd;
    struct stat st;

    if((dirp = opendir(old_path)) == NULL){
	return -1;
    }
    buf = new char[sizeof(dirent) + NAME_MAX + 1];

    while(true){
	readdir_r(dirp,(dirent*)buf,&entry);
	if(entry == NULL){
	    break;
	}
	if(strcmp(entry->d_name,".") == 0 || strcmp(entry->d_name,"..") == 0){
	    continue;
	}

	if(entry->d_type == DT_DIR){
	    wait_list.push_back(entry->d_name);
	}else{
	    old_path[old_len] = '/';
	    new_path[new_len] = '/';
	    len = strlen(entry->d_name);
	    for(i = 0;i <= len;i++){
		old_path[old_len + i + 1] = entry->d_name[i];
		new_path[new_len + i + 1] = entry->d_name[i];
	    }

	    infd = open(old_path,O_RDONLY);
	    outfd = open(new_path,O_WRONLY | O_CREAT,0644);
	    fstat(infd,&st);
	    sendfile(outfd,infd,NULL,st.st_size);
	    close(infd);
	    close(outfd);

	    old_path[old_len] = '\0';
	    new_path[new_len] = '\0';
	}
    }

    delete buf;
    closedir(dirp);

    while(!wait_list.empty()){
	tname = wait_list.back().c_str();
	wait_list.pop_back();

	old_path[old_len] = '/';
	new_path[new_len] = '/';
	len = strlen(tname);
	for(i = 0;i <= len;i++){
	    old_path[old_len + i + 1] = tname[i];
	    new_path[new_len + i + 1] = tname[i];
	}

	mkdir(new_path,0775);

	copydir_travel(old_path,old_len + len + 1,new_path,new_len + len + 1);

	old_path[old_len] = '\0';
	new_path[new_len] = '\0';
    }

    return 0;
}
int tool_copydir(char *old_path,char *new_path){
    char old_buf[PATH_MAX + 1];
    char new_buf[PATH_MAX + 1];

    tool_cleardir(new_path);
    mkdir(new_path,0775);

    old_buf[0] = '\0';
    strncat(old_buf,old_path,sizeof(old_buf));
    new_buf[0] = '\0';
    strncat(new_buf,new_path,sizeof(new_buf));

    copydir_travel(old_buf,strlen(old_buf),new_buf,strlen(new_buf));
    
    return 0;
}
