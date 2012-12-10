#define _XOPEN_SOURCE 500

#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<fcntl.h>
#include<dlfcn.h>
#include<limits.h>
#include<signal.h>
#include<ftw.h>
#include<sys/ioctl.h>
#include<sys/capability.h>
#include<sys/resource.h>
#include<sys/stat.h>

#include"judge_def.h"
#include"judgx.h"
#include"judgx_com.h"
#include"judgx_lib.h"

static __attribute__((constructor)) void judgx_init(){
    judgx_modfd = open("/dev/judgm",O_RDWR);
    return;
}
static __attribute__((destructor)) void judgx_exit(){
    close(judgx_modfd);
    return;
}

DLL_PUBLIC int judgx_ini_load(FILE *f,judgx_ini_handler handler,void *data){
    int i;
    int j;

    char *buf;
    int l;
    char *section;
    char *key;
    char *value;

    buf = malloc(1024);
    section = malloc(1024);
    key = malloc(1024);
    value = malloc(1024);

    while(fgets(buf,1024,f) != NULL){
	l = strlen(buf);
	if(buf[l - 1] == '\n'){
	    buf[l - 1] = '\0';
	}
	if(buf[0] == '\0'){
	    continue;
	}
	if(buf[0] == '['){
	    for(i = 1,j = 0;i < l && buf[i] != ']';i++,j++){
		section[j] = buf[i];
	    }
	    section[j] = '\0';
	}else{
	    for(i = 0,j = 0;i < l && buf[i] != '=';i++,j++){
		key[j] = buf[i];
	    }
	    key[j] = '\0';
	    for(i += 1,j = 0;i < l;i++,j++){
		value[j] = buf[i];
	    }
	    value[j] = '\0';
	    handler(data,section,key,value);
	}
    }

    free(buf);
    free(section);
    free(key);
    free(value);
    
    return 0;
}

DLL_PUBLIC int judgx_compile(char *cpppath,char *exepath,char *arg){
    int pid;
    int waitstatus;
    
    if((pid = fork()) == 0){
	char *argv[] = {"g++","-static","-O2",cpppath,"-lrt","-o",exepath,NULL};

	freopen("/dev/null","w",stdout);
	freopen("/dev/null","w",stderr);

	execvp("g++",argv);
    }
    waitpid(pid,&waitstatus,0);
    if(waitstatus != 0){
	return JUDGE_CE;
    }
    return 0;
}

DLL_PUBLIC struct judgx_proc_info* judgx_proc_create(char *runpath,char *exepath,unsigned long timelimit,unsigned long hardtimelimit,unsigned long memlimit){
    int ret;
    int i,j;

    struct stat st;
    struct judgx_proc_info *proc_info;

    if(stat(exepath,&st)){
	return NULL;
    }
    if(!S_ISREG(st.st_mode)){
	return NULL;
    }

    proc_info = malloc(sizeof(struct judgx_proc_info));
    if(proc_info == NULL){
	goto error;
    }

    proc_info->run_path[0] = '\0';
    strncat(proc_info->run_path,runpath,sizeof(proc_info->run_path));
    proc_info->exe_path[0] = '\0';
    strncat(proc_info->exe_path,exepath,sizeof(proc_info->exe_path));

    proc_info->exe_name[NAME_MAX] = '\0';
    for(i = 0,j = 0;proc_info->exe_path[i] != '\0' && j < NAME_MAX;i++){
	if(proc_info->exe_path[i] == '/'){
	    j = 0;
	}else{
	    proc_info->exe_name[j] = proc_info->exe_path[i];
	    j++;
	}
    }
    proc_info->status = JUDGE_ERR;
    proc_info->exe_name[j] = '\0';
    proc_info->pid = -1;
    proc_info->task = -1;
    proc_info->timelimit = timelimit;
    proc_info->hardtimelimit = hardtimelimit;
    proc_info->memlimit = memlimit;
    proc_info->runtime = 0L;
    proc_info->peakmem = 0L;

    return proc_info;

error:

    if(proc_info != NULL){
	free(proc_info);
    }

    return NULL;
}
static int proc_protect(struct judgx_proc_info *proc_info){
    cap_t caps;
    struct rlimit limit;
    struct judgx_com_proc_add com_proc_add;

    /*caps = cap_init();
    if(cap_set_file(proc_info->path,caps)){
	cap_free(caps);
	goto error;
    }
    cap_free(caps);*/

    limit.rlim_cur = 1;
    limit.rlim_max = limit.rlim_cur;
    prlimit(proc_info->pid,RLIMIT_NPROC,&limit,NULL);

    limit.rlim_cur = 8L;
    limit.rlim_max = limit.rlim_cur;
    prlimit(proc_info->pid,RLIMIT_NOFILE,&limit,NULL);

    /*limit.rlim_cur = (proc_info->timelimit) / 1000L * 2;
    limit.rlim_max = limit.rlim_cur;
    prlimit(proc_info->pid,RLIMIT_CPU,&limit,NULL);*/

    /*limit.rlim_cur = proc_info->memlimit * 1024L + 4096L * 128L;
    limit.rlim_max = limit.rlim_cur;
    prlimit(proc_info->pid,RLIMIT_AS,&limit,NULL);*/

    com_proc_add.run_path[0] = '\0';
    strncat(com_proc_add.run_path,proc_info->run_path,sizeof(com_proc_add.run_path));
    com_proc_add.pid = proc_info->pid;
    com_proc_add.timelimit = proc_info->timelimit * 1000L;
    com_proc_add.hardtimelimit = proc_info->hardtimelimit * 1000L;
    com_proc_add.memlimit = proc_info->memlimit * 1024L + 4096L * 128L;
    if(ioctl(judgx_modfd,IOCTL_PROC_ADD,&com_proc_add)){
	return -1;
    }
    proc_info->task = com_proc_add.task;

    return 0;
}
DLL_PUBLIC int judgx_proc_run(struct judgx_proc_info *proc_info,judgx_check_run_fn check_run){
    int ret;

    char abspath[PATH_MAX + 1];
    int waitstatus;
    struct judgx_com_proc_get com_proc_get;
        
    ret = 0;

    printf("proc1\n");

    realpath(proc_info->exe_path,abspath);
    if((proc_info->pid = fork()) == 0){
	char *argv[] = {NULL,NULL};
	char *envp[] = {NULL};

	chdir(proc_info->run_path);
	check_run();

	setgid(99);
	setuid(99);
	kill(getpid(),SIGSTOP);

	argv[0] = proc_info->exe_name;
	execve(abspath,argv,envp);
    }

    printf("proc2\n");

    if(proc_info->pid == -1){
	ret = -1;
	goto end;
    }
    waitpid(proc_info->pid,NULL,WUNTRACED);

    printf("proc3\n");

    if(proc_protect(proc_info)){
	kill(proc_info->pid,SIGKILL);
	ret = -1;
	goto end;
    }

    printf("proc4\n");

    kill(proc_info->pid,SIGCONT);
    if(waitpid(proc_info->pid,&waitstatus,0) == -1){
	ret = -1;
	goto end;
    }

    com_proc_get.task = proc_info->task;
    if(ioctl(judgx_modfd,IOCTL_PROC_GET,&com_proc_get)){
	ret = -1;
	goto end;
    }

    printf("proc5 %d\n",com_proc_get.status);

    proc_info->runtime = com_proc_get.runtime;
    proc_info->peakmem = com_proc_get.peakmem;

    if(com_proc_get.status != JUDGE_AC){
	proc_info->status = com_proc_get.status;
    }else if(proc_info->peakmem > (proc_info->memlimit * 1024L)){
	proc_info->status = JUDGE_MLE;
    }else if(proc_info->runtime > (proc_info->timelimit * 1000L)){
	proc_info->status = JUDGE_TLE;
    }else if(WIFEXITED(waitstatus) || (WIFSIGNALED(waitstatus) && WTERMSIG(waitstatus) == SIGKILL)){
	proc_info->status = JUDGE_AC;
    }else{
	proc_info->status = JUDGE_RE;
    }

end:

    printf("proc6\n");

    return ret;
}
DLL_PUBLIC int judgx_proc_kill(struct judgx_proc_info *proc_info){
    if(ioctl(judgx_modfd,IOCTL_PROC_KILL,proc_info->task)){
	return -1;
    }
    return 0;
}
DLL_PUBLIC int judgx_proc_free(struct judgx_proc_info *proc_info){
    if(proc_info->task != -1){
	if(ioctl(judgx_modfd,IOCTL_PROC_DEL,proc_info->task)){
	    return -1;
	}
    }

    free(proc_info);
    return 0;
}
