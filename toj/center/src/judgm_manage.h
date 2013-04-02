typedef int (*judgm_manage_queuesubmit_fn)(int subid,int proid,int lang,char *set_data,size_t set_len);

class judgm_manage_info{
public:
    int subid;
    int uid;
    int proid;
    int lang;
    char *param;
    char pro_path[PATH_MAX + 1];
    char res_path[PATH_MAX + 1];

    int result;
    double score;
    unsigned long runtime;
    unsigned long memory;

    void *private_data;

    judgm_manage_info(int subid,int uid,int proid,int lang,char *param){
	this->subid = subid;
	this->uid = uid;
	this->proid = proid;
	this->lang = lang;
	this->param = param;
    }
};
typedef int (*judgm_manage_submit_fn)(judgm_manage_info *info,FILE *set_file);
typedef int (*judgm_manage_result_fn)(judgm_manage_info *info,char *res_data);
