class manage_submit_info{
public:
    int subid;
    int uid;
    center_jmod_info *jmod_info;
    center_pro_info *pro_info;
    int lang;
    bool rejudge_flag;
    char param[JUDGE_SUB_PARAMMAX];
    judgm_manage_info *manage_info;

    manage_submit_info(int subid,int uid,center_jmod_info *jmod_info,center_pro_info *pro_info,int lang,bool rejudge_flag,char *param){
	this->subid = subid;
	this->uid = uid;
	this->jmod_info = jmod_info;
	this->pro_info = pro_info;
	this->lang = lang;
	this->rejudge_flag = rejudge_flag;
	this->param[0] = '\0';
	strncat(this->param,param,sizeof(this->param));

	this->manage_info = new judgm_manage_info(this->subid,this->uid,pro_info->proid,this->lang,this->param);
    }
    ~manage_submit_info(){
	delete this->manage_info;
    }
};

static void manage_submit_th(void *data);
static void manage_submit_cb(void *data);
static int manage_notice(int subid,int uid,int proid,int result,double score,int runtime,int memory,bool rejudge_flag);

static int manage_updatepro(int proid,int cacheid,center_jmod_info *jmod_info,int lang_flag);
static void manage_updatepro_th(void *data);
static void manage_updatepro_cb(void *data);
static int manage_updatejmod(char *name,int cacheid);
static void manage_updatejmod_th(void *data);
static void manage_updatejmod_cb(void *data);

static tpool *manage_tp;
static tpool_static_fn *manage_updatepro_thfn;
static tpool_static_fn *manage_updatepro_cbfn;
static tpool_static_fn *manage_updatejmod_thfn;
static tpool_static_fn *manage_updatejmod_cbfn;
static tpool_static_fn *manage_submit_thfn;
static tpool_static_fn *manage_submit_cbfn;
static std::map<int,manage_submit_info*> manage_submap;

int center_manage_init(tpool **tpinfo);
PGconn* center_manage_conndb();
int center_manage_closedb(PGconn *conn);
int center_manage_updatedata();
int center_manage_submitwait();
int center_manage_submit(int subid,char *param);
int center_manage_result(int subid,char *res_data);
DLL_PUBLIC int center_manage_queuesubmit(int subid,int proid,int lang,char *set_data,size_t set_len);

center_pro_info* center_manage_getprobyid(int proid);
int center_manage_getpro(center_pro_info*);
int center_manage_putpro(center_pro_info *pro_info);
center_jmod_info* center_manage_getjmodbyname(char *name);
int center_manage_getjmod(center_jmod_info *jmod_info);
int center_manage_putjmod(center_jmod_info *jmod_info);

std::map<int,center_pro_info*> center_manage_promap;
std::map<std::string,center_jmod_info*> center_manage_jmodmap;

extern int tool_pack(char *pack_path,char *dir_path);
extern int tool_unpack(char *pack_path,char *dir_path);
extern int tool_cleardir(char *path);
extern int tool_copydir(char *old_path,char *new_path);

extern int center_judge_submit(int subid,int proid,int lang,char *set_data,size_t set_len);
extern int center_judge_updatepro(std::vector<std::pair<int,int> > &pro_list);
