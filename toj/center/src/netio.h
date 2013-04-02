class netio_protoiofn{
public:
    virtual void operator()(void *buf,size_t len,void *data) = 0;
};

template<typename C>
class netio_iofn : public netio_protoiofn{
private:
    typedef void (C::*netio_iofn_type)(void *buf,size_t len,void *data);
    C *obj;
    netio_iofn_type fn;

public:
    netio_iofn(C *obj,netio_iofn_type fn){
	this->obj = obj;
	this->fn = fn;
    }
    void operator()(void *buf,size_t len,void *data){
	(obj->*fn)(buf,len,data);
    }
};

#define NETIO_IOTYPE_PLAIN 0
#define NETIO_IOTYPE_FILE 1
class netio_iocb{
public:
    int type;

    void *buf;
    int fd;
    off_t off;
    size_t len;
    netio_protoiofn *cb_fn; 
    void *cb_data;

    netio_iocb(void *buf,size_t len,netio_protoiofn *cb_fn,void *cb_data){
	this->type = NETIO_IOTYPE_PLAIN;
	this->buf = buf;
	this->off = 0;
	this->len = len; 
	this->cb_fn = cb_fn;
	this->cb_data = cb_data;
    }
    netio_iocb(int fd,size_t len,netio_protoiofn *cb_fn,void *cb_data){
	this->type = NETIO_IOTYPE_FILE;
	this->buf = &this->fd;
	this->fd = fd;
	this->off = 0;
	this->len = len; 
	this->cb_fn = cb_fn;
	this->cb_data = cb_data;
    }
};

#define NETIO_IOSIZE 65536
class netio{
private:
    netio_iocb *read_iocb;
    std::queue<netio_iocb*> write_queue;
    bool readio_reen;
    char readio_buf[NETIO_IOSIZE];

public:
    int fd;
    virtual int readidle() = 0;

    netio(int fd){
	this->fd = fd;
	this->read_iocb = NULL;
	this->readio_reen = false;
    }
    ~netio(){
	close(this->fd);
    }
    int readio(){
	int ret;
	size_t len;
	netio_iocb *iocb;

	if(readio_reen == true){
	    return -1;
	}
	readio_reen = true;

	while(true){
	    if(read_iocb == NULL){
		readidle();
	    }

	    iocb = read_iocb;
	    if(iocb->type == NETIO_IOTYPE_PLAIN){
		while((ret = read(fd,(char*)iocb->buf + iocb->off,iocb->len - iocb->off)) > 0){
		    iocb->off += ret;
		}
	    }else if(iocb->type == NETIO_IOTYPE_FILE){
		while(true){
		    len = iocb->len - iocb->off;
		    if(len >= NETIO_IOSIZE){
			len = NETIO_IOSIZE;
		    }
		    if((ret = read(fd,readio_buf,len)) <= 0){
			break;
		    }

		    write(iocb->fd,readio_buf,ret);
		    iocb->off += ret;
		}
	    }
	    if(iocb->off == iocb->len){
		read_iocb = NULL;

		if(iocb->cb_fn != NULL){
		    (*iocb->cb_fn)(iocb->buf,iocb->len,iocb->cb_data);
		}else{
		    if(iocb->type == NETIO_IOTYPE_PLAIN){
			delete (char*)iocb->buf;
		    }else if(iocb->type == NETIO_IOTYPE_FILE){
			close(iocb->fd);
		    }
		}

		delete iocb;
	    }else{
		break;
	    }
	}

	readio_reen = false;
	return 0;
    }
    int readbytes(void *buf,size_t len,netio_protoiofn *cb_fn,void *cb_data){
	read_iocb = new netio_iocb(buf,len,cb_fn,cb_data);
	readio();
	return 0;
    }
    int readfile(int fd,size_t len,netio_protoiofn *cb_fn,void *cb_data){
	read_iocb = new netio_iocb(fd,len,cb_fn,cb_data);
	readio();
	return 0;
    }
    int writeio(){
	int ret;
	size_t len;
	netio_iocb *iocb;

	while(!write_queue.empty()){
	    iocb = write_queue.front();
	    if(iocb->type == NETIO_IOTYPE_PLAIN){
		while((ret = write(fd,(char*)iocb->buf + iocb->off,iocb->len - iocb->off)) > 0){
		    iocb->off += ret;
		}
	    }else if(iocb->type == NETIO_IOTYPE_FILE){
		len = iocb->len - iocb->off;
		if(len >= NETIO_IOSIZE){
		    len = NETIO_IOSIZE;
		}
		while((ret = sendfile(fd,iocb->fd,NULL,len)) > 0){
		    iocb->off += ret;
		}
	    }
	    if(iocb->off == iocb->len){
		write_queue.pop();

		if(iocb->cb_fn != NULL){
		    (*iocb->cb_fn)(iocb->buf,iocb->len,iocb->cb_data);
		}else{
		    if(iocb->type == NETIO_IOTYPE_PLAIN){
			delete (char*)iocb->buf;
		    }else if(iocb->type == NETIO_IOTYPE_FILE){
			close(iocb->fd);
		    }
		}

		delete iocb;
	    }else{
		break;
	    }
	}

	return 0;
    }
    int writebytes(void *buf,size_t len,netio_protoiofn *cb_fn,void *cb_data){
	write_queue.push(new netio_iocb(buf,len,cb_fn,cb_data));
	writeio();
	return 0;
    }
    int writefile(int fd,size_t len,netio_protoiofn *cb_fn,void *cb_data){
	write_queue.push(new netio_iocb(fd,len,cb_fn,cb_data));
	writeio();
	return 0;
    }
};
