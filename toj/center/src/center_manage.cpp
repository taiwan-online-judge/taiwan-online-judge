#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<limits.h>
#include<dlfcn.h>
#include<unistd.h>
#include<pthread.h>
#include<semaphore.h>
#include<libpq-fe.h>
#include<sys/eventfd.h>
#include<sys/stat.h>
#include<json/json.h>
#include<vector>
#include<queue>
#include<map>
#include<string>

#include"tpool.h"
#include"/srv/http/toj/php/event_exec.h"
#include"judge_def.h"
#include"judgm_manage.h"
#include"center.h"
#include"center_manage.h"

int center_manage_init(tpool **tpinfo){
    manage_tp = new tpool(4);
    manage_tp->start();
    *tpinfo = manage_tp;

    manage_updatepro_thfn = new tpool_static_fn(manage_updatepro_th);
    manage_updatepro_cbfn = new tpool_static_fn(manage_updatepro_cb);
    manage_updatejmod_thfn = new tpool_static_fn(manage_updatejmod_th);
    manage_updatejmod_cbfn = new tpool_static_fn(manage_updatejmod_cb);
    manage_submit_thfn = new tpool_static_fn(manage_submit_th);
    manage_submit_cbfn = new tpool_static_fn(manage_submit_cb);

    //run when startup
    center_manage_updatedata(); 
    center_manage_submitwait();
    return 0;
}
PGconn* center_manage_conndb(){
    return PQconnectdb("host=localhost port=5432 dbname=xxxxx user=xxxxx password=xxxxx");
}
int center_manage_closedb(PGconn *conn){
    PQfinish(conn);
    return 0;
}
int center_manage_updatedata(){
    int i;

    PGconn *db_conn;
    PGresult *db_res;
    int db_count;
    int cacheid;
    center_jmod_info *jmod_info;
    int proid;
    int lang_flag;
    std::map<std::string,center_jmod_info*>::iterator jmod_it;
    center_pro_info *pro_info;

    std::vector<std::pair<int,int> > pro_list;

    if((db_conn = center_manage_conndb()) == NULL){
	return -1;
    }

    db_res = PQexec(db_conn,"SELECT DISTINCT \"jmodname\" FROM \"mod\";"); 
    if(PQresultStatus(db_res) != PGRES_TUPLES_OK){
	center_manage_closedb(db_conn);
	return -1;
    }

    db_count = PQntuples(db_res);
    for(i = 0;i < db_count;i++){
	jmod_info = new center_jmod_info(PQgetvalue(db_res,i,0),2);
	center_manage_jmodmap.insert(std::pair<std::string,center_jmod_info*>(jmod_info->name,jmod_info));
    }
    PQclear(db_res);

    db_res = PQexec(db_conn,"SELECT \"proid\",\"cacheid\",\"lang\",\"jmodname\" FROM \"problem\" INNER JOIN \"mod\" ON (\"problem\".\"modid\"=\"mod\".\"modid\");"); 
    if(PQresultStatus(db_res) != PGRES_TUPLES_OK){
	center_manage_closedb(db_conn);
	return -1;
    }

    db_count = PQntuples(db_res);
    for(i = 0;i < db_count;i++){
	sscanf(PQgetvalue(db_res,i,0),"%d",&proid);
	sscanf(PQgetvalue(db_res,i,1),"%d",&cacheid);
	sscanf(PQgetvalue(db_res,i,2),"%d",&lang_flag);
	if((jmod_it = center_manage_jmodmap.find(PQgetvalue(db_res,i,3))) == center_manage_jmodmap.end()){
	    continue;    
	}

	if(manage_updatepro(proid,cacheid,jmod_it->second,lang_flag) == 1){
	    pro_list.push_back(std::make_pair(proid,cacheid));
	    
	    printf("pro update %d %d\n",proid,cacheid);
	}
    }
    PQclear(db_res);

    if(!pro_list.empty()){
	center_judge_updatepro(pro_list);
    }

    center_manage_closedb(db_conn);
    return 0;
}
int center_manage_submitwait(){
    int i;

    PGconn *db_conn;
    PGresult *db_res;
    int db_count;
    int subid;

    if((db_conn = center_manage_conndb()) == NULL){
	return -1;
    }

    db_res = PQexec(db_conn,"SELECT \"subid\" FROM \"submit\" WHERE \"result\"=100;"); 
    if(PQresultStatus(db_res) != PGRES_TUPLES_OK){
	center_manage_closedb(db_conn);
	return -1;
    }

    db_count = PQntuples(db_res);
    for(i = 0;i < db_count;i++){
	sscanf(PQgetvalue(db_res,i,0),"%d",&subid);
	center_manage_submit(subid,"{}");
    }

    PQclear(db_res);
    center_manage_closedb(db_conn);
    return 0;
}


int center_manage_submit(int subid,char *param){
    PGconn *db_conn;
    PGresult *db_res;
    char *db_param[1];
    char db_subid[64];
    
    int uid;
    int proid;
    int lang;
    int result;
    bool rejudge_flag;
    std::map<int,center_pro_info*>::iterator pro_it;
    center_pro_info *pro_info;
    center_jmod_info *jmod_info;
    manage_submit_info *sub_info;

    if((db_conn = center_manage_conndb()) == NULL){
	return -1;
    }

    snprintf(db_subid,sizeof(db_subid),"%d",subid);
    db_param[0] = db_subid;
    db_res = PQexecParams(db_conn,
	    "SELECT \"uid\",\"proid\",\"lang\",\"result\" FROM \"submit\" WHERE \"subid\"=$1;",
	    1,
	    NULL,
	    db_param,
	    NULL,
	    NULL,
	    0); 
    if(PQresultStatus(db_res) != PGRES_TUPLES_OK){
	center_manage_closedb(db_conn);
	return -1;
    }

    sscanf(PQgetvalue(db_res,0,0),"%d",&uid);
    sscanf(PQgetvalue(db_res,0,1),"%d",&proid);
    sscanf(PQgetvalue(db_res,0,2),"%d",&lang);
    sscanf(PQgetvalue(db_res,0,3),"%d",&result);
    PQclear(db_res);
    center_manage_closedb(db_conn);

    if((pro_it = center_manage_promap.find(proid)) == center_manage_promap.end()){
	return -1;
    }
    pro_info = pro_it->second;
    
    if((lang & pro_info->lang_flag) == 0){
	return -1;
    }
    jmod_info = pro_info->jmod_info;

    if(result == JUDGE_WAIT){
	rejudge_flag = false;
    }else{
	rejudge_flag = true;
    }

    center_manage_getpro(pro_info);

    sub_info = new manage_submit_info(subid,uid,jmod_info,pro_info,lang,rejudge_flag,param);
    manage_submap.insert(std::pair<int,manage_submit_info*>(sub_info->subid,sub_info));
    manage_tp->add(manage_submit_thfn,sub_info,manage_submit_cbfn,sub_info);
    
    return 0;
}
static void manage_submit_th(void *data){
    manage_submit_info *sub_info;
    char dir_path[PATH_MAX + 1];
    char pack_path[PATH_MAX + 1];

    sub_info = (manage_submit_info*)data;

    snprintf(dir_path,sizeof(dir_path),"submit/%d/%d/data",(sub_info->subid / 1000) * 1000,sub_info->subid);
    snprintf(pack_path,sizeof(pack_path),"tmp/codepack/%d.tar.bz2",sub_info->subid);
    tool_pack(pack_path,dir_path);
}
static void manage_submit_cb(void *data){
    manage_submit_info *sub_info;
    center_jmod_info *jmod_info;
    center_pro_info *pro_info;

    char cwd_path[PATH_MAX + 1];
    char tpath[PATH_MAX + 1];
    judgm_manage_info *mg_info;
    judgm_manage_submit_fn mg_sub_fn;
    FILE *set_file;
    char lchr;
    char tchr;

    sub_info = (manage_submit_info*)data;
    jmod_info = sub_info->jmod_info;
    pro_info = sub_info->pro_info;

    if(jmod_info->manage_dll == NULL){
	getcwd(cwd_path,sizeof(cwd_path));
	snprintf(tpath,sizeof(tpath),"%s/jmod/%s/%s_manage.so",cwd_path,jmod_info->name,jmod_info->name);

	jmod_info->manage_dll = dlopen(tpath,RTLD_NOW);
	jmod_info->manage_sub_fn = dlsym(jmod_info->manage_dll,"submit");
	jmod_info->manage_res_fn = dlsym(jmod_info->manage_dll,"result");
    }
    mg_sub_fn = (judgm_manage_submit_fn)jmod_info->manage_sub_fn;

    mg_info = sub_info->manage_info;
    snprintf(mg_info->pro_path,sizeof(mg_info->pro_path),"pro/%d",pro_info->proid);
    snprintf(mg_info->res_path,sizeof(mg_info->res_path),"submit/%d/%d/result",(sub_info->subid / 1000) * 1000,sub_info->subid);

    snprintf(tpath,sizeof(tpath),"pro/%d/setting",pro_info->proid);
    set_file = fopen(tpath,"r");
    lchr = '\n';
    while((tchr = fgetc(set_file)) != EOF){
	if(lchr == '\n' && tchr == '='){
	    while(fgetc(set_file) != '\n');
	    break;
	}
	lchr = tchr;
    }

    mg_sub_fn(mg_info,set_file);

    fclose(set_file);
}
DLL_PUBLIC int center_manage_queuesubmit(int subid,int proid,int lang,char *set_data,size_t set_len){
    center_judge_submit(subid,proid,lang,set_data,set_len);
    return 0;
}

int center_manage_result(int subid,char *res_data){
    std::map<int,manage_submit_info*>::iterator sub_it;
    manage_submit_info *sub_info;
    center_jmod_info *jmod_info;

    char res_path[PATH_MAX + 1];
    judgm_manage_info *mg_info;
    judgm_manage_result_fn mg_res_fn;

    PGconn *db_conn;
    PGresult *db_res;
    char db_result[32];
    char db_score[32];
    char db_runtime[32];
    char db_memory[32];
    char db_subid[32];
    char *db_param[5];

    if((sub_it = manage_submap.find(subid)) == manage_submap.end()){
	return -1;
    }
    sub_info = sub_it->second;
    jmod_info = sub_info->jmod_info;
    mg_info = sub_info->manage_info;

    mg_res_fn = (judgm_manage_result_fn)jmod_info->manage_res_fn;
    if(mg_res_fn(mg_info,res_data)){
	manage_submap.erase(sub_it);

	if((db_conn = center_manage_conndb()) == NULL){
	    return -1;
	}

	snprintf(db_result,sizeof(db_result),"%d",mg_info->result);
	snprintf(db_score,sizeof(db_score),"%lf",mg_info->score);
	snprintf(db_runtime,sizeof(db_runtime),"%lu",mg_info->runtime);
	snprintf(db_memory,sizeof(db_memory),"%lu",mg_info->memory / 1024UL);
	snprintf(db_subid,sizeof(db_subid),"%d",subid);
	db_param[0] = db_result;
	db_param[1] = db_score;
	db_param[2] = db_runtime;
	db_param[3] = db_memory;
	db_param[4] = db_subid;
	db_res = PQexecParams(db_conn,
		"UPDATE \"submit\" SET \"result\"=$1,\"score\"=$2,\"runtime\"=$3,\"memory\"=$4 WHERE \"subid\"=$5;",
		5,
		NULL,
		db_param,
		NULL,
		NULL,
		0);
	PQclear(db_res);
	center_manage_closedb(db_conn);

	manage_notice(subid,
		sub_info->uid,
		sub_info->pro_info->proid,
		mg_info->result,
		mg_info->score,
		mg_info->runtime,
		mg_info->memory,
		sub_info->rejudge_flag);

	center_manage_putpro(sub_info->pro_info);
	delete sub_info;
    }else{
	return -1;
    }

    return 0;
}
static int manage_notice(int subid,int uid,int proid,int result,double score,int runtime,int memory,bool rejudge_flag){
    char msg[4096];
    json_object *jso_msg;
    json_object *jso_arg;

    jso_msg = json_object_new_object();
    json_object_object_add(jso_msg,"type",json_object_new_string("result"));
    json_object_object_add(jso_msg,"subid",json_object_new_int(subid));
    json_object_object_add(jso_msg,"proid",json_object_new_int(proid));
    json_object_object_add(jso_msg,"result",json_object_new_int(result));
    json_object_object_add(jso_msg,"score",json_object_new_double(score));
    json_object_object_add(jso_msg,"runtime",json_object_new_int(runtime));
    json_object_object_add(jso_msg,"memory",json_object_new_int(memory / 1024UL));
    json_object_object_add(jso_msg,"rejudge_flag",json_object_new_boolean(rejudge_flag));

    jso_arg = json_object_new_array();
    json_object_array_add(jso_arg,json_object_new_int(uid));
    json_object_array_add(jso_arg,jso_msg);

    event_exec("pzreadtest.php","center_result_event",json_object_get_string(jso_arg));
    json_object_put(jso_arg);

    return 0;
}


center_pro_info* center_manage_getprobyid(int proid){
    std::map<int,center_pro_info*>::iterator pro_it;
    center_pro_info *pro_info;

    if((pro_it = center_manage_promap.find(proid)) == center_manage_promap.end()){
	return NULL;
    }
    pro_info = pro_it->second;

    if(center_manage_getpro(pro_info)){
	return NULL;
    }
    
    return pro_info;
}
int center_manage_getpro(center_pro_info *pro_info){
    pro_info->ref_count++;
    return 0;
}
int center_manage_putpro(center_pro_info *pro_info){
    char tpath[PATH_MAX + 1];

    pro_info->ref_count--;
    if(pro_info->ref_count == 0){
	snprintf(tpath,sizeof(tpath),"tmp/pro/%d_%d",pro_info->proid,pro_info->cacheid);
	tool_cleardir(tpath);
	rmdir(tpath);

	snprintf(tpath,sizeof(tpath),"tmp/propack/%d_%d.tar.bz2",pro_info->proid,pro_info->cacheid);
	unlink(tpath);

	delete pro_info;
    }
    return 0;
}
static int manage_updatepro(int proid,int cacheid,center_jmod_info *jmod_info,int lang_flag){
    std::map<int,center_pro_info*>::iterator pro_it;
    center_pro_info *old_pro_info;
    center_pro_info *update_pro_info;

    char tpath[PATH_MAX + 1];
    struct stat st;
    std::pair<std::map<int,center_pro_info*>::iterator,bool> ins_ret;

    if((pro_it = center_manage_promap.find(proid)) == center_manage_promap.end()){
	old_pro_info = NULL;
    }else{
	old_pro_info = pro_it->second;

	if(old_pro_info->state == CENTER_CACHESTATE_READY && cacheid == old_pro_info->cacheid){
	    return 1;
	}
	if(old_pro_info->state == CENTER_CACHESTATE_UPDATE && (cacheid <= old_pro_info->cacheid || cacheid <= old_pro_info->update_cacheid)){
	    return -1;
	}

	old_pro_info->state = CENTER_CACHESTATE_UPDATE;
	old_pro_info->update_cacheid = cacheid;
    }

    update_pro_info = new center_pro_info(proid,cacheid,jmod_info,lang_flag); //set cacheid 0 to new pro
    center_manage_getpro(update_pro_info);

    snprintf(tpath,sizeof(tpath),"tmp/pro/%d_%d",update_pro_info->proid,update_pro_info->cacheid);
    if(!stat(tpath,&st)){
	snprintf(tpath,sizeof(tpath),"tmp/propack/%d_%d.tar.bz2",update_pro_info->proid,update_pro_info->cacheid);
	if(!stat(tpath,&st)){

	    if(old_pro_info != NULL){
		center_manage_putpro(old_pro_info);
	    }

	    ins_ret = center_manage_promap.insert(std::make_pair(update_pro_info->proid,update_pro_info));
	    if(ins_ret.second == false){
		ins_ret.first->second = update_pro_info;
	    }

	    return 1;
	}
    }

    manage_tp->add(manage_updatepro_thfn,update_pro_info,manage_updatepro_cbfn,update_pro_info);

    return 0;
}
static void manage_updatepro_th(void *data){
    center_pro_info *pro_info;
    char src_path[PATH_MAX + 1];
    char dir_path[PATH_MAX + 1];
    char pack_path[PATH_MAX + 1];

    pro_info = (center_pro_info*)data;

    snprintf(src_path,sizeof(src_path),"pro/%d",pro_info->proid);
    snprintf(dir_path,sizeof(dir_path),"tmp/pro/%d_%d",pro_info->proid,pro_info->cacheid);
    tool_copydir(src_path,dir_path);

    snprintf(pack_path,sizeof(pack_path),"tmp/propack/%d_%d.tar.bz2",pro_info->proid,pro_info->cacheid);
    tool_pack(pack_path,dir_path);
}
static void manage_updatepro_cb(void *data){
    center_pro_info *old_pro_info;
    center_pro_info *update_pro_info;
    std::pair<std::map<int,center_pro_info*>::iterator,bool> ins_ret;
    std::vector<std::pair<int,int> > pro_pair;

    update_pro_info = (center_pro_info*)data;

    ins_ret = center_manage_promap.insert(std::make_pair(update_pro_info->proid,update_pro_info));
    if(ins_ret.second == false){
	old_pro_info = ins_ret.first->second;

	if(update_pro_info->cacheid <= old_pro_info->cacheid){
	    center_manage_putpro(update_pro_info);
	    return;
	}

	center_manage_putpro(ins_ret.first->second);
	ins_ret.first->second = update_pro_info;
    }

    pro_pair.push_back(std::make_pair(update_pro_info->proid,update_pro_info->cacheid));
    center_judge_updatepro(pro_pair);
}

center_jmod_info* center_manage_getjmodbyname(char *name){
    std::map<std::string,center_jmod_info*>::iterator jmod_it;
    center_jmod_info *jmod_info;

    if((jmod_it = center_manage_jmodmap.find(name)) == center_manage_jmodmap.end()){
	return NULL;
    }
    jmod_info = jmod_it->second;

    if(center_manage_getjmod(jmod_info)){
	return NULL;
    }

    return jmod_info;
}
int center_manage_getjmod(center_jmod_info *jmod_info){
    jmod_info->ref_count++;
    return 0;
}
int center_manage_putjmod(center_jmod_info *jmod_info){
    char tpath[PATH_MAX + 1];

    jmod_info->ref_count--;
    if(jmod_info->ref_count == 0){
	snprintf(tpath,sizeof(tpath),"tmp/jmod/%s_%d",jmod_info->name,jmod_info->cacheid);
	tool_cleardir(tpath);
	rmdir(tpath);

	snprintf(tpath,sizeof(tpath),"tmp/jmodpack/%s_%d.tar.bz2",jmod_info->name,jmod_info->cacheid);
	unlink(tpath);

	delete jmod_info;
    }
    return 0;
}
static int manage_updatejmod(char *name,int cacheid){
    std::map<std::string,center_jmod_info*>::iterator jmod_it;
    center_jmod_info *old_jmod_info;
    center_jmod_info *update_jmod_info;

    char tpath[PATH_MAX + 1];
    struct stat st;
    std::pair<std::map<std::string,center_jmod_info*>::iterator,bool> ins_ret;

    if((jmod_it = center_manage_jmodmap.find(name)) == center_manage_jmodmap.end()){
	old_jmod_info = NULL;	
    }else{
	old_jmod_info = jmod_it->second;

	if(old_jmod_info->state == CENTER_CACHESTATE_READY && cacheid == old_jmod_info->cacheid){
	    return -1;
	}
	if(old_jmod_info->state == CENTER_CACHESTATE_UPDATE && (cacheid <= old_jmod_info->cacheid || cacheid <= old_jmod_info->update_cacheid)){
	    return -1;
	}

	old_jmod_info->state = CENTER_CACHESTATE_UPDATE;
	old_jmod_info->update_cacheid = cacheid;
    }

    update_jmod_info = new center_jmod_info(name,cacheid);
    center_manage_getjmod(update_jmod_info);

    snprintf(tpath,sizeof(tpath),"tmp/jmod/%s_%d",update_jmod_info->name,update_jmod_info->cacheid);
    if(!stat(tpath,&st)){
	snprintf(tpath,sizeof(tpath),"tmp/jmodpack/%s_%d.tar.bz2",update_jmod_info->name,update_jmod_info->cacheid);
	if(!stat(tpath,&st)){

	    if(old_jmod_info != NULL){
		center_manage_putjmod(old_jmod_info);

		ins_ret = center_manage_jmodmap.insert(std::make_pair(update_jmod_info->name,update_jmod_info));
		if(ins_ret.second == false){
		    ins_ret.first->second = update_jmod_info;
		}

		return 1;
	    }
	}
    }

    manage_tp->add(manage_updatejmod_thfn,update_jmod_info,manage_updatejmod_cbfn,update_jmod_info);

    return 0;
}
static void manage_updatejmod_th(void *data){
    center_jmod_info *jmod_info;
    char src_path[PATH_MAX + 1];
    char dir_path[PATH_MAX + 1];
    char pack_path[PATH_MAX + 1];

    jmod_info = (center_jmod_info*)data;

    snprintf(src_path,sizeof(src_path),"jmod/%s",jmod_info->name);
    snprintf(dir_path,sizeof(dir_path),"tmp/jmod/%s_%d.tar.bz2",jmod_info->name,jmod_info->cacheid);
    tool_copydir(src_path,dir_path);

    snprintf(pack_path,sizeof(pack_path),"tmp/jmodpack/%s_%d.tar.bz2",jmod_info->name,jmod_info->cacheid);
    tool_pack(pack_path,dir_path);
}
static void manage_updatejmod_cb(void *data){
    center_jmod_info *old_jmod_info;
    center_jmod_info *update_jmod_info;
    std::pair<std::map<std::string,center_jmod_info*>::iterator,bool> ins_ret;
    std::vector<std::pair<std::string,int> > jmod_pair;

    update_jmod_info = (center_jmod_info*)data;

    ins_ret = center_manage_jmodmap.insert(std::make_pair(update_jmod_info->name,update_jmod_info));
    if(ins_ret.second == false){
	old_jmod_info = ins_ret.first->second;

	if(update_jmod_info->cacheid <= old_jmod_info->cacheid){
	    center_manage_putjmod(update_jmod_info);
	}

	center_manage_putjmod(old_jmod_info);
	ins_ret.first->second = update_jmod_info;
    }

    jmod_pair.push_back(std::make_pair(update_jmod_info->name,update_jmod_info->cacheid));
    //wait

    //
}
