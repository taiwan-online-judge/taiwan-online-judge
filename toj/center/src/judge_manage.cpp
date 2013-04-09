#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<unistd.h>
#include<limits.h>
#include<dirent.h>
#include<dlfcn.h>
#include<sys/types.h>
#include<sys/stat.h>
#include<sys/mman.h>
#include<map>

#include"tpool.h"
#include"judge_def.h"
#include"judge.h"
#include"judgm_line.h"
#include"judgm_lib.h"
#include"judge_manage.h"

int judge_manage_init(){
    int i;

    manage_tp = new tpool(JUDGE_THREAD_MAX);
    judge_server_addtpool(manage_tp);
    manage_tp->start();

    manage_judgk_modfd = open("/dev/judgk",O_RDWR);
    for(i = 0;i < JUDGE_THREAD_JUDGEMAX;i++){
	manage_judgepool[i] = new manage_judgeth_info(i);
    }
    manage_updatepro_thfn = new tpool_static_fn(manage_updatepro_th);
    manage_updatepro_cbfn = new tpool_static_fn(manage_updatepro_cb);
    manage_unpackcode_thfn = new tpool_static_fn(manage_unpackcode_th);
    manage_unpackcode_cbfn = new tpool_static_fn(manage_unpackcode_cb);
    manage_judge_thfn = new tpool_static_fn(manage_judge_th);
    manage_judge_cbfn = new tpool_static_fn(manage_judge_cb);

    judge_manage_updatedata();
    return 0;
}
int judge_manage_updatedata(){
    DIR *dirp;
    char *buf;
    dirent *entry;
    int proid;
    int cacheid;
    judge_pro_info *pro_info;

    if((dirp = opendir("tmp/pro")) == NULL){
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
	    sscanf(entry->d_name,"%d_%d",&proid,&cacheid); 
	    pro_info = new judge_pro_info(proid,cacheid);
	    judge_manage_getpro(pro_info);
	    judge_manage_promap.insert(std::make_pair(proid,pro_info));
	}
    }

    delete(buf);
    closedir(dirp);

    return 0;
}

judge_pro_info* judge_manage_getprobyid(int proid){
    std::map<int,judge_pro_info*>::iterator pro_it;
    judge_pro_info *pro_info;

    if((pro_it = judge_manage_promap.find(proid)) == judge_manage_promap.end()){
	return NULL;
    }
    pro_info = pro_it->second;

    if(judge_manage_getpro(pro_info)){
	return NULL;
    }

    return pro_info;
}
int judge_manage_getpro(judge_pro_info *pro_info){
    pro_info->ref_count++;
    return 0;
}
int judge_manage_putpro(judge_pro_info *pro_info){
    std::map<int,judge_pro_info*> pro_it;
    char tpath[PATH_MAX + 1];
    char src_path[PATH_MAX + 1];

    pro_info->ref_count--;
    if(pro_info->ref_count == 0){
	snprintf(tpath,sizeof(tpath),"tmp/pro/%d_%d",pro_info->proid,pro_info->cacheid);
	tool_cleardir(tpath);
	rmdir(tpath);

	delete pro_info;
    }
    return 0;
}
int judge_manage_updatepro(int proid,int cacheid,bool check_flag,judge_pro_info **update_pro_info){ //If check_flag = true, just check
    int ret;

    std::map<int,judge_pro_info*>::iterator pro_it;
    judge_pro_info *old_pro_info;

    if((pro_it = judge_manage_promap.find(proid)) == judge_manage_promap.end()){
	if(check_flag == true){
	    return 0;
	}
    }else{
	old_pro_info = pro_it->second;

	if(old_pro_info->state == JUDGE_CACHESTATE_READY && cacheid == old_pro_info->cacheid){
	    return 1;
	}
	if(old_pro_info->state == JUDGE_CACHESTATE_UPDATE && (cacheid <= old_pro_info->cacheid || cacheid <= old_pro_info->update_cacheid)){
	    return -1;
	}

	if(check_flag == true){
	    return 0;
	}

	old_pro_info->update_cacheid = cacheid; 
	old_pro_info->state = JUDGE_CACHESTATE_UPDATE;
    }

    *update_pro_info = new judge_pro_info(proid,cacheid);
    judge_manage_getpro(*update_pro_info);

    return 0;
}
int judge_manage_done_updatepro(judge_pro_info *pro_info){
    manage_tp->add(manage_updatepro_thfn,pro_info,manage_updatepro_cbfn,pro_info);
    return 0;
}
static void manage_updatepro_th(void *data){
    judge_pro_info *pro_info;
    int proid;
    int cacheid;
    char pack_path[PATH_MAX + 1];
    char dir_path[PATH_MAX + 1];
    char tpath[PATH_MAX + 1];
    FILE *f;

    pro_info = (judge_pro_info*)data;

    snprintf(pack_path,sizeof(pack_path),"tmp/propack/%d_%d.tar.bz2",pro_info->proid,pro_info->cacheid);
    snprintf(dir_path,sizeof(dir_path),"tmp/pro/%d_%d",pro_info->proid,pro_info->cacheid);
    mkdir(dir_path,0755);
    tool_cleardir(dir_path);
    tool_unpack(pack_path,dir_path);
    //unlink(pack_path);

    snprintf(tpath,sizeof(tpath),"tmp/pro/%d_%d/cacheinfo",pro_info->proid,pro_info->cacheid);
    f = fopen(tpath,"w");
    fprintf(f,"%d",pro_info->cacheid);
    fclose(f);
}
static void manage_updatepro_cb(void *data){
    judge_pro_info *old_pro_info;
    judge_pro_info *update_pro_info;
    std::pair<std::map<int,judge_pro_info*>::iterator,bool> ins_ret;
    std::vector<std::pair<int,int> > pro_list;

    update_pro_info = (judge_pro_info*)data;
    
    ins_ret = judge_manage_promap.insert(std::make_pair(update_pro_info->proid,update_pro_info));
    if(ins_ret.second == false){
	old_pro_info = ins_ret.first->second;

	if(update_pro_info->cacheid < old_pro_info->cacheid){
	    judge_manage_putpro(update_pro_info);
	    return;
	}

	judge_manage_putpro(ins_ret.first->second);
	ins_ret.first->second = update_pro_info;
    }

    pro_list.push_back(std::make_pair(update_pro_info->proid,update_pro_info->cacheid));
    judge_server_setpro(pro_list);
}


int judge_manage_submit(int subid,int proid,int lang,char *set_data,int set_len){
    judge_pro_info *pro_info;
    judge_submit_info *sub_info;

    char tpath[PATH_MAX + 1];
    struct stat st;

    pro_info = judge_manage_getprobyid(proid); 
    sub_info = new judge_submit_info(subid,pro_info,lang,set_data,set_len);

    if(manage_submap.find(subid) == manage_submap.end()){
	snprintf(tpath,sizeof(tpath),"tmp/code/%d",subid);
	if(!stat(tpath,&st)){
	    manage_queuejudge(sub_info);	
	}else{
	    judge_server_reqcode(subid);
	    manage_submap.insert(std::make_pair(subid,sub_info));
	}
    }else{
	manage_submap.insert(std::make_pair(subid,sub_info));
    }

    return 0;
}
int judge_manage_done_code(int subid){
    manage_tp->add(manage_unpackcode_thfn,(void*)((long)subid),manage_unpackcode_cbfn,(void*)((long)subid));
    return 0;
}
static void manage_unpackcode_th(void *data){
    int subid;
    char pack_path[PATH_MAX + 1];
    char dir_path[PATH_MAX + 1];
    char tpath[PATH_MAX + 1];
    FILE *f;

    subid = (int)((long)data);

    snprintf(pack_path,sizeof(pack_path),"tmp/codepack/%d.tar.bz2",subid);
    snprintf(dir_path,sizeof(dir_path),"tmp/code/%d",subid);
    mkdir(dir_path,0755);
    tool_cleardir(dir_path);
    tool_unpack(pack_path,dir_path);
}
static void manage_unpackcode_cb(void *data){
    int subid;
    std::multimap<int,judge_submit_info*>::iterator sub_it;
    judge_submit_info *sub_info;

    subid = (int)((long)data);

    while((sub_it = manage_submap.find(subid)) != manage_submap.end()){
	sub_info = sub_it->second;
	manage_queuejudge(sub_info);	
	manage_submap.erase(sub_it);
    }
}
static int manage_queuejudge(judge_submit_info *sub_info){
    int i;

    printf("queue judge %d %d\n",sub_info->subid,sub_info->pro_info->proid);
    for(i = 0;i < 16;i++){
	if(manage_judgepool[i]->use_flag == false){
	    manage_judgepool[i]->use_flag = true;
	    manage_judgepool[i]->sub_info = sub_info;
	    manage_tp->add(manage_judge_thfn,manage_judgepool[i],manage_judge_cbfn,manage_judgepool[i]);
	    break;
	}
    }

    return 0;
}
static void manage_judge_th(void *data){
    manage_judgeth_info *th_info;
    judge_submit_info *sub_info;
    judge_pro_info *pro_info;
    char pro_path[PATH_MAX + 1];
    char code_path[PATH_MAX + 1];
    char *set_data;

    th_info = (manage_judgeth_info*)data;
    sub_info = th_info->sub_info;
    pro_info = sub_info->pro_info;

    snprintf(pro_path,sizeof(pro_path),"tmp/pro/%d_%d",pro_info->proid,pro_info->cacheid);
    snprintf(code_path,sizeof(code_path),"tmp/code/%d",sub_info->subid);
    manage_judge(sub_info->subid,pro_path,code_path,th_info->run_path,sub_info->lang,sub_info->set_data,th_info->res_data,th_info->res_len);
}
static void manage_judge_cb(void *data){
    manage_judgeth_info *th_info;
    judge_submit_info *sub_info;
    std::vector<std::pair<int,int> > pro_list;

    th_info = (manage_judgeth_info*)data;
    sub_info = th_info->sub_info;

    judge_server_result(sub_info->subid,th_info->res_data,th_info->res_len);
    judge_manage_putpro(sub_info->pro_info);

    th_info->use_flag = false;
    th_info->sub_info = NULL;
    delete sub_info;
}
static int manage_judge(int subid,char *pro_path,char *code_path,char *run_path,int lang,char *set_data,char *res_data,size_t &res_len){
    judgm_line_info *line_info;
    int pid;

    char tpath[PATH_MAX + 1];
    FILE *set_file;
    char cwd_path[PATH_MAX + 1];
    char jmod_name[NAME_MAX + 1];
    char line_path[PATH_MAX + 1];
    char check_name[NAME_MAX + 1];
    char check_path[PATH_MAX + 1];
    char lchr;
    char tchr;

    void *line_dll;
    void *check_dll;
    judgm_line_run_fn run_fn;

    snprintf(tpath,sizeof(tpath),"%s/setting",pro_path);
    set_file = fopen(tpath,"r");

    getcwd(cwd_path,sizeof(cwd_path));
    fscanf(set_file,"%s",jmod_name);
    snprintf(line_path,sizeof(line_path),"%s/tmp/jmod/%s/%s_line.so",cwd_path,jmod_name,jmod_name);
    fscanf(set_file,"%s",check_name);
    if(check_name[0] == '/'){
	snprintf(check_path,sizeof(check_path),"%s/%s/private%s.so",cwd_path,pro_path,check_name);
    }else{
	snprintf(check_path,sizeof(check_path),"%s/tmp/jmod/%s/%s.so",cwd_path,jmod_name,check_name);
    }

    lchr = '\n';
    while((tchr = fgetc(set_file)) != EOF){
	if(lchr == '\n' && tchr == '='){
	    while(fgetc(set_file) != '\n');
	    break;
	}
	lchr = tchr;
    }

    line_dll = dlopen(line_path,RTLD_NOW);
    check_dll = dlopen(check_path,RTLD_NOW);

    line_info = (judgm_line_info*)mmap(NULL,sizeof(struct judgm_line_info),PROT_READ | PROT_WRITE,MAP_SHARED | MAP_ANONYMOUS,-1,0);
    line_info->subid = subid;
    line_info->pro_path = pro_path;
    line_info->code_path = code_path;
    line_info->run_path = run_path;

    line_info->judgk_modfd = manage_judgk_modfd;
    line_info->line_dll = line_dll;
    line_info->check_dll = check_dll;

    line_info->lang = lang;
    line_info->set_file = set_file;
    line_info->set_data = set_data;

    tool_cleardir(line_info->run_path);

    run_fn = (judgm_line_run_fn)dlsym(line_dll,"run");
    if((pid = fork()) == 0){
	run_fn(line_info);
	exit(0);
    }
    waitpid(pid,NULL,0);

    memcpy(res_data,line_info->res_data,line_info->res_len);
    res_len = line_info->res_len;

    munmap(line_info,sizeof(judgm_line_info));
    fclose(set_file);
    return 0;
}
