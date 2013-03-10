#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<unistd.h>
#include<signal.h>
#include<limits.h>
#include<errno.h>
#include<fcntl.h>
#include<pthread.h>
#include<semaphore.h>
#include<libpq-fe.h>
#include<sys/socket.h>
#include<sys/epoll.h>
#include<sys/eventfd.h>
#include<netinet/in.h>
#include<arpa/inet.h>
#include<libpq-fe.h>
#include<vector>
#include<queue>

#include"tpool.h"
#include"center_server.h"

server_epevdata::server_epevdata(int fd,int type,void *data){
    this->fd = fd;
    this->type = type;
    this->data = data;
}


server_web_conn::server_web_conn(int fd){
    this->fd = fd;
    this->off = 0;
    this->count = 0;
}
server_web_conn::~server_web_conn(){
    epoll_ctl(server_epfd,EPOLL_CTL_DEL,fd,NULL);
    close(fd);
}
int server_web_conn::readio(){
    int ret;
    char c;
    int len;
    int subid;
    char *param;

    while((ret = read(fd,&c,1)) > 0){
	buf[off] = c;
	off++;
	if(c == '\0'){
	    count++;
	    if(count == 2){
		break;
	    }
	}
    }

    if(count == 2){
	off = 0;
	count = 0;

	sscanf(buf,"%d",&subid);
	param = buf + strlen(buf) + 1;
	printf("%d %s\n",subid,param);

	center_manage_submit(subid,param);

	write(fd,"S",2);
    }

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
int main(){
    int ret;
    int i;

    int judge_sfd;
    int web_sfd;
    int cfd;
    sockaddr_in saddr;
    sockaddr_in caddr;
    epoll_event epev;
    epoll_event epevs[SERVER_EPOLL_MAXEVENT];
    int nevs;

    unsigned int ev_flag;
    server_epevdata *epevdata;
    server_web_conn *winfo;
    tpool *tpinfo;

    signal(SIGPIPE,SIG_IGN);
    server_epfd = epoll_create1(0);
    center_manage_init(&tpinfo);
    server_addepev(tpinfo->fd,EPOLLIN | EPOLLET,SERVER_EPEV_TPOOL,tpinfo);
    center_judge_init();


    judge_sfd = socket(AF_INET,SOCK_STREAM | SOCK_NONBLOCK,6);
    saddr.sin_family = AF_INET;
    saddr.sin_port = htons(SERVER_JUDGE_PORT);
    //saddr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    //saddr.sin_addr.s_addr = htonl(INADDR_ANY);
    saddr.sin_addr.s_addr = inet_addr("10.8.0.1");
    setsockopt(judge_sfd,SOL_SOCKET,SO_REUSEADDR,&saddr,sizeof(saddr));
    bind(judge_sfd,(sockaddr*)&saddr,sizeof(saddr));

    server_addepev(judge_sfd,EPOLLIN | EPOLLET,SERVER_EPEV_JUDGESERVER,NULL);
    listen(judge_sfd,4096);

    web_sfd = socket(AF_INET,SOCK_STREAM | SOCK_NONBLOCK,6);
    saddr.sin_family = AF_INET;
    saddr.sin_port = htons(SERVER_WEB_PORT);
    saddr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    //saddr.sin_addr.s_addr = htonl(INADDR_ANY);
    setsockopt(web_sfd,SOL_SOCKET,SO_REUSEADDR,&saddr,sizeof(saddr));
    bind(web_sfd,(sockaddr*)&saddr,sizeof(saddr));

    server_addepev(web_sfd,EPOLLIN | EPOLLET,SERVER_EPEV_WEBSERVER,NULL);
    listen(web_sfd,4096);

    while(true){
	nevs = epoll_wait(server_epfd,epevs,SERVER_EPOLL_MAXEVENT,-1);
	for(i = 0;i < nevs;i++){
	    ev_flag = epevs[i].events;
	    epevdata = (server_epevdata*)epevs[i].data.ptr;

	    if(epevdata->type == SERVER_EPEV_JUDGESERVER){
		while(true){
		    ret = 0;
		    if((cfd = accept4(epevdata->fd,(sockaddr*)&caddr,(socklen_t*)&ret,SOCK_NONBLOCK)) == -1){
			break;
		    }

		    server_addepev(cfd,EPOLLIN | EPOLLOUT | EPOLLRDHUP | EPOLLET,SERVER_EPEV_JUDGECLIENT,center_judge_addconn(cfd));
		}
	    }else if(epevdata->type == SERVER_EPEV_JUDGECLIENT){
		center_judge_dispatch(ev_flag,epevdata->data);
		if(ev_flag & EPOLLRDHUP){
		    server_delepev(epevdata);
		}
	    }else if(epevdata->type == SERVER_EPEV_WEBSERVER){
		printf("test\n");
		while(true){
		    ret = 0;
		    if((cfd = accept4(epevdata->fd,(sockaddr*)&caddr,(socklen_t*)&ret,SOCK_NONBLOCK)) == -1){
			break;
		    }

		    server_addepev(cfd,EPOLLIN | EPOLLOUT | EPOLLRDHUP | EPOLLET,SERVER_EPEV_WEBCLIENT,new server_web_conn(cfd));
		}
	    }else if(epevdata->type == SERVER_EPEV_WEBCLIENT){
		winfo = (server_web_conn*)epevdata->data;	
		if(ev_flag & EPOLLIN){
		    winfo->readio(); 
		}
		if(ev_flag & EPOLLRDHUP){
		    delete winfo;
		    delete (server_epevdata*)epev.data.ptr;
		}
	    }else if(epevdata->type == SERVER_EPEV_TPOOL){
		tpinfo = (tpool*)epevdata->data;	
		if(ev_flag & EPOLLIN){
		    tpinfo->done();
		}
	    }
	}
    }

    close(judge_sfd);
    close(server_epfd);
    close(web_sfd);

    return 0;
}
