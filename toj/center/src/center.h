class center_jmod_info{
public:
    char name[NAME_MAX + 1];
    int cacheid;
    void *manage_dll;
    void *manage_sub_fn;
    void *manage_res_fn;

    center_jmod_info(char *name,int cacheid){
	this->name[0] = '\0';
	strncat(this->name,name,sizeof(this->name));
	this->cacheid = cacheid;
	this->manage_dll = NULL;
	this->manage_sub_fn = NULL;
	this->manage_res_fn = NULL;
    }
};

class center_pro_info{
public:
    int proid;
    int cacheid;
    center_jmod_info *jmod_info;
    int lang_flag;

    center_pro_info(int proid,int cacheid,center_jmod_info *jmod_info,int lang_flag){
	this->proid = proid;
	this->cacheid = cacheid;
	this->jmod_info = jmod_info;
	this->lang_flag = lang_flag;
    }
};

class center_submit_info{
public:
    int subid;
    int uid;
    center_jmod_info *jmod_info;
    center_pro_info *pro_info;
    int lang;
    char *param;
    void *jmod_manage_data;

    center_submit_info(int subid,int uid,center_jmod_info *jmod_info,center_pro_info *pro_info,int lang,char *param){
	this->subid = subid;
	this->uid = uid;
	this->jmod_info = jmod_info;
	this->pro_info = pro_info;
	this->lang = lang;
	this->param = param;
	this->jmod_manage_data = NULL;
    }
};
