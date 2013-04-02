#define CENTER_CACHESTATE_READY 0
#define CENTER_CACHESTATE_UPDATE 1

class center_jmod_info{
public:
    char name[NAME_MAX + 1];
    int cacheid;
    void *manage_dll;
    void *manage_sub_fn;
    void *manage_res_fn;

    int ref_count;
    int state;
    int update_cacheid;

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

    int ref_count;
    int state;
    int update_cacheid;

    center_pro_info(int proid,int cacheid,center_jmod_info *jmod_info,int lang_flag){
	this->proid = proid;
	this->cacheid = cacheid;
	this->jmod_info = jmod_info;
	this->lang_flag = lang_flag;

	this->ref_count = 0;
	this->state = CENTER_CACHESTATE_READY;
	this->update_cacheid = 0;
    }
};
