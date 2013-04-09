#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<unistd.h>
#include<fcntl.h>
#include<limits.h>
#include<errno.h>
#include<sys/stat.h>
#include<sys/types.h>
#include<sys/epoll.h>
#include<sys/sendfile.h>
#include<map>
#include<list>
#include<queue>
#include<string>

#include"netio.h"
#include"judge_def.h"
#include"judgm_manage.h"
#include"center.h"
#include"center_com.h"
#include"center_judge.h"

int judge_info::last_id = 0;
judge_info::judge_info(){
    last_id++;
    this->id = last_id;
    this->avail = 0;

    judge_idmap.insert(std::pair<int,judge_info*>(id,this));	
    judge_runlist.push_back(this);
    judge_it = judge_runlist.end();
    judge_it--;
}
judge_info::~judge_info(){
    judge_idmap.erase(id);	
    judge_runlist.erase(judge_it);
}
int judge_info::setavail(int avail){
    int old;

    old = this->avail;
    this->avail = avail;
    if(this->avail > 0 && old <= 0){
	judge_runlist.erase(judge_it);
	judge_runlist.push_front(this);
	judge_it = judge_runlist.begin();
    }else if(this->avail <= 0 && old > 0){
	judge_runlist.erase(judge_it);
	judge_runlist.push_back(this);
	judge_it = judge_runlist.end();
	judge_it--;
    }

    return 0;
}
int judge_info::setinfo(int avail){
    setavail(avail);
    return 0;
}
int judge_info::submit(judge_submit_info *sub_info){
    setavail(avail - 1);
    conn_main->send_submit(sub_info);
    return 0;
}
int judge_info::result(int subid,char *res_data){
    setavail(avail + 1);
    
    printf("submitid:%d\n",subid);
    center_manage_result(subid,res_data);

    judge_run_waitqueue();
    return 0;
}
int judge_info::updatepro(std::vector<std::pair<int,int> > &pro_list){
    int i;
    
    for(i = 0;i < pro_list.size();i++){
	pro_map.erase(pro_list[i].first);
    }
    conn_main->send_setpro(pro_list,0);

    return 0;
}
int judge_info::updatejmod(std::vector<std::pair<char*,int> > &jmod_list){
    int i;

    for(i = 0;i < jmod_list.size();i++){
	jmod_map.erase(jmod_list[i].first); 
    }
    conn_main->send_setjmod(jmod_list,0);

    return 0;
}


judge_conn::judge_conn(int fd):netio(fd){
    this->info = NULL;
    this->recv_dispatch_fn = new netio_iofn<judge_conn>(this,&judge_conn::recv_dispatch);
    this->recv_setid_fn = new netio_iofn<judge_conn>(this,&judge_conn::recv_setid);
    this->recv_setinfo_fn = new netio_iofn<judge_conn>(this,&judge_conn::recv_setinfo);
    this->recv_result_fn = new netio_iofn<judge_conn>(this,&judge_conn::recv_result);
    this->recv_setpro_fn = new netio_iofn<judge_conn>(this,&judge_conn::recv_setpro);
    this->recv_reqpro_fn = new netio_iofn<judge_conn>(this,&judge_conn::recv_reqpro);
    this->done_sendpro_fn = new netio_iofn<judge_conn>(this,&judge_conn::done_sendpro);
    this->recv_setjmod_fn = new netio_iofn<judge_conn>(this,&judge_conn::recv_setjmod);
    this->recv_reqjmod_fn = new netio_iofn<judge_conn>(this,&judge_conn::recv_reqjmod);
    this->recv_reqcode_fn = new netio_iofn<judge_conn>(this,&judge_conn::recv_reqcode);
}
judge_conn::~judge_conn(){
    info->conn_list.erase(conn_it);
    if(info->conn_main == this){
	info->conn_main = NULL;
    }
    if(info->conn_list.empty()){
	delete info;
    }

    delete recv_dispatch_fn;
    delete recv_setid_fn;
    delete recv_setinfo_fn;
    delete recv_result_fn;
    delete recv_setpro_fn;
    delete recv_reqpro_fn;
    delete done_sendpro_fn;
    delete recv_setjmod_fn;
    delete recv_reqjmod_fn;
    delete recv_reqcode_fn;
}
char* judge_conn::create_combuf(int code,int size,int &len,void **data){
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
int judge_conn::send_setid(int judgeid){
    char *write_buf;
    int write_len;
    center_com_setid *setid;

    write_buf = create_combuf(CENTER_COMCODE_SETID,sizeof(center_com_setid),write_len,(void**)&setid);
    setid->id = judgeid;
    writebytes(write_buf,write_len,NULL,NULL);
    
    return 0;
}
int judge_conn::send_submit(judge_submit_info *sub_info){
    char *write_buf;
    int write_len;
    center_com_submit *sub;

    if(sub_info->set_len > JUDGE_SET_DATAMAX){
	delete sub_info;
	return -1;
    }

    write_buf = create_combuf(CENTER_COMCODE_SUBMIT,sizeof(center_com_submit) + sub_info->set_len,write_len,(void**)&sub);
    sub->subid = sub_info->subid;
    sub->proid = sub_info->proid;
    sub->lang = sub_info->lang;
    memcpy((void*)(write_buf + sizeof(center_com_header) + sizeof(center_com_submit)),sub_info->set_data,sub_info->set_len);
    writebytes(write_buf,write_len,NULL,NULL);

    delete sub_info;
    return 0;
}
int judge_conn::send_setpro(std::vector<std::pair<int,int> > &pro_list,int type){
    int i;

    int count;
    char *write_buf;
    int write_len;
    center_com_setpro *setpro;

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
int judge_conn::send_setjmod(std::vector<std::pair<char*,int> > &jmod_list,int type){
    int i;

    int count;
    char *write_buf;
    int write_len;
    center_com_setjmod *setjmod;

    count = jmod_list.size();
    write_buf = create_combuf(CENTER_COMCODE_SETJMOD,sizeof(center_com_setjmod) * count,write_len,(void**)&setjmod);

    for(i = 0;i < count;i++){
	setjmod[i].jmod_name[0] = '\0';
	strncat(setjmod[i].jmod_name,jmod_list[i].first,sizeof(setjmod[i].jmod_name));
	setjmod[i].cacheid = jmod_list[i].second;
	setjmod[i].type = type;
    }
    writebytes(write_buf,write_len,NULL,NULL);

    return 0;
}
int judge_conn::readidle(){
    readbytes(new center_com_header,sizeof(center_com_header),recv_dispatch_fn,NULL);
    return 0;
}
void judge_conn::recv_dispatch(void *buf,size_t len,void *data){
    center_com_header *header;
    char *readbuf;

    header = (center_com_header*)buf;
    readbuf = new char[header->size];

    printf("code:%d size:%d\n",header->code,header->size);
    switch(header->code){
	case CENTER_COMCODE_SETID:
	    readbytes(readbuf,header->size,recv_setid_fn,NULL);
	    break;
	case CENTER_COMCODE_SETINFO:
	    readbytes(readbuf,header->size,recv_setinfo_fn,NULL);
	    break;
	case CENTER_COMCODE_RESULT:
	    readbytes(readbuf,header->size,recv_result_fn,NULL);
	    break;
	case CENTER_COMCODE_SETPRO:
	    readbytes(readbuf,header->size,recv_setpro_fn,NULL);
	    break;
	case CENTER_COMCODE_REQPRO:
	    readbytes(readbuf,header->size,recv_reqpro_fn,NULL);
	    break;
	case CENTER_COMCODE_SETJMOD:
	    readbytes(readbuf,header->size,recv_setjmod_fn,NULL);
	    break;
	case CENTER_COMCODE_REQJMOD:
	    readbytes(readbuf,header->size,recv_reqjmod_fn,NULL);
	    break;
	case CENTER_COMCODE_REQCODE:
	    readbytes(readbuf,header->size,recv_reqcode_fn,NULL);
	    break;
    }

    delete header;
}
void judge_conn::recv_setid(void *buf,size_t len,void *data){
    center_com_setid *setid;
    std::map<int,judge_info*>::iterator it;

    setid = (center_com_setid*)buf;
    if(setid->id == 0){
	info = new judge_info();

	info->conn_list.push_front(this);
	conn_it = info->conn_list.begin();
	info->conn_main = this;

	this->send_setid(info->id);
    }else{
	if((it = judge_idmap.find(setid->id)) != judge_idmap.end()){
	    info = it->second;   
	    info->conn_list.push_front(this);
	    conn_it = info->conn_list.begin();
	}
    }

    delete setid;
}
void judge_conn::recv_setinfo(void *buf,size_t len,void *data){
    int i;
    int count;

    center_com_setinfo *setinfo;
    std::map<std::string,center_jmod_info*>::iterator jmod_it;
    std::vector<std::pair<char*,int> > jmod_list;
    std::map<int,center_pro_info*>::iterator pro_it;
    std::vector<std::pair<int,int> > pro_list;

    setinfo = (center_com_setinfo*)buf;
    info->setinfo(setinfo->avail);

    count = center_manage_jmodmap.size();
    jmod_it = center_manage_jmodmap.begin();
    for(i = 0;i < count;i++,jmod_it++){
	jmod_list.push_back(std::make_pair(jmod_it->second->name,jmod_it->second->cacheid));
    }
    send_setjmod(jmod_list,0);

    count = center_manage_promap.size();
    pro_it = center_manage_promap.begin();
    for(i = 0;i < count;i++,pro_it++){
	pro_list.push_back(std::make_pair(pro_it->second->proid,pro_it->second->cacheid));
    }
    send_setpro(pro_list,0);

    delete setinfo;
}
void judge_conn::recv_result(void *buf,size_t len,void *data){
    int subid;
    char *res_data;

    subid = ((center_com_result*)buf)->subid;
    res_data = (char*)((char*)buf + sizeof(center_com_result));

    info->result(subid,res_data);

    delete (char*)buf;
}
void judge_conn::recv_setpro(void *buf,size_t len,void *data){
    int i;
    int count;

    center_com_setpro *setpro;
    center_pro_info *pro_info;
    std::map<int,center_pro_info*>::iterator pro_it;

    count = len / sizeof(center_com_setpro);
    setpro = (center_com_setpro*)buf;
    for(i = 0;i < count;i++){
	if(setpro[i].type == 0){
	    if((pro_info = center_manage_getprobyid(setpro[i].proid)) == NULL){
		continue;
	    }

	    if(pro_info->cacheid == setpro[i].cacheid){
		info->pro_map.insert(std::pair<int,int>(pro_info->proid,pro_info->cacheid));
	    }
	    center_manage_putpro(pro_info);

	}else if(setpro[i].type == 1){
	    info->pro_map.erase(setpro[i].proid);
	}
    }

    judge_run_waitqueue();
    delete setpro;
}
void judge_conn::recv_reqpro(void *buf,size_t len,void *data){
    center_com_reqpro *reqpro;
    std::map<int,center_pro_info*>::iterator pro_it;
    center_pro_info *pro_info;

    char tpath[PATH_MAX + 1];
    int fd;
    struct stat st;

    char *write_buf;
    int write_len;
    center_com_sendpro *sendpro;

    reqpro = (center_com_reqpro*)buf;
    try{
	if((pro_info = center_manage_getprobyid(reqpro->proid)) == NULL){
	    throw -1;    	
	}
	if(pro_info->cacheid != reqpro->cacheid){
	    throw -1;
	}
	
	snprintf(tpath,sizeof(tpath),"tmp/propack/%d_%d.tar.bz2",pro_info->proid,pro_info->cacheid);
	fd = open(tpath,O_RDONLY);
	fstat(fd,&st);
	write_buf = create_combuf(CENTER_COMCODE_SENDPRO,sizeof(center_com_sendpro),write_len,(void**)&sendpro);
	sendpro->proid = pro_info->proid;
	sendpro->cacheid = pro_info->cacheid;
	sendpro->filesize = st.st_size;
	printf("sendpro:%lu\n",sendpro->filesize);

	writebytes(write_buf,write_len,NULL,NULL);
	writefile(fd,st.st_size,done_sendpro_fn,pro_info);
    }catch(int err){
	if(pro_info != NULL){
	    center_manage_putpro(pro_info);
	}
    }

    delete reqpro;
}
void judge_conn::done_sendpro(void *buf,size_t len,void *data){
    close((int)((long)buf));
    center_manage_putpro((center_pro_info*)data);
}
void judge_conn::recv_setjmod(void *buf,size_t len,void *data){
    int i;
    int count;

    center_com_setjmod *setjmod;
    std::map<std::string,center_jmod_info*>::iterator jmod_it;

    count = len / sizeof(center_com_setjmod);
    setjmod = (center_com_setjmod*)buf;
    for(i = 0;i < count;i++){
	if(setjmod[i].type == 0){
	    if((jmod_it = center_manage_jmodmap.find(setjmod[i].jmod_name)) == center_manage_jmodmap.end()){
		continue;
	    }
	    if(jmod_it->second->cacheid != setjmod[i].cacheid){
		continue;
	    }

	    info->jmod_map.insert(std::pair<std::string,center_jmod_info*>(jmod_it->second->name,jmod_it->second));
	}else if(setjmod[i].type == 1){
	    info->jmod_map.erase(setjmod[i].jmod_name);
	}
    }

    judge_run_waitqueue();
    delete setjmod;
}
void judge_conn::recv_reqjmod(void *buf,size_t len,void *data){
    center_com_reqjmod *reqjmod;
    std::map<std::string,center_jmod_info*>::iterator jmod_it;
    center_jmod_info *jmod_info;

    char tpath[PATH_MAX + 1];
    int fd;
    struct stat st;

    char *write_buf;
    int write_len;
    center_com_sendjmod *sendjmod;

    reqjmod = (center_com_reqjmod*)buf;
    if((jmod_it = center_manage_jmodmap.find(reqjmod->jmod_name)) == center_manage_jmodmap.end()){
	//fix
    }else{
	jmod_info = jmod_it->second;

	snprintf(tpath,sizeof(tpath),"tmp/jmodpack/%s.tar.bz2",jmod_info->name);
	fd = open(tpath,O_RDONLY);
	if(fstat(fd,&st)){
	    //fix
	}else{
	    write_buf = create_combuf(CENTER_COMCODE_SENDJMOD,sizeof(center_com_sendjmod),write_len,(void**)&sendjmod);
	    sendjmod->jmod_name[0] = '\0';
	    strncat(sendjmod->jmod_name,jmod_info->name,sizeof(sendjmod->jmod_name));
	    sendjmod->cacheid = jmod_info->cacheid;
	    sendjmod->filesize = st.st_size;
	    printf("sendjmod:%lu\n",sendjmod->filesize);

	    writebytes(write_buf,write_len,NULL,NULL);
	    writefile(fd,st.st_size,NULL,NULL);
	}
    }

    delete reqjmod;
}
void judge_conn::recv_reqcode(void *buf,size_t len,void *data){
    center_com_reqcode *reqcode;
    char tpath[PATH_MAX + 1];
    int fd;
    struct stat st;

    char *write_buf;
    int write_len;
    center_com_header *header;
    center_com_sendcode *sendcode;

    reqcode = (center_com_reqcode*)buf;
    snprintf(tpath,sizeof(tpath),"tmp/codepack/%d.tar.bz2",reqcode->subid);
    fd = open(tpath,O_RDONLY);
    if(fstat(fd,&st)){
	//fix
    }else{
	write_buf = create_combuf(CENTER_COMCODE_SENDCODE,sizeof(center_com_sendcode),write_len,(void**)&sendcode);
	sendcode->subid = reqcode->subid;
	sendcode->filesize = st.st_size;
	printf("sendcode:%lu\n",sendcode->filesize);

	writebytes(write_buf,write_len,NULL,NULL);
	writefile(fd,st.st_size,NULL,NULL);
    }
    
    delete reqcode;
}


static int judge_run_waitqueue(){
    int count;
    judge_submit_info *sub_info;
    bool wait_flag;
    std::list<judge_info*>::iterator judge_it;
    judge_info *info;
    std::map<int,center_pro_info*>::iterator pro_it;
    center_pro_info *pro_info;

    count = judge_submitqueue.size();
    printf("  remain count %d\n",count);
    for(;count > 0;count--){
	sub_info = judge_submitqueue.front();
	judge_submitqueue.pop();

	if((pro_it = center_manage_promap.find(sub_info->proid)) == center_manage_promap.end()){
	    continue;
	}
	pro_info = pro_it->second;

	wait_flag = true;
	for(judge_it = judge_runlist.begin();judge_it != judge_runlist.end();judge_it++){
	    info = *judge_it;
	    if(info->avail <= 0){
		break;
	    }
	    if(info->pro_map.find(pro_info->proid) != info->pro_map.end() && info->jmod_map.find(pro_info->jmod_info->name) != info->jmod_map.end()){
		info->submit(sub_info);
		wait_flag = false;
		break;
	    }
	}
	if(wait_flag == true){
	    judge_submitqueue.push(sub_info);
	}
    }
    return 0;
}
int center_judge_init(){
    return 0;
}
void* center_judge_addconn(int fd){
    return new judge_conn(fd);
}
int center_judge_dispatch(int evflag,void *data){
    judge_conn *cinfo;

    cinfo = (judge_conn*)data;
    if(evflag & EPOLLRDHUP){
	printf("close %d\n",cinfo->fd);
	delete cinfo;
    }else{
	if(evflag & EPOLLIN){
	    cinfo->readio();
	}
	if(evflag & EPOLLOUT){
	    cinfo->writeio();
	}
    }

    return 0;
}
int center_judge_submit(int subid,int proid,int lang,char *set_data,size_t set_len){
    judge_submitqueue.push(new judge_submit_info(subid,proid,lang,set_data,set_len));
    judge_run_waitqueue();
    return 0;
}
int center_judge_updatepro(std::vector<std::pair<int,int> > &pro_list){
    int i;
    int j;
    std::list<judge_info*>::iterator judge_it;
    judge_info *info;

    for(judge_it = judge_runlist.begin();judge_it != judge_runlist.end();judge_it++){
	(*judge_it)->updatepro(pro_list);
    }

    return 0;
}
int center_judge_updatejmod(std::vector<std::pair<char*,int> > &jmod_list){
    int i;
    int j;
    std::list<judge_info*>::iterator judge_it;
    judge_info *info;

    for(judge_it = judge_runlist.begin();judge_it != judge_runlist.end();judge_it++){
	(*judge_it)->updatejmod(jmod_list);
    }

    return 0;
}
