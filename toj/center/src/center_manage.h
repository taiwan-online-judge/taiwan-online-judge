static void manage_packcode_th(void *data);
static void manage_packcode_cb(void *data);
static int manage_notice(int subid,int uid,int proid,int result,double score,int runtime,int memory,bool rejudge_flag);

static tpool *manage_packtp;
static tpool_static_fn *manage_packcode_thfn;
static tpool_static_fn *manage_packcode_cbfn;

int center_manage_init(tpool **tpinfo);
PGconn* center_manage_conndb();
int center_manage_closedb(PGconn *conn);
int center_manage_updatedata();
int center_manage_submit(int subid,char *param);
int center_manage_result(int subid,char *res_data);
DLL_PUBLIC int center_manage_queuesubmit(int subid,int proid,int lang,char *set_data,size_t set_len);

std::map<std::string,center_jmod_info*> center_manage_jmodmap;
std::map<int,center_pro_info*> center_manage_promap;
std::map<int,center_submit_info*> center_manage_submap;

extern int pack_pack(char *pack_path,char *dir_path);
extern int pack_unpack(char *pack_path,char *dir_path);
extern int center_judge_submit(int subid,int proid,int lang,char *set_data,size_t set_len);
