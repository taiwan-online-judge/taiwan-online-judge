#include<stdio.h>
#include<stdlib.h>
#include<string.h>
#include<unistd.h>
#include<fcntl.h>
#include<time.h>
#include<limits.h>
#include<math.h>
#include<termios.h>
#include<sys/ioctl.h>
#include<sys/types.h>
#include<sys/mman.h>
#include<sys/wait.h>

#include"../judge_def.h"
#include"../judgm_lib.h"

int fd;
/*char *rbuf;
off_t roff = 0;

int judgm_hyperio_compare(char *buf,size_t len){
    int flag;
    size_t remain;
    off_t off;
    size_t data_len;
    size_t cmp_len;

    flag = 0;
    remain = len;
    off = 0;
    data_len = 0;
    cmp_len = 0;
    while(remain > 0 && flag == 0){
	if(data_len == 0){
	    if((data_len = ioctl(fd,IOCTL_READ,cmp_len)) <= 0){
		return -1;
	    }
	}
	if(remain < data_len){
	    cmp_len = remain;
	}else{
	    cmp_len = data_len;
	}

	if((roff + cmp_len) < BUF_SIZE){
	    flag |= memcmp(rbuf + roff,buf + off,cmp_len);
	    roff += cmp_len;
	}else{
	    flag |= memcmp(rbuf + roff,buf + off,BUF_SIZE - roff);
	    flag |= memcmp(rbuf,buf + off + (BUF_SIZE - roff),(cmp_len + roff) - BUF_SIZE);
	    roff = (cmp_len + roff) - BUF_SIZE;
	}
	remain -= cmp_len;
	off += cmp_len;
    }
    if(cmp_len > 0){
	ioctl(fd,IOCTL_READ,-(long)cmp_len);
    }

    if(flag == 0){
	return 0;
    }else{
	return -1;
    }
}*/

int main(){
    int i,j;
    char *buf;
    int idx;
    int pid;
    char str[4096];
    int a,b;
    int l;

    judgm_hyperio *hyperio;

    fd = open("/dev/judgk",O_RDWR);
    hyperio = new judgm_hyperio(fd); 

    printf("%d\n",hyperio->tty_idx);

    if((pid = fork()) == 0){
	int outfd;

	outfd = judgm_hyperio::get_ttyfd(0);

	//dup2(fd,0);
	dup2(outfd,1);

	printf("Hello World\n");
	char *argv[] = {NULL,NULL};
	char *envp[] = {NULL};

	execve("/srv/http/toj/center/judge/tmp/run/1/test",argv,envp);
	exit(0);
    }

    printf("%d\n",hyperio->compare("Hello World\n",12));

    waitpid(pid,NULL,0);

    getchar();
    delete hyperio;
    close(fd);

    /*flag = 0;
    roff = 0;
    woff = 0;
    srand(23);
    for(i = 0;i < 1000000;i++){
	a = rand() % 65536;
	b = rand() % 65536;

	snprintf(str,sizeof(str),"%d %d\n",a,b);
	l = strlen(str);
	j = l;
	len = 0;
	while(j > 0){
	    len = ioctl(fd,IOCTL_WRITE,len);
	    if(j < len){
		len = j;
	    }

	    if((len + woff) < BUF_SIZE){
		memcpy(wbuf + woff,str + (l - j),len);	
		woff += len;
	    }else{
		memcpy(wbuf + woff,str + (l - j),BUF_SIZE - woff);	
		memcpy(wbuf,str + (l - j) + (BUF_SIZE - woff),(len + woff) - BUF_SIZE);	
		woff = (len + woff) - BUF_SIZE;
	    }

	    j -= len;
	}
	ioctl(fd,IOCTL_WRITE,-len);

	snprintf(str,sizeof(str),"%d\n",a + b);
	l = strlen(str);
	j = l;
	len = 0;
	while(j > 0){
	    len = ioctl(fd,IOCTL_READ,len);
	    if(len <= 0){
		flag = 1;
		break;
	    }
	    if(j < len){
		len = j;
	    }

	    if((roff + len) < BUF_SIZE){
		flag |= memcmp(rbuf + roff,str + (l - j),len);
		roff += len;
	    }else{
		flag |= memcmp(rbuf + roff,str + (l - j),BUF_SIZE - roff);
		flag |= memcmp(rbuf,str + (l - j) + (BUF_SIZE - roff),(len + roff) - BUF_SIZE);
		roff = (len + roff) - BUF_SIZE;
	    }

	    j -= len;
	}
	ioctl(fd,IOCTL_READ,-len);

	if(flag != 0){
	    printf("WA\n");
	    break;
	}
    }*/

    return 0;
}
