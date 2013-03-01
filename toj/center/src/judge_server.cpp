#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<unistd.h>
#include<fcntl.h>
#include<dlfcn.h>
#include<signal.h>
#include<limits.h>
#include<ftw.h>
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

#include"judge_def.h"
#include"netio.h"
#include"tpool.h"
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
    this->tp_unpackpro_thfn = new tpool_fn<server_conn>(this,&server_conn::tp_unpackpro_th);
    this->tp_unpackpro_cbfn = new tpool_fn<server_conn>(this,&server_conn::tp_unpackpro_cb);
    this->tp_unpackjmod_thfn = new tpool_fn<server_conn>(this,&server_conn::tp_unpackjmod_th);
    this->tp_unpackjmod_cbfn = new tpool_fn<server_conn>(this,&server_conn::tp_unpackjmod_cb);
    this->tp_unpackcode_thfn = new tpool_fn<server_conn>(this,&server_conn::tp_unpackcode_th);
    this->tp_unpackcode_cbfn = new tpool_fn<server_conn>(this,&server_conn::tp_unpackcode_cb);
    this->tp_judge_thfn = new tpool_fn<server_conn>(this,&server_conn::tp_judge_th);
    this->tp_judge_cbfn = new tpool_fn<server_conn>(this,&server_conn::tp_judge_cb);

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
int server_conn::send_setpro(int *proid,int *cacheid,int type,int count){
    int i;
    char *write_buf;
    int write_len;
    center_com_setpro *setpro;

    write_buf = create_combuf(CENTER_COMCODE_SETPRO,sizeof(center_com_setpro) * count,write_len,(void**)&setpro);
    for(i = 0;i < count;i++){
	setpro[i].proid = proid[i];
	setpro[i].cacheid = cacheid[i];
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
    char *write_buf;
    int write_len;
    center_com_reqcode *reqcode;
    std::multimap<int,center_com_submit*>::iterator sub_it;
    char tpath[PATH_MAX + 1];
    struct stat st;

    sub = (center_com_submit*)buf;
    if(server_codeconn == NULL){
	server_codeconn = server_connect();
    }

    if(server_submap.find(sub->subid) == server_submap.end()){
	snprintf(tpath,sizeof(tpath),"tmp/code/%d",sub->subid);
	if(!stat(tpath,&st)){
	    server_queuejudge(sub,tp_judge_thfn,tp_judge_cbfn);	
	}else{
	    write_buf = create_combuf(CENTER_COMCODE_REQCODE,sizeof(center_com_submit),write_len,(void**)&reqcode);
	    reqcode->subid = sub->subid;
	    writebytes(write_buf,write_len,NULL,NULL);
	    server_submap.insert(std::pair<int,center_com_submit*>(sub->subid,sub));
	}
    }else{
	server_submap.insert(std::pair<int,center_com_submit*>(sub->subid,sub));
    }
}
void server_conn::recv_setpro(void *buf,size_t len,void *data){
    int i;
    int count;
    center_com_setpro *setpro;

    char tpath[PATH_MAX + 1];
    FILE *f;
    int cacheid;
    std::vector<int> sl_proid;
    std::vector<int> sl_cacheid;

    char *write_buf;
    int write_len;
    center_com_reqpro *reqpro;

    count = len / sizeof(center_com_setpro);
    setpro = (center_com_setpro*)buf;
    for(i = 0;i < count;i++){
	if(setpro[i].type == 0){
	    snprintf(tpath,sizeof(tpath),"tmp/pro/%d/cacheinfo",setpro[i].proid);
	    f = fopen(tpath,"r");
	    if(f != NULL){
		fscanf(f,"%d",&cacheid);
		fclose(f);

		if(cacheid == setpro[i].cacheid){
		    sl_proid.push_back(setpro[i].proid);
		    sl_cacheid.push_back(setpro[i].cacheid);
		    continue;
		}
	    }

	    if(server_fileconn == NULL){
		server_fileconn = server_connect();	
	    }

	    write_buf = create_combuf(CENTER_COMCODE_REQPRO,sizeof(center_com_reqpro),write_len,(void**)&reqpro);
	    reqpro->proid = setpro[i].proid;
	    server_fileconn->writebytes(write_buf,write_len,NULL,NULL);
	}else if(setpro[i].type == 1){

	}
    }

    if(!sl_proid.empty()){
	this->send_setpro(&sl_proid[0],&sl_cacheid[0],0,sl_proid.size());
    }

    delete setpro;
}
void server_conn::recv_sendpro(void *buf,size_t len,void *data){
    center_com_sendpro *sendpro;
    char tpath[PATH_MAX + 1];
    int fd;

    sendpro = (center_com_sendpro*)buf;
    snprintf(tpath,sizeof(tpath),"tmp/propack/%d.tar.bz2",sendpro->proid);
    fd = open(tpath,O_WRONLY | O_CREAT,0644); 
    readfile(fd,sendpro->filesize,done_sendpro_fn,sendpro);
}
void server_conn::done_sendpro(void *buf,size_t len,void *data){
    center_com_sendpro *sendpro;

    close(*(int*)buf);

    sendpro = (center_com_sendpro*)data;
    server_packtp->add(tp_unpackpro_thfn,sendpro,tp_unpackpro_cbfn,sendpro);
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
    server_packtp->add(tp_unpackcode_thfn,sendcode,tp_unpackcode_cbfn,sendcode);
}
void server_conn::tp_unpackpro_th(void *data){
    center_com_sendpro *sendpro;
    char pack_path[PATH_MAX + 1];
    char dir_path[PATH_MAX + 1];
    char tpath[PATH_MAX + 1];
    FILE *f;

    sendpro = (center_com_sendpro*)data;

    snprintf(pack_path,sizeof(pack_path),"tmp/propack/%d.tar.bz2",sendpro->proid);
    snprintf(dir_path,sizeof(dir_path),"tmp/pro/%d",sendpro->proid);

    mkdir(dir_path,0755);
    server_cleardir(dir_path);
    pack_unpack(pack_path,dir_path);

    snprintf(tpath,sizeof(tpath),"tmp/pro/%d/cacheinfo",sendpro->proid);
    f = fopen(tpath,"w");
    fprintf(f,"%d",sendpro->cacheid);
    fclose(f);
}
void server_conn::tp_unpackpro_cb(void *data){
    center_com_sendpro *sendpro;

    sendpro = (center_com_sendpro*)data;
    send_setpro(&sendpro->proid,&sendpro->cacheid,0,1);

    delete sendpro;
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
    server_cleardir(dir_path);
    pack_unpack(pack_path,dir_path);

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
void server_conn::tp_unpackcode_th(void *data){
    center_com_sendcode *sendcode;
    char pack_path[PATH_MAX + 1];
    char dir_path[PATH_MAX + 1];
    char tpath[PATH_MAX + 1];
    FILE *f;

    sendcode = (center_com_sendcode*)data;

    snprintf(pack_path,sizeof(pack_path),"tmp/codepack/%d.tar.bz2",sendcode->subid);
    snprintf(dir_path,sizeof(dir_path),"tmp/code/%d",sendcode->subid);
    mkdir(dir_path,0755);
    server_cleardir(dir_path);
    pack_unpack(pack_path,dir_path);
}
void server_conn::tp_unpackcode_cb(void *data){
    center_com_sendcode *sendcode;
    int subid;
    std::multimap<int,center_com_submit*>::iterator sub_it;
    center_com_submit *sub;

    sendcode = (center_com_sendcode*)data;
    subid = sendcode->subid;

    while((sub_it = server_submap.find(subid)) != server_submap.end()){
	sub = sub_it->second;
	server_queuejudge(sub,tp_judge_thfn,tp_judge_cbfn);	
	server_submap.erase(sub_it);
    }

    delete sendcode;
}
void server_conn::tp_judge_th(void *data){
    server_judgeth_info *th_info;
    center_com_submit *sub;
    char pro_path[PATH_MAX + 1];
    char code_path[PATH_MAX + 1];

    th_info = (server_judgeth_info*)data;
    sub = th_info->sub;

    snprintf(pro_path,sizeof(pro_path),"tmp/pro/%d",sub->proid);
    snprintf(code_path,sizeof(code_path),"tmp/code/%d",sub->subid);
    server_judge(sub->subid,pro_path,code_path,th_info->run_path,sub->lang,sub->set_data,th_info->res_data,th_info->res_len);
}
void server_conn::tp_judge_cb(void *data){
    server_judgeth_info *th_info;
    center_com_submit *sub;

    th_info = (server_judgeth_info*)data;
    sub = th_info->sub;

    send_result(sub->subid,th_info->res_data,th_info->res_len);

    th_info->use_flag = false;
    th_info->sub = NULL;
    delete sub;
}


static int server_queuejudge(center_com_submit *sub,tpool_protofn *th_fn,tpool_protofn *cb_fn){
    int i;

    printf("get submit %d %d\n",sub->subid,sub->proid);
    for(i = 0;i < 8;i++){
	if(server_judgepool[i]->use_flag == false){
	    server_judgepool[i]->use_flag = true;
	    server_judgepool[i]->sub = sub;
	    server_judgetp->add(th_fn,server_judgepool[i],cb_fn,server_judgepool[i]);
	    break;
	}
    }
		
    return 0;
}
static int server_judge(int subid,char *pro_path,char *code_path,char *run_path,int lang,char *set_data,char *res_data,size_t &res_len){
    judgm_line_info *line_info;
    int pid;

    char tpath[PATH_MAX + 1];
    FILE *set_file;
    char cwd_path[PATH_MAX + 1];
    char jmod_name[NAME_MAX + 1];
    char line_path[PATH_MAX + 1];
    char check_name[NAME_MAX + 1];
    char check_path[PATH_MAX + 1];
    char lchr;
    char tchr;

    int judgk_modfd;
    void *line_dll;
    void *check_dll;
    judgm_line_run_fn run_fn;

    snprintf(tpath,sizeof(tpath),"%s/setting",pro_path);
    set_file = fopen(tpath,"r");

    getcwd(cwd_path,sizeof(cwd_path));
    fscanf(set_file,"%s",jmod_name);
    snprintf(line_path,sizeof(line_path),"%s/tmp/jmod/%s/%s_line.so",cwd_path,jmod_name,jmod_name);
    fscanf(set_file,"%s",check_name);
    snprintf(check_path,sizeof(check_path),"%s/tmp/jmod/%s/%s.so",cwd_path,jmod_name,check_name);

    lchr = '\n';
    while((tchr = fgetc(set_file)) != EOF){
	if(lchr == '\n' && tchr == '='){
	    while(fgetc(set_file) != '\n');
	    break;
	}
	lchr = tchr;
    }

    judgk_modfd = open("/dev/judgk",O_RDWR);
    line_dll = dlopen(line_path,RTLD_NOW);
    check_dll = dlopen(check_path,RTLD_NOW);

    line_info = (judgm_line_info*)mmap(NULL,sizeof(struct judgm_line_info),PROT_READ | PROT_WRITE,MAP_SHARED | MAP_ANONYMOUS,-1,0);

    line_info->subid = subid;

    line_info->pro_path = pro_path;
    line_info->code_path = code_path;
    line_info->run_path = run_path;

    line_info->judgk_modfd = judgk_modfd;
    line_info->line_dll = line_dll;
    line_info->check_dll = check_dll;

    line_info->lang = lang;
    line_info->set_file = set_file;
    line_info->set_data = set_data;

    server_cleardir(line_info->run_path);

    run_fn = (judgm_line_run_fn)dlsym(line_dll,"run");
    if((pid = fork()) == 0){
	run_fn(line_info);
	exit(0);
    }
    waitpid(pid,NULL,0);

    memcpy(res_data,line_info->res_data,line_info->res_len);
    res_len = line_info->res_len;

    munmap(line_info,sizeof(judgm_line_info));
    fclose(set_file);
    close(judgk_modfd);
    return 0;
}
static int server_cleardir_callback(const char *path,const struct stat *st,int flag,struct FTW *ftw_buf){
    if(ftw_buf->level == 0){
	return 0;
    }

    if(S_ISDIR(st->st_mode)){
	rmdir(path);
    }else{
	unlink(path);
    }
    return 0;
}
static int server_cleardir(char *path){
    nftw(path,server_cleardir_callback,64,FTW_DEPTH | FTW_PHYS);
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
    server_avail = 2;
    server_mainconn = server_connect();
    server_fileconn = NULL;
    server_codeconn = NULL;

    server_packtp = new tpool(4);
    server_packtp->start();
    server_addepev(server_packtp->fd,EPOLLIN | EPOLLET,SERVER_EPEV_TPOOL,server_packtp);

    for(i = 0;i < 8;i++){
	server_judgepool[i] = new server_judgeth_info(i);
    }
    server_judgetp = new tpool(8);
    server_judgetp->start();
    server_addepev(server_judgetp->fd,EPOLLIN | EPOLLET,SERVER_EPEV_TPOOL,server_judgetp);

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
