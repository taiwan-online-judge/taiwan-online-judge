#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<limits.h>
#include<unistd.h>
#include<fcntl.h>
#include<errno.h>

#include"judge_def.h"
#include"judgm_lib.h"
#include"jmod_test.h"
#include"jmod_test_check.h"

static int ansfd;
static judgm_hyperio *hyperio;
static int tty_idx;

int p[2];

DLL_PUBLIC int init(int judgk_modfd,char *datapath,char *runpath){
    char tpath[PATH_MAX + 1];
    char dstpath[PATH_MAX + 1];

    pipe(p);

    snprintf(tpath,sizeof(tpath),"%s/in",datapath);
    snprintf(dstpath,sizeof(dstpath),"%s/in",runpath);
    if(link(tpath,dstpath)){
	return -1;
    }
    snprintf(tpath,sizeof(tpath),"%s/ans",datapath);
    if((ansfd = open(tpath,O_RDONLY)) == -1){
	return -1;
    }

    //hyperio = new judgm_hyperio(judgk_modfd);
    //tty_idx = hyperio->tty_idx;

    return 0;
}
DLL_PUBLIC int run(int &status){
    int ret;

    char *inbuf;
    char *ansbuf;

    status = JUDGE_AC;
    inbuf = new char[65536];
    ansbuf = new char[65536];

    /*while((ret = read(ansfd,ansbuf,65536)) > 0){
	if(hyperio->compare(ansbuf,ret)){
	    status = JUDGE_WA;
	    break;
	}
    }
    if(status == JUDGE_AC && hyperio->wait() > 0){
	status = JUDGE_WA;
    }
	
    delete inbuf;
    delete ansbuf;
    close(ansfd);
    delete hyperio;*/

    close(p[1]);
    while((ret = read(p[0],inbuf,65536)) > 0){
	if(read(ansfd,ansbuf,ret) != ret){
	    status = JUDGE_WA;
	    break;
	}
	if(memcmp(ansbuf,inbuf,ret)){
	    status = JUDGE_WA;
	    break;
	}
    }
    if(status == JUDGE_AC && read(ansfd,ansbuf,1) > 0){
	status = JUDGE_WA;
    }

    return 0;
}
DLL_PUBLIC int proc(){
    int infd;
    int outfd;

    if((infd = open("in",O_RDONLY)) == -1){
	return -1;
    }
    /*if((outfd = judgm_hyperio::get_ttyfd(tty_idx)) == -1){
	return -1;
    }*/

    close(p[0]);
    outfd = p[1];
    dup2(infd,0);
    dup2(outfd,1);
    dup2(outfd,2);

    return 0;
}
DLL_PUBLIC int stop(){
    return 0;
}
