typedef int (*judgm_manage_queuesubmit_fn)(int subid,int proid,int lang,char *set_data,size_t set_len);

struct judgm_manage_submitinfo{
    int subid;
    int uid;
    int proid;
    int lang;
    char *param;

    char pro_path[PATH_MAX + 1];
    FILE *set_file;
};
typedef int (*judgm_manage_submit_fn)(judgm_manage_submitinfo *info,void **manage_data);

struct judgm_manage_resultinfo{
    int subid;
    int uid;
    int proid;
    char *res_path;
    char *res_data;

    int result;
    double score;
    unsigned long runtime;
    unsigned long memory;
};
typedef int (*judgm_manage_result_fn)(judgm_manage_resultinfo *info,void *manage_data);
