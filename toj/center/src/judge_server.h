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
    tpool_fn<server_conn> *tp_unpackjmod_thfn;
    tpool_fn<server_conn> *tp_unpackjmod_cbfn;

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
    void tp_unpackjmod_th(void *data);
    void tp_unpackjmod_cb(void *data);

public:
    server_conn(int fd);
    int send_setid();
    int send_setinfo();
    int send_result(int subid,char *res_data,size_t res_len);
    int send_reqpro(int proid,int cacheid);
    int send_setpro(std::vector<std::pair<int,int> > &pro_list,int type);
    int send_setjmod(char **jmod_name,int *cacheid,int type,int count);
    int send_reqcode(int subid);
    virtual int readidle();
};

static int server_addepev(int fd,unsigned int flag,int type,void *data);
static int server_delepev(server_epevdata *epevdata);
static server_conn* server_connect();

static int server_id;
static int server_avail;
static int server_epfd;
static server_conn *server_mainconn;
static server_conn *server_fileconn;
static server_conn *server_codeconn;
static tpool *server_packtp;

int judge_server_addtpool(tpool *tpinfo);
int judge_server_setpro(std::vector<std::pair<int,int> > &pro_list);
int judge_server_reqcode(int subid);
int judge_server_result(int subid,char *res_data,int res_len);

extern int tool_pack(char *pack_path,char *dir_path);
extern int tool_unpack(char *pack_path,char *dir_path);
extern int tool_cleardir(char *path);

extern int judge_manage_init();
extern judge_pro_info* judge_manage_getprobyid(int proid);
extern int judge_manage_getpro(judge_pro_info *pro_info);
extern int judge_manage_putpro(judge_pro_info *pro_info);
extern int judge_manage_updatepro(int proid,int cacheid,bool check_flag,judge_pro_info **update_pro_info);
extern int judge_manage_done_updatepro(judge_pro_info *pro_info);
extern int judge_manage_submit(int subid,int proid,int lang,char *set_data);
extern int judge_manage_done_code(int subid);

