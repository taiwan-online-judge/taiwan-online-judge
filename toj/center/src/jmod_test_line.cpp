#include<stdio.h>
#include<stdlib.h>
#include<limits.h>
#include<dlfcn.h>
#include<pthread.h>
#include<json/json.h>

#include"judge_def.h"
#include"judgm_lib.h"
#include"judgm_line.h"
#include"jmod_test.h"
#include"jmod_test_line.h"

static int line_load_setfile(FILE *set_file,int test_id,int &timelimit,int &memlimit,double &score){
    int ret;

    json_object *jso;
    char buf[JUDGE_SET_FILEMAX];

    fread(buf,1,sizeof(buf),set_file);
    jso = json_tokener_parse(buf);

    timelimit = json_object_get_int(json_object_object_get(jso,"timelimit"));
    memlimit = json_object_get_int(json_object_object_get(jso,"memlimit"));
    score = json_object_get_double(json_object_array_get_idx(json_object_object_get(jso,"score"),test_id - 1));

    json_object_put(jso);
    return 0;
}
static void line_sigaction(int sig_num,siginfo_t *sig_info,void *context){
    if(sig_info->si_pid == line_proc->pid && line_proc->status == JUDGE_RUN){
	if(!line_proc->proc_wait(false)){
	    line_chk_stop_fn();
	}
    }
}
static int line_sig_set(){
    struct sigaction sig;

    sig.sa_sigaction = line_sigaction;
    sigemptyset(&sig.sa_mask);
    sig.sa_flags = SA_SIGINFO | SA_RESTART;
    if(sigaction(SIGCHLD,&sig,NULL)){
	return -1;
    }

    return 0;
}
static int line_sig_restore(){
    struct sigaction sig;

    sig.sa_handler = SIG_DFL;
    sigemptyset(&sig.sa_mask);
    sig.sa_flags = 0;
    if(sigaction(SIGCHLD,&sig,NULL)){
	return -1;
    }

    return 0;
}
static int line_sig_block(){
    sigset_t mask;

    sigemptyset(&mask);
    sigaddset(&mask,SIGCHLD);
    if(pthread_sigmask(SIG_BLOCK,&mask,NULL)){
	return -1;
    }

    return 0;
}
static int line_sig_unblock(){
    sigset_t mask;

    sigemptyset(&mask);
    sigaddset(&mask,SIGCHLD);
    if(pthread_sigmask(SIG_UNBLOCK,&mask,NULL)){
	return -1;
    }

    return 0;
}
static int line_sig_wait(){
    sigset_t mask;
    int num;

    sigfillset(&mask);
    sigdelset(&mask,SIGKILL);
    sigdelset(&mask,SIGTERM);
    sigdelset(&mask,SIGINT);
    sigdelset(&mask,SIGCHLD);
    sigsuspend(&mask);

    return 0;
}
DLL_PUBLIC int run(judgm_line_info *info){
    int i;

    line_result_data *res_data;

    int set_timelimit;
    int set_memlimit;
    double set_score;
    line_set_data *set_data;

    char main_path[PATH_MAX + 1];
    char exe_path[PATH_MAX + 1];

    check_init_fn chk_init_fn;
    check_run_fn chk_run_fn;
    judgm_proc_check_fn chk_proc_fn;

    char data_path[PATH_MAX + 1];
    int chk_status;

    set_data = (line_set_data*)info->set_data;

    res_data = (line_result_data*)info->res_data;
    info->res_len = sizeof(line_result_data);

    res_data->test_id = set_data->test_id;
    res_data->status = JUDGE_ERR;
    res_data->score = 0;
    res_data->runtime = 0;
    res_data->memory = 0;

    if(line_load_setfile(info->set_file,set_data->test_id,set_timelimit,set_memlimit,set_score)){
	return -1;
    }

    snprintf(main_path,sizeof(main_path),"%s/main.cpp",info->code_path);
    snprintf(exe_path,sizeof(exe_path),"%s/test",info->run_path);
    if(judgm_compile(info->subid,main_path,exe_path,info->lang,false,res_data->errmsg,sizeof(res_data->errmsg))){
	res_data->status = JUDGE_CE;
	return -1;
    }

    chk_init_fn = (check_init_fn)dlsym(info->check_dll,"init");
    chk_run_fn = (check_run_fn)dlsym(info->check_dll,"run"); 
    chk_proc_fn = (judgm_proc_check_fn)dlsym(info->check_dll,"proc");
    line_chk_stop_fn = (check_stop_fn)dlsym(info->check_dll,"stop"); 
    line_proc = new judgm_proc(info->judgk_modfd,info->run_path,exe_path,set_timelimit,(set_timelimit * 10 + 5000),set_memlimit,chk_proc_fn);

    snprintf(data_path,sizeof(data_path),"%s/private/%d",info->pro_path,set_data->test_id);
    if(chk_init_fn(info->judgk_modfd,data_path,info->run_path)){
	delete line_proc;
	return -1;
    }
    if(line_sig_set()){
	delete line_proc;
	return -1;
    }

    if(line_proc->proc_run()){
	delete line_proc;
	return -1;
    }
    chk_run_fn(chk_status);
    
    line_sig_block();
    if(line_proc->status == JUDGE_RUN){
	line_proc->proc_kill();
	line_sig_wait();
    }
    line_sig_unblock();

    printf("check status %d  proc status %d\n",chk_status,line_proc->status);

    if(line_sig_restore()){
	delete line_proc;
	return -1;
    }

    if(line_proc->status != JUDGE_AC){
	res_data->status = line_proc->status;
    }else{
	res_data->status = chk_status;
    }
    if(res_data->status == JUDGE_AC){
	res_data->score = set_score;
    }else{
	res_data->score = 0;
    }
    res_data->runtime = line_proc->runtime;
    res_data->memory = line_proc->memory;

    delete line_proc;
    return 0;
}
