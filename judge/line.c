#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<dlfcn.h>
#include<limits.h>
#include<semaphore.h>
#include<signal.h>
#include<time.h>

#include"judge_def.h"
#include"judgx.h"
#include"judgx_line.h"
#include"line.h"

static void line_ini_handler(void *data,char *section,char *key,char *value){
    int i;

    struct line_setting_info *set_info;
    char *part;
    char *savpart;

    set_info = (struct line_setting_info*)data;
    if(strcmp(section,"JUDGE") == 0){
	if(strcmp(key,"timelimit") == 0){
	    set_info->timelimit = atoi(value);
	}else if(strcmp(key,"hardtimelimit") == 0){
	    set_info->hardtimelimit = atoi(value);
	}else if(strcmp(key,"memlimit") == 0){
	    set_info->memlimit = atoi(value);
	}else if(strcmp(key,"count") == 0){
	    set_info->count = atoi(value);
	}else if(strcmp(key,"score") == 0){
	    part = strtok_r(value,",",&savpart);
	    i = 0;
	    while(part != NULL){
		set_info->score[i] = atoi(part);
		part = strtok_r(NULL,",",&savpart);
		i++;
	    }
	}
    }
}
static void* line_procrun_thread(void *arg){
    struct line_procrun_info *procrun_info;

    procrun_info = (struct line_procrun_info*)arg;
    judgx_proc_run(procrun_info->proc_info,procrun_info->check_run);

    sem_post(procrun_info->done_sem);
    return NULL;
}

DLL_PUBLIC int run(struct judgx_line_info *line_info){
    int ret;
    int i;
    
    struct line_setting_info *set_info;
    char exepath[PATH_MAX + 1];
    char datapath[PATH_MAX + 1];

    check_init_fn check_init;
    check_thread_fn check_thread;
    check_stop_fn check_stop;
    judgx_check_run_fn check_run;

    struct judgx_proc_info *proc_info;
    int status;
    int score;
    unsigned long runtime;
    unsigned long peakmem;

    sem_t donesem;
    struct check_thread_info thread_info;
    struct line_procrun_info procrun_info;
    pthread_t check_pt;
    pthread_t procrun_pt;
    struct timespec waittime;

    printf("line1\n");

    set_info = malloc(sizeof(struct line_setting_info));
    set_info->hardtimelimit = -1;
    judgx_ini_load(line_info->set_file,line_ini_handler,set_info);
    if(set_info->hardtimelimit < 0){
	set_info->hardtimelimit = set_info->timelimit * 10L + 10000;
    }

    printf("line2\n");

    check_init = dlsym(line_info->check_dll,"init");
    check_thread = dlsym(line_info->check_dll,"thread");
    check_stop = dlsym(line_info->check_dll,"stop");
    check_run = dlsym(line_info->check_dll,"run");

    printf("line3\n");

    snprintf(exepath,sizeof(exepath),"%s/test",line_info->run_path);
    if(judgx_compile(line_info->cpp_path,exepath,NULL) == JUDGE_CE){
	for(i = 0;i < set_info->count;i++){
	    line_info->result[i].status = JUDGE_CE;
	    line_info->result[i].score = 0;
	    line_info->result[i].maxscore = set_info->score[i];
	    line_info->result[i].runtime = 0;
	    line_info->result[i].peakmem = 0;
	}
	line_info->result_count = set_info->count;

	goto clean;
    }

    printf("line4\n");

    for(i = 0;i < set_info->count;i++){
	status = JUDGE_ERR;
	score = 0;
	runtime = 0;
	peakmem = 0;

	printf("line5\n");

	if(!(proc_info = judgx_proc_create(line_info->run_path,exepath,set_info->timelimit,set_info->hardtimelimit,set_info->memlimit))){
	    goto proc_end;   	
	}

	printf("line7\n");

	snprintf(datapath,sizeof(datapath),"%s/%d",line_info->pro_path,(i + 1));
	if(check_init(line_info->run_path,datapath)){
	    goto proc_clean;
	}

	sem_init(&donesem,0,0);

	thread_info.status = JUDGE_WA;
	thread_info.done_sem = &donesem; 

	procrun_info.proc_info = proc_info;
	procrun_info.check_run = check_run;
	procrun_info.done_sem = &donesem;

	pthread_create(&check_pt,NULL,check_thread,&thread_info);
	pthread_create(&procrun_pt,NULL,line_procrun_thread,&procrun_info);

	sem_wait(&donesem);

	judgx_proc_kill(proc_info);
	pthread_join(procrun_pt,NULL);
	
	check_stop();

	if(proc_info->status == JUDGE_AC){
	    clock_gettime(CLOCK_REALTIME,&waittime);
	    waittime.tv_sec += CHECK_THREAD_WAITTIME;
	    if(sem_timedwait(&donesem,&waittime)){
		status = JUDGE_WA;
	    }else{ 
		status = thread_info.status;		
		if(status == JUDGE_AC){
		    score = set_info->score[i];
		}
	    }
	}else{
	    status = proc_info->status;
	}

	pthread_cancel(check_pt);
	sem_destroy(&donesem);
	    
	runtime = proc_info->runtime;
	peakmem = proc_info->peakmem;

proc_clean:

	judgx_proc_free(proc_info);

proc_end:

	line_info->result[i].status = status;
	line_info->result[i].score = score;
	line_info->result[i].maxscore = set_info->score[i];
	line_info->result[i].runtime = runtime;
	line_info->result[i].peakmem = peakmem;
    }

    printf("line8\n");

    line_info->result_count = set_info->count;

clean:

    free(set_info);
    close(line_info->set_file);

    printf("line10\n");

    return 0;
}
