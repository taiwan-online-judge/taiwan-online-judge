#define SERVER_JUDGE_PORT 2573
#define SERVER_EPOLL_MAXEVENT 4096

#define SERVER_EPEV_JUDGECLIENT 0
#define SERVER_EPEV_TPOOL 1
class server_epevdata{
public:
    int fd;
    int type;
    void *data;

    server_epevdata(int fd,int type,void *data);
};

class server_conn : public netio{
private:
    netio_iofn<server_conn> *recv_dispatch_fn;
    netio_iofn<server_conn> *recv_setid_fn;
    netio_iofn<server_conn> *recv_submit_fn;
    netio_iofn<server_conn> *recv_setpro_fn;
    netio_iofn<server_conn> *recv_sendpro_fn;
    netio_iofn<server_conn> *done_sendpro_fn;
    netio_iofn<server_conn> *recv_setjmod_fn;
    netio_iofn<server_conn> *recv_sendjmod_fn;
    netio_iofn<server_conn> *done_sendjmod_fn;
    netio_iofn<server_conn> *recv_sendcode_fn;
    netio_iofn<server_conn> *done_sendcode_fn;
    tpool_fn<server_conn> *tp_unpackpro_thfn;
    tpool_fn<server_conn> *tp_unpackpro_cbfn;
    tpool_fn<server_conn> *tp_unpackjmod_thfn;
    tpool_fn<server_conn> *tp_unpackjmod_cbfn;
    tpool_fn<server_conn> *tp_unpackcode_thfn;
    tpool_fn<server_conn> *tp_unpackcode_cbfn;
    tpool_fn<server_conn> *tp_judge_thfn;
    tpool_fn<server_conn> *tp_judge_cbfn;

    char* create_combuf(int code,int size,int &len,void **data);
    void recv_dispatch(void *buf,size_t len,void *data);
    void recv_setid(void *buf,size_t len,void *data);
    void recv_submit(void *buf,size_t len,void *data);
    void recv_setpro(void *buf,size_t len,void *data);
    void recv_sendpro(void *buf,size_t len,void *data);
    void done_sendpro(void *buf,size_t len,void *data);
    void recv_setjmod(void *buf,size_t len,void *data);
    void recv_sendjmod(void *buf,size_t len,void *data);
    void done_sendjmod(void *buf,size_t len,void *data);
    void recv_sendcode(void *buf,size_t len,void *data);
    void done_sendcode(void *buf,size_t len,void *data);
    void tp_unpackpro_th(void *data);
    void tp_unpackpro_cb(void *data);
    void tp_unpackjmod_th(void *data);
    void tp_unpackjmod_cb(void *data);
    void tp_unpackcode_th(void *data);
    void tp_unpackcode_cb(void *data);
    void tp_judge_th(void *data);
    void tp_judge_cb(void *data);

public:
    server_conn(int fd);
    int send_setid();
    int send_setinfo();
    int send_result(int subid,char *res_data,size_t res_len);
    int send_setpro(int *proid,int *cacheid,int type,int count);
    int send_setjmod(char **jmod_name,int *cacheid,int type,int count);
    virtual int readidle();
};

class server_judgeth_info{
public:
    bool use_flag;
    int thid;
    char run_path[PATH_MAX + 1];
    center_com_submit *sub;
    char res_data[JUDGE_RES_DATAMAX];
    size_t res_len;

    server_judgeth_info(int thid){
	this->use_flag = false;
	this->thid = thid;
	snprintf(this->run_path,sizeof(this->run_path),"tmp/run/%d",thid);
	mkdir(this->run_path,0775);
	this->sub = NULL;
	this->res_len = 0;
    }
};

static int server_queuejudge(center_com_submit *sub,tpool_protofn *th_fn,tpool_protofn *cb_fn);
static int server_judge(int subid,char *pro_path,char *code_path,char *run_path,int lang,char *set_data,char *res_data,size_t &res_len);
static int server_cleardir_callback(const char *path,const struct stat *st,int flag,struct FTW *ftw_buf);
static int server_cleardir(char *path);
static int server_addepev(int fd,unsigned int flag,int type,void *data);
static int server_delepev(server_epevdata *epevdata);
static server_conn* server_connect();

static int server_id;
static int server_avail;
static std::multimap<int,center_com_submit*> server_submap;
static int server_epfd;
static server_conn *server_mainconn;
static server_conn *server_fileconn;
static server_conn *server_codeconn;
static tpool *server_packtp;
static server_judgeth_info *server_judgepool[8];
static tpool *server_judgetp;

extern int pack_pack(char *pack_path,char *dir_path);
extern int pack_unpack(char *pack_path,char *dir_path);
