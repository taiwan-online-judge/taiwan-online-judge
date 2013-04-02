#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<unistd.h>
#include<fcntl.h>
#include<dlfcn.h>
#include<signal.h>
#include<limits.h>
#include<pthread.h>
#include<semaphore.h>
#include<errno.h>
#include<sys/types.h>
#include<sys/socket.h>
#include<sys/epoll.h>
#include<sys/eventfd.h>
#include<sys/sendfile.h>
#include<sys/mman.h>
#include<netinet/in.h>
#include<arpa/inet.h>
#include<map>
#include<queue>

#include"netio.h"
#include"tpool.h"
#include"judge_def.h"
#include"judge.h"
#include"center_com.h"
#include"judgm_line.h"
#include"judgm_lib.h"
#include"judge_server.h"

server_epevdata::server_epevdata(int fd,int type,void *data){
    this->fd = fd;
    this->type = type;
    this->data = data;
}


server_conn::server_conn(int fd):netio(fd){
    this->recv_dispatch_fn = new netio_iofn<server_conn>(this,&server_conn::recv_dispatch);
    this->recv_setid_fn = new netio_iofn<server_conn>(this,&server_conn::recv_setid);
    this->recv_submit_fn = new netio_iofn<server_conn>(this,&server_conn::recv_submit);
    this->recv_setpro_fn = new netio_iofn<server_conn>(this,&server_conn::recv_setpro);
    this->recv_sendpro_fn = new netio_iofn<server_conn>(this,&server_conn::recv_sendpro);
    this->done_sendpro_fn = new netio_iofn<server_conn>(this,&server_conn::done_sendpro);
    this->recv_setjmod_fn = new netio_iofn<server_conn>(this,&server_conn::recv_setjmod);
    this->recv_sendjmod_fn = new netio_iofn<server_conn>(this,&server_conn::recv_sendjmod);
    this->done_sendjmod_fn = new netio_iofn<server_conn>(this,&server_conn::done_sendjmod);
    this->recv_sendcode_fn = new netio_iofn<server_conn>(this,&server_conn::recv_sendcode);
    this->done_sendcode_fn = new netio_iofn<server_conn>(this,&server_conn::done_sendcode);
    this->tp_unpackjmod_thfn = new tpool_fn<server_conn>(this,&server_conn::tp_unpackjmod_th);
    this->tp_unpackjmod_cbfn = new tpool_fn<server_conn>(this,&server_conn::tp_unpackjmod_cb);

    send_setid();
}
char* server_conn::create_combuf(int code,int size,int &len,void **data){
    char *buf;
    center_com_header *header; 

    buf = new char[sizeof(center_com_header) + size];
    header = (center_com_header*)buf;
    header->code = code;
    header->size = size;
    len = sizeof(center_com_header) + size;
    *data = (void*)(buf + sizeof(center_com_header));

    return buf;
}
int server_conn::send_setid(){
    char *write_buf;
    int write_len;
    center_com_setid *setid;

    write_buf = create_combuf(CENTER_COMCODE_SETID,sizeof(center_com_setid),write_len,(void**)&setid);
    setid->id = server_id;
    writebytes(write_buf,write_len,NULL,NULL);

    return 0;
}
int server_conn::send_setinfo(){
    char *write_buf;
    int write_len; 
    center_com_setinfo *setinfo;

    write_buf = create_combuf(CENTER_COMCODE_SETINFO,sizeof(center_com_setinfo),write_len,(void**)&setinfo);
    setinfo->avail = server_avail;
    writebytes(write_buf,write_len,NULL,NULL);

    return 0;
}
int server_conn::send_result(int subid,char *res_data,size_t res_len){
    char *write_buf;
    int write_len;
    center_com_result *result;

    if(res_len > JUDGE_RES_DATAMAX){
	return -1;
    }

    write_buf = create_combuf(CENTER_COMCODE_RESULT,sizeof(center_com_result) + res_len,write_len,(void**)&result);
    result->subid = subid;
    memcpy((void*)(write_buf + sizeof(center_com_header) + sizeof(center_com_result)),res_data,res_len);
    writebytes(write_buf,write_len,NULL,NULL);

    return 0;
}
int server_conn::send_reqpro(int proid,int cacheid){
    char *write_buf;
    int write_len;
    center_com_reqpro *reqpro;

    write_buf = create_combuf(CENTER_COMCODE_REQPRO,sizeof(center_com_reqpro),write_len,(void**)&reqpro);
    reqpro->proid = proid;
    reqpro->cacheid = cacheid;
    writebytes(write_buf,write_len,NULL,NULL);
}
int server_conn::send_setpro(std::vector<std::pair<int,int> > &pro_list,int type){
    int i;
    int count;
    char *write_buf;
    int write_len;
    center_com_setpro *setpro;
    judge_pro_info *pro_info;

    count = pro_list.size();
    write_buf = create_combuf(CENTER_COMCODE_SETPRO,sizeof(center_com_setpro) * count,write_len,(void**)&setpro);

    for(i = 0;i < count;i++){
	setpro[i].proid = pro_list[i].first;
	setpro[i].cacheid = pro_list[i].second;
	setpro[i].type = type;
    }
    writebytes(write_buf,write_len,NULL,NULL);

    return 0;
}
int server_conn::send_setjmod(char **jmod_name,int *cacheid,int type,int count){
    int i;

    char *write_buf;
    int write_len;
    center_com_setjmod *setjmod;

    write_buf = create_combuf(CENTER_COMCODE_SETJMOD,sizeof(center_com_setjmod) * count,write_len,(void**)&setjmod);
    for(i = 0;i < count;i++){
	setjmod[i].jmod_name[0] = '\0';	
	strncat(setjmod[i].jmod_name,jmod_name[i],sizeof(setjmod[i].jmod_name));
	setjmod[i].cacheid = cacheid[i];
	setjmod[i].type = type;
    }
    writebytes(write_buf,write_len,NULL,NULL);

    return 0;
}
int server_conn::send_reqcode(int subid){
    char *write_buf;
    int write_len;
    center_com_reqcode *reqcode;

    write_buf = create_combuf(CENTER_COMCODE_REQCODE,sizeof(center_com_reqcode),write_len,(void**)&reqcode);
    reqcode->subid = subid;
    writebytes(write_buf,write_len,NULL,NULL);

    return 0;
}
int server_conn::readidle(){
    readbytes(new center_com_header,sizeof(center_com_header),recv_dispatch_fn,NULL);
    return 0;
}
void server_conn::recv_dispatch(void *buf,size_t len,void *data){
    center_com_header *header;
    char *readbuf;

    header = (center_com_header*)buf;
    readbuf = new char[header->size];
    printf("code:%d size:%d\n",header->code,header->size);
    switch(header->code){
	case CENTER_COMCODE_SETID:
	    readbytes(readbuf,header->size,recv_setid_fn,NULL);
	    break;
	case CENTER_COMCODE_SUBMIT:
	    readbytes(readbuf,header->size,recv_submit_fn,NULL);
	    break;
	case CENTER_COMCODE_SETPRO:
	    readbytes(readbuf,header->size,recv_setpro_fn,NULL);
	    break;
	case CENTER_COMCODE_SENDPRO:
	    readbytes(readbuf,header->size,recv_sendpro_fn,NULL);
	    break;
	case CENTER_COMCODE_SETJMOD:
	    readbytes(readbuf,header->size,recv_setjmod_fn,NULL);
	    break;
	case CENTER_COMCODE_SENDJMOD:
	    readbytes(readbuf,header->size,recv_sendjmod_fn,NULL);
	    break;
	case CENTER_COMCODE_SENDCODE:
	    readbytes(readbuf,header->size,recv_sendcode_fn,NULL);
	    break;
    }

    delete header;
}
void server_conn::recv_setid(void *buf,size_t len,void *data){
    center_com_setid *setid;

    setid = (center_com_setid*)buf;
    server_id = setid->id;
    printf("server_id:%d\n",server_id);

    //judge server init
    send_setinfo();

    delete setid;
}
void server_conn::recv_submit(void *buf,size_t len,void *data){
    center_com_submit *sub;

    sub = (center_com_submit*)buf;
    judge_manage_submit(sub->subid,sub->proid,sub->lang,(char*)((char*)buf + sizeof(center_com_submit))); 

    delete sub;
}
void server_conn::recv_setpro(void *buf,size_t len,void *data){
    int ret;
    int i;
    int count;
    center_com_setpro *setpro;

    char tpath[PATH_MAX + 1];
    FILE *f;
    int cacheid;
    std::vector<std::pair<int,int> > pro_list;

    count = len / sizeof(center_com_setpro);
    setpro = (center_com_setpro*)buf;
    for(i = 0;i < count;i++){
	if(setpro[i].type == 0){
	    ret = judge_manage_updatepro(setpro[i].proid,setpro[i].cacheid,true,NULL);
	    if(ret == 0){
		if(server_fileconn == NULL){
		    server_fileconn = server_connect();	
		}
		server_fileconn->send_reqpro(setpro[i].proid,setpro[i].cacheid);
	    }else if(ret == 1){
		pro_list.push_back(std::make_pair(setpro[i].proid,setpro[i].cacheid));
	    }
	}else if(setpro[i].type == 1){

	}
    }

    if(!pro_list.empty()){
	this->send_setpro(pro_list,0);
    }

    delete setpro;
}
void server_conn::recv_sendpro(void *buf,size_t len,void *data){
    center_com_sendpro *sendpro;
    judge_pro_info *pro_info;
    char tpath[PATH_MAX + 1];
    int fd;

    sendpro = (center_com_sendpro*)buf;

    if(judge_manage_updatepro(sendpro->proid,sendpro->cacheid,false,&pro_info) == 0){
	snprintf(tpath,sizeof(tpath),"tmp/propack/%d_%d.tar.bz2",sendpro->proid,sendpro->cacheid);
	fd = open(tpath,O_WRONLY | O_CREAT,0644); 
	readfile(fd,sendpro->filesize,done_sendpro_fn,pro_info);
    }

    delete sendpro;
}
void server_conn::done_sendpro(void *buf,size_t len,void *data){
    judge_pro_info *pro_info;

    close(*(int*)buf);

    pro_info = (judge_pro_info*)data;
    judge_manage_done_updatepro(pro_info);
}
void server_conn::recv_setjmod(void *buf,size_t len,void *data){
    int i;
    int count;
    center_com_setjmod *setjmod;

    char tpath[PATH_MAX + 1];
    FILE *f;
    int cacheid;
    std::vector<char*> sl_jmod_name;
    std::vector<int> sl_cacheid;

    char *write_buf;
    int write_len;
    center_com_reqjmod *reqjmod;

    count = len / sizeof(center_com_setjmod);
    setjmod = (center_com_setjmod*)buf;
    for(i = 0;i < count;i++){
	if(setjmod[i].type == 0){
	    snprintf(tpath,sizeof(tpath),"tmp/jmod/%s/cacheinfo",setjmod[i].jmod_name);
	    f = fopen(tpath,"r");
	    if(f != NULL){
		fscanf(f,"%d",&cacheid);
		fclose(f);

		if(cacheid == setjmod[i].cacheid){
		    sl_jmod_name.push_back(setjmod[i].jmod_name);
		    sl_cacheid.push_back(setjmod[i].cacheid);
		    continue;
		}
	    }

	    if(server_fileconn == NULL){
		server_fileconn = server_connect();	
	    }

	    write_buf = create_combuf(CENTER_COMCODE_REQJMOD,sizeof(center_com_reqjmod),write_len,(void**)&reqjmod);
	    reqjmod->jmod_name[0] = '\0';
	    strncat(reqjmod->jmod_name,setjmod[i].jmod_name,sizeof(reqjmod->jmod_name));
	    server_fileconn->writebytes(write_buf,write_len,NULL,NULL);
	}else if(setjmod[i].type == 1){

	}
    }

    if(!sl_jmod_name.empty()){
	this->send_setjmod(&sl_jmod_name[0],&sl_cacheid[0],0,sl_jmod_name.size());
    }

    delete setjmod;
}
void server_conn::recv_sendjmod(void *buf,size_t len,void *data){
    center_com_sendjmod *sendjmod;
    char tpath[PATH_MAX + 1];
    int fd;

    sendjmod = (center_com_sendjmod*)buf;
    snprintf(tpath,sizeof(tpath),"tmp/jmodpack/%s.tar.bz2",sendjmod->jmod_name);
    fd = open(tpath,O_WRONLY | O_CREAT,0644); 
    readfile(fd,sendjmod->filesize,done_sendjmod_fn,sendjmod);
}
void server_conn::done_sendjmod(void *buf,size_t len,void *data){
    center_com_sendjmod *sendjmod;

    close(*(int*)buf);

    sendjmod = (center_com_sendjmod*)data;
    server_packtp->add(tp_unpackjmod_thfn,sendjmod,tp_unpackjmod_cbfn,sendjmod);
}
void server_conn::recv_sendcode(void *buf,size_t len,void *data){
    center_com_sendcode *sendcode;
    char tpath[PATH_MAX + 1];
    int fd;

    sendcode = (center_com_sendcode*)buf;
    snprintf(tpath,sizeof(tpath),"tmp/codepack/%d.tar.bz2",sendcode->subid); 
    fd = open(tpath,O_WRONLY | O_CREAT,0644);
    readfile(fd,sendcode->filesize,done_sendcode_fn,sendcode);
}
void server_conn::done_sendcode(void *buf,size_t len,void *data){
    center_com_sendcode *sendcode;

    close(*(int*)buf);

    sendcode = (center_com_sendcode*)data;
    judge_manage_done_code(sendcode->subid);

    delete sendcode;
}
void server_conn::tp_unpackjmod_th(void *data){
    center_com_sendjmod *sendjmod;
    char pack_path[PATH_MAX + 1];
    char dir_path[PATH_MAX + 1];
    char tpath[PATH_MAX + 1];
    FILE *f;

    sendjmod = (center_com_sendjmod*)data;

    snprintf(pack_path,sizeof(pack_path),"tmp/jmodpack/%s.tar.bz2",sendjmod->jmod_name);
    snprintf(dir_path,sizeof(dir_path),"tmp/jmod/%s",sendjmod->jmod_name);
    mkdir(dir_path,0755);
    tool_cleardir(dir_path);
    tool_unpack(pack_path,dir_path);

    snprintf(tpath,sizeof(tpath),"tmp/jmod/%s/cacheinfo",sendjmod->jmod_name);
    f = fopen(tpath,"w");
    fprintf(f,"%d",sendjmod->cacheid);
    fclose(f);
}
void server_conn::tp_unpackjmod_cb(void *data){
    center_com_sendjmod *sendjmod;
    char *jmod_name;

    sendjmod = (center_com_sendjmod*)data;
    jmod_name = sendjmod->jmod_name;
    send_setjmod(&jmod_name,&sendjmod->cacheid,0,1);

    delete sendjmod;
}



int judge_server_addtpool(tpool *tpinfo){
    server_addepev(tpinfo->fd,EPOLLIN | EPOLLET,SERVER_EPEV_TPOOL,tpinfo);
    return 0;
}
int judge_server_setpro(std::vector<std::pair<int,int> > &pro_list){
    server_mainconn->send_setpro(pro_list,0);
    return 0;
}
int judge_server_reqcode(int subid){
    if(server_codeconn == NULL){
	server_codeconn = server_connect();
    }
    server_codeconn->send_reqcode(subid);

    return 0;
}
int judge_server_result(int subid,char *res_data,int res_len){
    server_mainconn->send_result(subid,res_data,res_len);
    return 0;
}

static int server_addepev(int fd,unsigned int flag,int type,void *data){
    server_epevdata *epevdata;
    epoll_event epev;

    epevdata = new server_epevdata(fd,type,data);
    epev.events = flag;
    epev.data.ptr = epevdata;
    epoll_ctl(server_epfd,EPOLL_CTL_ADD,fd,&epev);

    return 0;
}
static int server_delepev(server_epevdata *epevdata){
    epoll_ctl(server_epfd,EPOLL_CTL_DEL,epevdata->fd,NULL);
    delete epevdata;
    return 0;
}
static server_conn* server_connect(){
    int cfd;
    sockaddr_in caddr;
    epoll_event epev;
    server_conn *cinfo;

    cfd = socket(AF_INET,SOCK_STREAM | SOCK_NONBLOCK,6);
    caddr.sin_family = AF_INET;
    caddr.sin_port = htons(SERVER_JUDGE_PORT);
    //caddr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    caddr.sin_addr.s_addr = inet_addr("10.8.0.2");

    cinfo = new server_conn(cfd);
    server_addepev(cfd,EPOLLIN | EPOLLOUT | EPOLLRDHUP | EPOLLET,SERVER_EPEV_JUDGECLIENT,cinfo);
    connect(cfd,(sockaddr*)&caddr,sizeof(caddr));

    return cinfo;
}
int main(){
    int i;

    epoll_event epev;
    epoll_event epevs[SERVER_EPOLL_MAXEVENT];
    int nevs;

    int ev_flag;
    server_epevdata *epevdata;
    server_conn *cinfo;
    tpool *tpinfo;

    signal(SIGPIPE,SIG_IGN);
    server_epfd = epoll_create1(0);

    server_id = 0;
    server_avail = JUDGE_THREAD_JUDGEMAX;
    server_mainconn = server_connect();
    server_fileconn = NULL;
    server_codeconn = NULL;

    judge_manage_init();

    server_packtp = new tpool(4);
    judge_server_addtpool(server_packtp);
    server_packtp->start();

    
    while(true){
	nevs = epoll_wait(server_epfd,epevs,SERVER_EPOLL_MAXEVENT,-1);
	for(i = 0;i < nevs;i++){
	    ev_flag = epevs[i].events;
	    epevdata = (server_epevdata*)epevs[i].data.ptr;

	    if(epevdata->type == SERVER_EPEV_JUDGECLIENT){
		cinfo = (server_conn*)epevdata->data;
		if(ev_flag & EPOLLIN){
		    cinfo->readio();
		}
		if(ev_flag & EPOLLOUT){
		    cinfo->writeio();
		}

		server_packtp->done();
	    }else if(epevdata->type = SERVER_EPEV_TPOOL){
		tpinfo = (tpool*)epevdata->data;	
		if(ev_flag & EPOLLIN){
		    tpinfo->done();
		}
	    }
	}
    }

    close(server_epfd);

    return 0;
}
