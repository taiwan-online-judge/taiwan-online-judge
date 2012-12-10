#include<stdio.h>
#include<stdlib.h>
#include<limits.h>
#include<fcntl.h>
#include<signal.h>
#include<pthread.h>
#include<semaphore.h>
#include<termios.h>

#include"judge_def.h"
#include"judgx.h"

struct check_thread_info{
    int status;
    sem_t *done_sem;
};

int mptd;
char ptname[PATH_MAX + 1];
int infd;
int ansfd;

DLL_PUBLIC int init(char *runpath,char *datapath){
    struct termios tes;
    char tpath[PATH_MAX + 1];
    char newpath[PATH_MAX + 1];

    printf("check1\n");

    mptd = posix_openpt(O_RDWR);
    grantpt(mptd);
    unlockpt(mptd);
    ptsname_r(mptd,ptname,sizeof(ptname));
    tcgetattr(mptd,&tes);
    cfmakeraw(&tes);
    tcsetattr(mptd,TCSANOW,&tes);

    snprintf(tpath,sizeof(tpath),"%s/in.txt",datapath);
    snprintf(newpath,sizeof(newpath),"%s/in.txt",runpath);
    if(link(tpath,newpath) == -1){
	unlink(newpath);
	link(tpath,newpath);
    }
    infd = open(tpath,O_RDONLY);
    snprintf(tpath,sizeof(tpath),"%s/ans.txt",datapath);
    ansfd = open(tpath,O_RDONLY);
    if(infd == -1 || ansfd == -1){
	goto error;
    }

    printf("check2\n");

    return 0;

error:

    close(mptd);
    close(infd);
    close(ansfd);

    return -1;
}

static void thread_clean(void *arg){
    close(mptd);
    close(infd);
    close(ansfd);
    return;
}
DLL_PUBLIC void* thread(void *arg){
    int ret;
    struct check_thread_info *thread_info;

    int flag;
    char outbuf[4096];
    char ansbuf[4096];

    pthread_cleanup_push(thread_clean,NULL);
    thread_info = (struct check_thread_info*)arg;

    flag = 0;
    while(1){
	if((ret = read(mptd,outbuf,4096)) <= 0){
	    if(read(ansfd,ansbuf,1) > 0){
		flag = 1;
		break;
	    }else{
		break;
	    }
	}
	if(read(ansfd,ansbuf,ret) != ret){
	    flag = 1;
	    break;
	}
	if(memcmp(ansbuf,outbuf,ret) != 0){
	    flag = 1;
	    break;
	}
    }

    if(flag == 0){
	thread_info->status = JUDGE_AC;
    }else{
	thread_info->status = JUDGE_WA;
    }

    pthread_cleanup_pop(thread_clean);
    sem_post(thread_info->done_sem);
    return NULL;
}
DLL_PUBLIC int stop(void){
    return 0;
}

DLL_PUBLIC int run(){
    int sptd;
    struct termios tes;

    sptd = open(ptname,O_RDWR);
    tcgetattr(sptd,&tes);
    cfmakeraw(&tes);
    tcsetattr(sptd,TCSANOW,&tes);

    dup2(infd,0);
    dup2(sptd,1);
    dup2(sptd,2);
    return 0;
}
