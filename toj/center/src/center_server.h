#define SERVER_JUDGE_PORT 2573
#define SERVER_WEB_PORT 2501
#define SERVER_EPOLL_MAXEVENT 4096

#define SERVER_EPEV_JUDGESERVER 0
#define SERVER_EPEV_JUDGECLIENT 1
#define SERVER_EPEV_WEBSERVER 2
#define SERVER_EPEV_WEBCLIENT 3
#define SERVER_EPEV_TPOOL 4
class server_epevdata{
public:
    int fd;
    int type;
    void *data;

    server_epevdata(int fd,int type,void *data);
};

class server_web_conn{
private:
    int fd;
    char buf[65536];
    int off;
    int count;

public:
    server_web_conn(int fd);
    ~server_web_conn();
    int readio();
};

static int server_addepev(int fd,unsigned int flag,int type,void *data);
static int server_delepev(server_epevdata *epevdata);
static int server_epfd;

extern int center_manage_init(tpool **tpinfo);
extern int center_manage_updatedata();
extern int center_manage_submit(int subid,char *param);

extern int center_judge_init();
extern void* center_judge_addconn(int fd);
extern int center_judge_dispatch(int ev_flag,void *data);

extern int pack_pack(char *pack_path,char *dir_path);
extern int pack_unpack(char *pack_path,char *target_path);
