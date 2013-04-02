class manage_judgeth_info{
public:
    bool use_flag;
    int thid;
    char run_path[PATH_MAX + 1];
    judge_submit_info *sub_info;
    char res_data[JUDGE_RES_DATAMAX];
    size_t res_len;

    manage_judgeth_info(int thid){
	this->use_flag = false;
	this->thid = thid;
	snprintf(this->run_path,sizeof(this->run_path),"tmp/run/%d",thid);
	mkdir(this->run_path,0775);
	this->sub_info = NULL;
	this->res_len = 0;
    }
};

static void manage_updatepro_th(void *data);
static void manage_updatepro_cb(void *data);
static void manage_unpackcode_th(void *data);
static void manage_unpackcode_cb(void *data);
static void manage_judge_th(void *data);
static void manage_judge_cb(void *data);
static int manage_queuejudge(judge_submit_info *sub_info);
static int manage_judge(int subid,char *pro_path,char *code_path,char *run_path,int lang,char *set_data,char *res_data,size_t &res_len);

static tpool *manage_tp;
static int manage_judgk_modfd;
static manage_judgeth_info *manage_judgepool[16];
static tpool_static_fn *manage_updatepro_thfn;
static tpool_static_fn *manage_updatepro_cbfn;
static tpool_static_fn *manage_unpackcode_thfn;
static tpool_static_fn *manage_unpackcode_cbfn;
static tpool_static_fn *manage_judge_thfn;
static tpool_static_fn *manage_judge_cbfn;
static std::multimap<int,judge_submit_info*> manage_submap;

int judge_manage_init();
int judge_manage_updatedata();
judge_pro_info* judge_manage_getprobyid(int proid);
int judge_manage_getpro(judge_pro_info *pro_info);
int judge_manage_putpro(judge_pro_info *pro_info);
int judge_manage_updatepro(int proid,int cacheid,bool check_flag,judge_pro_info **update_pro_info);
int judge_manage_done_updatepro(judge_pro_info *pro_info);
int judge_manage_submit(int subid,int proid,int lang,char *set_data);
int judge_manage_done_code(int subid);

std::map<int,judge_pro_info*> judge_manage_promap;

extern int tool_pack(char *pack_path,char *dir_path);
extern int tool_unpack(char *pack_path,char *dir_path);
extern int tool_cleardir(char *path);

extern int judge_server_addtpool(tpool *tpinfo);
extern int judge_server_setpro(std::vector<std::pair<int,int> > &pro_list);
extern int judge_server_reqpro(int subid);
extern int judge_server_reqcode(int subid);
extern int judge_server_result(int subid,char *res_data,int res_len);
