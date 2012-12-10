#define _XOPEN_SOURCE 600
#define _GNU_SOURCE

#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<limits.h>
#include<pthread.h>
#include<semaphore.h>
#include<dlfcn.h>
#include<sys/socket.h>
#include<sys/mman.h>
#include<netinet/in.h>
#include<errno.h>
#include<ftw.h>
#include<libpq-fe.h>

#include"judge_def.h"
#include"judgx_line.h"
#include"judge_server.h"

#define JUDGE_DB_MAXSCOREMAX 1024

static int server_cleardir_callback(const char *path,const struct stat *st,int flag,struct FTW *ftwbuf){
    if(ftwbuf->level == 0){
	return 0;
    }

    if(S_ISDIR(st->st_mode)){
	rmdir(path);
    }else{
	unlink(path);
    }
    return 0;
}
static int server_cleardir(char *path){
    nftw(path,server_cleardir_callback,64,FTW_DEPTH | FTW_PHYS);
    return 0;
}
static int server_updatedb(PGconn *sqlc,int submitid,int result_count,struct judgx_line_result *result){
    int i;
    int j;

    char sqlstatus[JUDGE_DB_STATUSMAX + 1];
    char sqlscore[JUDGE_DB_SCOREMAX + 1];
    char sqlmaxscore[JUDGE_DB_MAXSCOREMAX + 1];
    char sqlruntime[JUDGE_DB_RUNTIMEMAX + 1];
    char sqlpeakmem[JUDGE_DB_PEAKMEMMAX + 1];
    char sqlsubmitid[64];

    const char *sqlparam[6];
    PGresult *sqlr;

    printf("sql1 %d\n",getpid());

    sqlstatus[0] = '{';
    for(i = 0,j = 1;i < result_count;i++){
	snprintf(sqlstatus + j,sizeof(sqlstatus) - j,"%d,",result[i].status);
	while(sqlstatus[j] != '\0'){
	    j++;
	}
    }
    sqlstatus[j - 1] = '}';

    sqlscore[0] = '{';
    for(i = 0,j = 1;i < result_count;i++){
	snprintf(sqlscore + j,sizeof(sqlscore) - j,"%d,",result[i].score);
	while(sqlscore[j] != '\0'){
	    j++;
	}
    }
    sqlscore[j - 1] = '}';

    sqlmaxscore[0] = '{';
    for(i = 0,j = 1;i < result_count;i++){
	snprintf(sqlmaxscore + j,sizeof(sqlmaxscore) - j,"%d,",result[i].maxscore);
	while(sqlmaxscore[j] != '\0'){
	    j++;
	}
    }
    sqlmaxscore[j - 1] = '}';

    sqlruntime[0] = '{';
    for(i = 0,j = 1;i < result_count;i++){
	snprintf(sqlruntime + j,sizeof(sqlruntime) - j,"%lu,",result[i].runtime);
	while(sqlruntime[j] != '\0'){
	    j++;
	}
    }
    sqlruntime[j - 1] = '}';

    sqlpeakmem[0] = '{';
    for(i = 0,j = 1;i < result_count;i++){
	snprintf(sqlpeakmem + j,sizeof(sqlpeakmem) - j,"%lu,",result[i].peakmem);
	while(sqlpeakmem[j] != '\0'){
	    j++;
	}
    }
    sqlpeakmem[j - 1] = '}';

    snprintf(sqlsubmitid,64,"%d",submitid);

    printf("sql2\n");

    sqlparam[0] = sqlstatus;
    sqlparam[1] = sqlscore;
    sqlparam[2] = sqlmaxscore;
    sqlparam[3] = sqlruntime;
    sqlparam[4] = sqlpeakmem;
    sqlparam[5] = sqlsubmitid;

    sqlr = PQexecParams(sqlc,
	    "UPDATE \"submit\" SET \"status\"=$1,\"score\"=$2,\"maxscore\"=$3,\"runtime\"=$4,\"peakmem\"=$5 WHERE \"submitid\"=$6;",
	    6,
	    NULL,
	    sqlparam,
	    NULL,
	    NULL,
	    0);
    PQclear(sqlr);

    printf("sql3\n");

    return 0;
}
static void* server_thread(void *arg){
    int i;

    struct server_thread_info *thread_info;
    struct judge_submit_info *submit_info;
    struct judgx_line_info *line_info;

    PGconn *sqlc;
    char tname[NAME_MAX + 1];
    char tpath[PATH_MAX + 1];
    line_run_fn line_run;
    int runpid;

    thread_info = (struct server_thread_info*)arg;

    sqlc = PQconnectdb("host=localhost port=5432 dbname=expoj user=expoj password=xxxxx");

    while(1){
	printf("in\n");

	sem_wait(&server_queue_sem);

	pthread_mutex_lock(&server_queue_mutex);

	printf("in1\n");

	submit_info = server_queue_head.next;
	server_queue_head.next = submit_info->next;
	submit_info->next->prev = &server_queue_head;

	pthread_mutex_unlock(&server_queue_mutex);

	printf("in2\n");

	server_cleardir(thread_info->run_path);

	printf("in3\n");

	line_info = mmap(NULL,sizeof(struct judgx_line_info),PROT_READ | PROT_WRITE,MAP_SHARED | MAP_ANONYMOUS,-1,0);
	snprintf(line_info->pro_path,sizeof(line_info->pro_path),"pro/%d",submit_info->proid);
	snprintf(line_info->cpp_path,sizeof(line_info->cpp_path),"submit/%d_submit.cpp",submit_info->submitid);
	line_info->run_path[0] = '\0';
	strncat(line_info->run_path,thread_info->run_path,sizeof(line_info->run_path));

	printf("in4");

	snprintf(tpath,sizeof(tpath),"pro/%d/%d_setting.txt",submit_info->proid,submit_info->proid);
	line_info->set_file = fopen(tpath,"r");

	printf("in5\n");

	fgets(tname,sizeof(tname),line_info->set_file);
	tname[strlen(tname) - 1] = '\0';
	snprintf(tpath,sizeof(tpath),"judge/%s.so",tname);

	printf("in5-1\n");

	line_info->line_dll = dlopen(tpath,RTLD_LAZY | RTLD_NODELETE);

	printf("in5-2\n");

	fgets(tname,sizeof(tname),line_info->set_file);
	tname[strlen(tname) - 1] = '\0';
	snprintf(tpath,sizeof(tpath),"judge/%s.so",tname);

	printf("in5-3\n");

	line_info->check_dll = dlopen(tpath,RTLD_LAZY | RTLD_NODELETE);

	printf("in6\n");

	line_run = dlsym(line_info->line_dll,"run");
	if((runpid = fork()) == 0){
	    line_run(line_info);
	    exit(0);
	}
	waitpid(runpid,NULL,0);

	printf("in7\n");

	server_updatedb(sqlc,submit_info->submitid,line_info->result_count,line_info->result);

	printf("in8\n");

	fclose(line_info->set_file);
	dlclose(line_info->line_dll);
	dlclose(line_info->check_dll);
	
	munmap(line_info,sizeof(struct judgx_line_info));
	free(submit_info);

	printf("out\n");
    }

    PQfinish(sqlc);

    return NULL;
}
int judge_server(){
    int ret;
    int i;

    struct server_thread_info *thread_info;

    int ssd;
    struct sockaddr_in saddr;
    struct sockaddr_in caddr;
    int csd;
    char *buf;
    int submitid;
    int proid;
    struct judge_submit_info *submit_info;
    
    server_queue_head.next = &server_queue_head;
    server_queue_head.prev = &server_queue_head;
    sem_init(&server_queue_sem,0,0);
    pthread_mutex_init(&server_queue_mutex,NULL); 

    thread_info = (struct server_thread_info*)malloc(sizeof(struct server_thread_info) * 4);
    for(i = 0;i < 2;i++){
	thread_info[i].threadid = i;
	snprintf(thread_info[i].run_path,sizeof(thread_info[i].run_path),"run/%d",i);
	mkdir(thread_info[i].run_path,0775);
	pthread_create(&thread_info[i].pt,NULL,server_thread,&thread_info[i]);
    }

    ssd = socket(AF_INET,SOCK_STREAM,0);
    saddr.sin_family = AF_INET;
    saddr.sin_port = htons(2501);
    saddr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    bind(ssd,(struct sockaddr*)&saddr,sizeof(saddr));
    listen(ssd,128); 

    buf = malloc(65536);
    while((csd = accept(ssd,(struct sockaddr*)&saddr,&ret)) != -1){
	i = 0;
	if((ret = recv(csd,buf + i,65536,0)) != -1){
	    i += ret;
	}
	sscanf(buf,"%d %d",&submitid,&proid);

	printf("        %d %d\n",submitid,proid);

	submit_info = malloc(sizeof(struct judge_submit_info));	
	submit_info->submitid = submitid;
	submit_info->proid = proid;

	pthread_mutex_lock(&server_queue_mutex);

	submit_info->next = &server_queue_head;
	submit_info->prev = server_queue_head.prev;
	server_queue_head.prev->next = submit_info;
	server_queue_head.prev = submit_info;

	pthread_mutex_unlock(&server_queue_mutex);

	sem_post(&server_queue_sem);

	close(csd);
    }
    free(buf);

    free(thread_info);

    return 0;
}

