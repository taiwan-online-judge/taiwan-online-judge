class judge_info;
class judge_conn;
class judge_submit_info;

class judge_info{
private:
    static int last_id;

public:
    int id;
    int avail;
    judge_conn *conn_main;
    std::list<judge_conn*> conn_list;
    std::list<judge_info*>::iterator judge_it;
    std::map<int,center_pro_info*> pro_map;
    std::map<std::string,center_jmod_info*> jmod_map;
    
    judge_info();
    ~judge_info();
    int setavail(int value);
    int setinfo(int avail);
    int submit(judge_submit_info *submit_info);
    int result(int subid,char *res_data);
};

class judge_conn : public netio{
private:
    netio_iofn<judge_conn> *recv_dispatch_fn;
    netio_iofn<judge_conn> *recv_setid_fn;
    netio_iofn<judge_conn> *recv_setinfo_fn;
    netio_iofn<judge_conn> *recv_result_fn;
    netio_iofn<judge_conn> *recv_setpro_fn;
    netio_iofn<judge_conn> *recv_reqpro_fn;
    netio_iofn<judge_conn> *recv_setjmod_fn;
    netio_iofn<judge_conn> *recv_reqjmod_fn;
    netio_iofn<judge_conn> *recv_reqcode_fn;

    char* create_combuf(int code,int size,int &len,void **data);
    void recv_dispatch(void *buf,size_t len,void *data);
    void recv_setid(void *buf,size_t len,void *data);
    void recv_setinfo(void *buf,size_t len,void *data);
    void recv_result(void *buf,size_t len,void *data);
    void recv_setpro(void *buf,size_t len,void *data);
    void recv_reqpro(void *buf,size_t len,void *data);
    void recv_setjmod(void *buf,size_t len,void *data);
    void recv_reqjmod(void *buf,size_t len,void *data);
    void recv_reqcode(void *buf,size_t len,void *data);

public:
    judge_info *info;
    std::list<judge_conn*>::iterator conn_it;

    judge_conn(int fd);
    ~judge_conn();
    int send_setid(int judgeid);
    int send_submit(judge_submit_info* submit_info);
    int send_setpro(int *proid,int *cacheid,int type,int count);
    int send_setjmod(char **jmod_name,int *cacheid,int type,int count);
    virtual int readidle();
};

class judge_submit_info{
public:
    int subid;
    int proid;
    int lang;
    char set_data[JUDGE_SET_DATAMAX];
    size_t set_len;

    judge_submit_info(int subid,int proid,int lang,char *setdata,size_t setlen){
	this->subid = subid;
	this->proid = proid;
	this->lang = lang;
	if(setlen > JUDGE_SET_DATAMAX){
	    memcpy(this->set_data,setdata,JUDGE_SET_DATAMAX);
	}else{
	    memcpy(this->set_data,setdata,setlen);
	}
	this->set_len = setlen;
    }
};

static int judge_submit_waitqueue();

static std::map<int,judge_info*> judge_idmap;
static std::list<judge_info*> judge_runlist;
static std::queue<judge_submit_info*> judge_submitqueue;

int center_judge_init();
void* center_judge_addconn(int fd);
int center_judge_dispatch(int evflag,void *data);
int center_judge_submit(int subid,int proid,int lang,char *setdata,size_t setlen);

extern int center_manage_result(int subid,char *res_data);

extern std::map<std::string,center_jmod_info*> center_manage_jmodmap;
extern std::map<int,center_pro_info*> center_manage_promap;



/*#define JUDGE_DB_MAXSCOREMAX 1024
static int tmp_init();
static int tmp_update(int submitid,int count,void *data);
static int server_updatedb(PGconn *sqlc,int submitid,int result_count,struct judgx_line_result *result);

static PGconn *tmp_sqlc;*/
