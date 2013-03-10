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
#include<json/json.h>
#include<vector>
#include<queue>
#include<map>
#include<string>

#include"tpool.h"
#include"/srv/http/toj/php/event_exec.h"
#include"center.h"
#include"judge_def.h"
#include"judgm_manage.h"
#include"center_manage.h"

int center_manage_init(tpool **tpinfo){
    manage_packtp = new tpool(4);
    manage_packtp->start();
    *tpinfo = manage_packtp;

    manage_packcode_thfn = new tpool_static_fn(manage_packcode_th);
    manage_packcode_cbfn = new tpool_static_fn(manage_packcode_cb);

    center_manage_updatedata(); 
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
    center_jmod_info *jmod_info;
    int proid;
    int lang_flag;
    std::map<std::string,center_jmod_info*>::iterator jmod_it;
    center_pro_info *pro_info;

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

    db_res = PQexec(db_conn,"SELECT \"proid\",\"jmodname\",\"lang\" FROM \"problem\" INNER JOIN \"mod\" ON (\"problem\".\"modid\"=\"mod\".\"modid\");"); 
    if(PQresultStatus(db_res) != PGRES_TUPLES_OK){
	center_manage_closedb(db_conn);
	return -1;
    }

    db_count = PQntuples(db_res);
    for(i = 0;i < db_count;i++){
	sscanf(PQgetvalue(db_res,i,0),"%d",&proid);
	sscanf(PQgetvalue(db_res,i,2),"%d",&lang_flag);
	if((jmod_it = center_manage_jmodmap.find(PQgetvalue(db_res,i,1))) == center_manage_jmodmap.end()){
	    continue;    
	}
	pro_info = new center_pro_info(proid,1,jmod_it->second,lang_flag);
	center_manage_promap.insert(std::pair<int,center_pro_info*>(pro_info->proid,pro_info));
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
    center_submit_info *sub_info;

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

    sub_info = new center_submit_info(subid,uid,jmod_info,pro_info,lang,rejudge_flag,param);
    center_manage_submap.insert(std::pair<int,center_submit_info*>(sub_info->subid,sub_info));
    manage_packtp->add(manage_packcode_thfn,sub_info,manage_packcode_cbfn,sub_info);
    
    return 0;
}
static void manage_packcode_th(void *data){
    center_submit_info *sub_info;
    int subid;
    char dir_path[PATH_MAX + 1];
    char pack_path[PATH_MAX + 1];

    sub_info = (center_submit_info*)data;
    subid = sub_info->subid;

    snprintf(dir_path,sizeof(dir_path),"submit/%d/%d/data",(subid / 1000) * 1000,subid);
    snprintf(pack_path,sizeof(pack_path),"tmp/codepack/%d.tar.bz2",subid);
    pack_pack(pack_path,dir_path);
}
static void manage_packcode_cb(void *data){
    center_submit_info *sub_info;
    center_jmod_info *jmod_info;
    center_pro_info *pro_info;

    char cwd_path[PATH_MAX + 1];
    char tpath[PATH_MAX + 1];
    judgm_manage_submit_fn mod_sub_fn;
    judgm_manage_submitinfo mod_sub_info;
    FILE *set_file;
    char lchr;
    char tchr;

    sub_info = (center_submit_info*)data;
    jmod_info = sub_info->jmod_info;
    pro_info = sub_info->pro_info;

    if(jmod_info->manage_dll == NULL){
	getcwd(cwd_path,sizeof(cwd_path));
	snprintf(tpath,sizeof(tpath),"%s/jmod/%s/%s_manage.so",cwd_path,jmod_info->name,jmod_info->name);

	jmod_info->manage_dll = dlopen(tpath,RTLD_NOW);
	jmod_info->manage_sub_fn = dlsym(jmod_info->manage_dll,"submit");
	jmod_info->manage_res_fn = dlsym(jmod_info->manage_dll,"result");
    }
    mod_sub_fn = (judgm_manage_submit_fn)jmod_info->manage_sub_fn;

    mod_sub_info.uid = sub_info->uid;
    mod_sub_info.subid = sub_info->subid;
    mod_sub_info.proid = pro_info->proid;
    mod_sub_info.lang = sub_info->lang;
    mod_sub_info.param = sub_info->param;
    snprintf(mod_sub_info.pro_path,sizeof(mod_sub_info.pro_path),"pro/%d",pro_info->proid);
    
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
    mod_sub_info.set_file = set_file;

    mod_sub_fn(&mod_sub_info,&sub_info->jmod_manage_data);

    fclose(set_file);
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

int center_manage_result(int subid,char *res_data){
    int ret;

    std::map<int,center_submit_info*>::iterator sub_it;
    center_submit_info *sub_info;
    center_jmod_info *jmod_info;

    char res_path[PATH_MAX + 1];
    judgm_manage_resultinfo res_info;
    judgm_manage_result_fn res_fn;

    PGconn *db_conn;
    PGresult *db_res;
    char db_result[32];
    char db_score[32];
    char db_runtime[32];
    char db_memory[32];
    char db_subid[32];
    char *db_param[5];

    if((sub_it = center_manage_submap.find(subid)) == center_manage_submap.end()){
	return -1;
    }
    sub_info = sub_it->second;
    jmod_info = sub_info->jmod_info;

    res_info.uid = sub_info->uid;
    res_info.subid = subid;
    res_info.proid = sub_info->pro_info->proid;
    snprintf(res_path,sizeof(res_path),"submit/%d/%d/result",(subid / 1000) * 1000,subid);
    res_info.res_path = res_path;
    res_info.res_data = res_data;
    res_fn = (judgm_manage_result_fn)jmod_info->manage_res_fn;
    ret = res_fn(&res_info,sub_info->jmod_manage_data);
    if(ret == 1){
	center_manage_submap.erase(sub_it);

	if((db_conn = center_manage_conndb()) == NULL){
	    return -1;
	}

	snprintf(db_result,sizeof(db_result),"%d",res_info.result);
	snprintf(db_score,sizeof(db_score),"%lld",(int)res_info.score);
	snprintf(db_runtime,sizeof(db_runtime),"%lu",res_info.runtime);
	snprintf(db_memory,sizeof(db_memory),"%lu",res_info.memory / 1024UL);
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
		res_info.result,
		res_info.score,
		res_info.runtime,
		res_info.memory,
		sub_info->rejudge_flag);

	delete sub_info;
    }else{
	return -1;
    }

    return 0;
}
DLL_PUBLIC int center_manage_queuesubmit(int subid,int proid,int lang,char *set_data,size_t set_len){
    center_judge_submit(subid,proid,lang,set_data,set_len);
    return 0;
}
