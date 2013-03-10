#include<string.h>
#include<limits.h>
#include<unistd.h>
#include<signal.h>
#include<limits.h>
#include<errno.h>
#include<pthread.h>
#include<semaphore.h>
#include<fcntl.h>
#include<sys/ioctl.h>
#include<sys/resource.h>
#include<sys/stat.h>
#include<sys/types.h>
#include<sys/wait.h>
#include<sys/mman.h>
#include<map>
#include<utility>

#include"judgk_com.h"

typedef int (*judgm_proc_check_fn)();

class judgm_proc{
private:
    int init(){
	int i;
	int j;
	struct stat st;

	if(stat(exe_path,&st)){
	    return -1;
	}
	if(!S_ISREG(st.st_mode)){
	    return -1;
	}

	exe_name[NAME_MAX] = '\0';
	for(i = 0,j = 0;exe_path[i] != '\0' && j < NAME_MAX;i++){
	    if(exe_path[i] == '/'){
		j = 0;
	    }else{
		exe_name[j] = exe_path[i];
		j++;
	    }
	}
	exe_name[j] = '\0';

	pid = 0;
	kern_task = 0;
	status = JUDGE_WAIT;
	runtime = 0;
	memory = 0;

	return 0;
    }
    int protect(){
	rlimit limit;
	judgk_com_proc_add com_proc_add;

	limit.rlim_cur = 1;
	limit.rlim_max = limit.rlim_cur;
	prlimit(pid,RLIMIT_NPROC,&limit,NULL);

	limit.rlim_cur = 8L;
	limit.rlim_max = limit.rlim_cur;
	prlimit(pid,RLIMIT_NOFILE,&limit,NULL);

	com_proc_add.run_path[0] = '\0';
	strncat(com_proc_add.run_path,run_path,sizeof(com_proc_add.run_path));
	com_proc_add.pid = pid;
	com_proc_add.timelimit = timelimit * 1000L;
	com_proc_add.hardtimelimit = hardtimelimit * 1000L;
	com_proc_add.memlimit = memlimit * 1024L + 4096L * 128L;
	if(ioctl(judgk_modfd,IOCTL_PROC_ADD,&com_proc_add)){
	    return -1;
	}
	kern_task = com_proc_add.kern_task;

	return 0;
    }

public:
    int judgk_modfd;
    char run_path[PATH_MAX + 1];
    char exe_path[PATH_MAX + 1];
    char exe_name[NAME_MAX + 1];
    unsigned long timelimit;
    unsigned long hardtimelimit;
    unsigned long memlimit;
    judgm_proc_check_fn check_fn;

    pid_t pid;
    unsigned long kern_task;
    int status;
    unsigned long runtime;
    unsigned long memory;

    judgm_proc(int judgk_modfd,char *runpath,char *exe_path,unsigned long timelimit,unsigned long hardtimelimit,unsigned long memlimit,judgm_proc_check_fn check_fn){
	this->judgk_modfd = judgk_modfd;
	this->run_path[0] = '\0';
	strncat(this->run_path,runpath,sizeof(this->run_path));
	this->exe_path[0] = '\0';
	strncat(this->exe_path,exe_path,sizeof(this->exe_path));

	this->timelimit = timelimit;
	this->hardtimelimit = hardtimelimit;
	this->memlimit = memlimit;
	this->check_fn = check_fn;
    }
    
    int proc_run(){
	char abspath[PATH_MAX + 1];

	if(init()){
	    return -1;
	}

	realpath(exe_path,abspath);
	if((pid = fork()) == 0){
	    char *argv[] = {NULL,NULL};
	    char *envp[] = {NULL};

	    chdir(run_path);
	    check_fn();

	    setgid(99);
	    setuid(99);
	    kill(getpid(),SIGSTOP);
	    
	    argv[0] = exe_name;
	    execve(abspath,argv,envp);
	    exit(0);
	}

	if(pid == -1){
	    return -1;
	}
	waitpid(pid,NULL,WUNTRACED);

	if(protect()){
	    kill(pid,SIGKILL);
	    return -1;
	}
	status = JUDGE_RUN;
	kill(pid,SIGCONT);
	
	return 0;
    }
    int proc_wait(bool blockflag){
	int wstatus;
	struct judgk_com_proc_get com_proc_get;

	if(blockflag == true){
	    if(waitpid(pid,&wstatus,WUNTRACED) == -1){
		return -1;
	    }
	}else{
	    if(waitpid(pid,&wstatus,WUNTRACED | WNOHANG) <= 0){
		return -1;
	    }
	}

	com_proc_get.kern_task = kern_task;
	if(ioctl(judgk_modfd,IOCTL_PROC_GET,&com_proc_get)){
	    return -1;
	}

	runtime = com_proc_get.runtime / 1000L;
	memory = com_proc_get.memory;

	printf("runtime:%lu memory:%lu\n",runtime,memory);

	if(com_proc_get.status != JUDGE_AC){
	    status = com_proc_get.status;
	}else if(memory > (memlimit * 1024L)){
	    status = JUDGE_MLE;
	}else if(runtime > timelimit){
	    status = JUDGE_TLE;
	}else if(WIFEXITED(wstatus) || (WIFSIGNALED(wstatus) && WTERMSIG(wstatus) == SIGKILL)){
	    status = JUDGE_AC;
	}else{
	    status = JUDGE_RE;
	}

	return 0;
    }
    int proc_kill(){
	if(kill(pid,SIGKILL)){
	    return -1;
	}
	return 0;
    }
};

class judgm_hyperio{
private:
    int judgk_modfd;
    char *read_buf;
    off_t read_off;

public:
    int tty_idx;

    judgm_hyperio(int judgk_modfd){
	this->judgk_modfd = judgk_modfd;
	this->tty_idx = ioctl(this->judgk_modfd,IOCTL_HYPERIO_ADD,0);
	this->read_buf = (char*)mmap(NULL,JUDGK_COM_HYPERIO_BUFSIZE,PROT_READ,MAP_SHARED,judgk_modfd,0);
	this->read_off = 0;
    }
    ~judgm_hyperio(){
	munmap(read_buf,JUDGK_COM_HYPERIO_BUFSIZE);
	ioctl(judgk_modfd,IOCTL_HYPERIO_DEL,0);
    }

    static int get_ttyfd(int idx){
	char tpath[PATH_MAX + 1];
	
	snprintf(tpath,sizeof(tpath),"/dev/jtty%d",idx);
	return open(tpath,O_RDWR);
    }
    size_t wait(){
	return ioctl(judgk_modfd,IOCTL_HYPERIO_READ,0);
    }
    int compare(char *buf,size_t len){
	int flag;
	size_t remain;
	off_t off;
	size_t data_len;
	size_t cmp_len;

	flag = 0;
	remain = len;
	off = 0;
	data_len = 0;
	cmp_len = 0;
	while(remain > 0 && flag == 0){
	    if(data_len == 0){
		if((data_len = ioctl(judgk_modfd,IOCTL_HYPERIO_READ,cmp_len)) <= 0){
		    return -1;
		}
	    }
	    if(remain < data_len){
		cmp_len = remain;
	    }else{
		cmp_len = data_len;
	    }

	    if((cmp_len + read_off) < JUDGK_COM_HYPERIO_BUFSIZE){
		flag |= memcmp(read_buf + read_off,buf + off,cmp_len);
		read_off += cmp_len;
	    }else{
		flag |= memcmp(read_buf + read_off,buf + off,JUDGK_COM_HYPERIO_BUFSIZE - read_off);
		flag |= memcmp(read_buf,buf + off + (JUDGK_COM_HYPERIO_BUFSIZE - read_off),(cmp_len + read_off) - JUDGK_COM_HYPERIO_BUFSIZE);
		read_off = (cmp_len + read_off) - JUDGK_COM_HYPERIO_BUFSIZE;
	    }
	    remain -= cmp_len;
	    off += cmp_len;
	    data_len -= cmp_len;
	}
	if(cmp_len > 0){
	    ioctl(judgk_modfd,IOCTL_HYPERIO_READ,-(long)cmp_len);
	}

	if(flag == 0){
	    return 0;
	}else{
	    return -1;
	}
    }
};

static int judgm_compile(int subid,char *code_path,char *exe_path,int lang,bool force_flag,char *err_msg,size_t err_len){
    int ret;
    int i;

    char main_path[PATH_MAX + 1];
    char sem_path[PATH_MAX + 1];
    struct stat st;
    sem_t *wait_sem;
    bool ce_flag;
    char dir_path[PATH_MAX + 1];
    char *out_path;
    int io[2];
    int pid;
    int wstatus;
    off_t off;
    
    if(force_flag == false){
	snprintf(main_path,sizeof(main_path),"tmp/exe/%d/main",subid);
	snprintf(sem_path,sizeof(sem_path),"/judgm_compile_wait_%d",subid);
	if((wait_sem = sem_open(sem_path,0)) == SEM_FAILED){
	    if(stat(main_path,&st)){
		if((wait_sem = sem_open(sem_path,O_CREAT | O_EXCL,0644,0)) != SEM_FAILED){
		    out_path = main_path;
		    goto compile;
		}else if((wait_sem = sem_open(sem_path,0)) != SEM_FAILED){

		    sem_wait(wait_sem);
    
		    sem_close(wait_sem);
		}
	    }
	}else{

	    sem_wait(wait_sem);

	    sem_close(wait_sem);
	}

	if(!link(main_path,exe_path)){
	    return 0;
	}
    }

    force_flag = true;
    out_path = exe_path;

compile:

    if(force_flag == false){
	snprintf(dir_path,sizeof(dir_path),"tmp/exe/%d",subid);
	mkdir(dir_path,0755);
    }
    ce_flag = false;

    if(lang == JUDGE_CPP){
	pipe(io);
	
	if((pid = fork()) == 0){
	    char *argv[] = {"g++","-static","-O2",code_path,"-std=c++0x","-o",out_path,NULL};

	    dup2(io[1],1);
	    dup2(io[1],2);
	    execvp("g++",argv);
	}

	close(io[1]);
	off = 0;
	while((ret = read(io[0],err_msg + off,err_len - off - 1)) > 0){
	    off += ret;
	}
	err_msg[off] = '\0';
	close(io[0]);

	waitpid(pid,&wstatus,0);
	if(wstatus != 0){
	    ce_flag = true;
	}
    }

    if(force_flag == false){
	if(ce_flag == true){
	    rmdir(dir_path);
	}

	for(i = 0;i < 8;i++){
	    sem_post(wait_sem);
	}
	sem_close(wait_sem);
	sem_unlink(sem_path);
    }
    if(ce_flag == true){
	return -1;
    }

    link(main_path,exe_path);

    return 0;
}
