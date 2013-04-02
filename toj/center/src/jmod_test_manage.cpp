#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<limits.h>
#include<dlfcn.h>
#include<json/json.h>

#include"judge_def.h"
#include"judgm_lib.h"
#include"judgm_manage.h"
#include"jmod_test.h"
#include"jmod_test_manage.h"

static void __attribute__ ((constructor)) manage_init(){
    manage_queuesubmit_fn = (judgm_manage_queuesubmit_fn)dlsym(dlopen(NULL,RTLD_NOW),"center_manage_queuesubmit");
}
static int manage_load_setfile(FILE *set_file,int &count){
    int ret;

    json_object *jso;
    char buf[JUDGE_SET_FILEMAX];

    fread(buf,1,sizeof(buf),set_file);
    jso = json_tokener_parse(buf);

    count = json_object_get_int(json_object_object_get(jso,"count"));

    json_object_put(jso);
    return 0;
}

DLL_PUBLIC int submit(judgm_manage_info *info,FILE *set_file){
    int i;

    int count;
    manage_result_info *res_info;
    line_set_data set_data;

    manage_load_setfile(set_file,count);

    res_info = new manage_result_info(count);
    info->private_data = res_info;

    for(i = 0;i < count;i++){
	set_data.id = i + 1;
	manage_queuesubmit_fn(info->subid,info->proid,info->lang,(char*)&set_data,sizeof(line_set_data));
    }

    return 0;
}
DLL_PUBLIC int result(judgm_manage_info *info,line_result_data *res_data){
    manage_result_info *res_info;
    json_object *jso_item;
    char tpath[PATH_MAX + 1];

    res_info = (manage_result_info*)info->private_data;
    res_info->count++;

    if(res_data->status > res_info->result){
	res_info->result = res_data->status;
    }
    res_info->totalscore += res_data->score;
    res_info->totalruntime += res_data->runtime;
    if(res_data->memory > res_info->maxmemory){
	res_info->maxmemory = res_data->memory;
    }

    jso_item = json_object_new_object();
    json_object_object_add(jso_item,"status",json_object_new_int(res_data->status));
    json_object_object_add(jso_item,"score",json_object_new_double(res_data->score));
    json_object_object_add(jso_item,"runtime",json_object_new_int64(res_data->runtime));
    json_object_object_add(jso_item,"memory",json_object_new_int64(res_data->memory / 1024UL));
    if(strlen(res_data->err_msg) > 0){
	printf("  strlen %d\n",strlen(res_data->err_msg));
	json_object_object_add(jso_item,"errmsg",json_object_new_string(res_data->err_msg));
    }
    json_object_array_put_idx(res_info->jso_resarray,res_data->id - 1,jso_item);
    
    printf("jmod count %d %d\n",res_info->count,res_info->allcount);

    if(res_info->count == res_info->allcount){
	snprintf(tpath,sizeof(tpath),"%s/result",info->res_path);
	json_object_to_file_ext(tpath,res_info->jso_res,JSON_C_TO_STRING_PLAIN);

	info->result = res_info->result;
	info->score = res_info->totalscore;
	info->runtime = res_info->totalruntime;
	info->memory = res_info->maxmemory;
	
	delete res_info;
	return 1;
    }
    return 0;
}


