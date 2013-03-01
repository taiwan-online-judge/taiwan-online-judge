class tpool_protofn{
public:
    virtual void operator()(void *data) = 0;
};

template<typename C>
class tpool_fn : public tpool_protofn{
private:
    typedef void (C::*tpool_fn_type)(void *data);
    C *obj;
    tpool_fn_type fn;

public:
    tpool_fn(C *obj,tpool_fn_type fn){
	this->obj = obj;
	this->fn = fn;
    }
    void operator()(void *data){
	(obj->*fn)(data);
    }
};
class tpool_static_fn : public tpool_protofn{
private:
    typedef void (*tpool_static_fn_type)(void *data);
    tpool_static_fn_type fn;

public:
    tpool_static_fn(tpool_static_fn_type fn){
	this->fn = fn;
    }
    void operator()(void *data){
	fn(data);
    }
};

class tpool_thcb{
public:
    tpool_protofn *th_fn;
    void *th_data;
    tpool_protofn *cb_fn;
    void *cb_data;

    tpool_thcb(tpool_protofn *th_fn,void *th_data,tpool_protofn *cb_fn,void *cb_data){
	this->th_fn = th_fn;
	this->th_data = th_data;
	this->cb_fn = cb_fn;
	this->cb_data = cb_data;
    }
    int run(){
	(*th_fn)(th_data);
	return 0;
    }
    int done(){
	if(cb_fn != NULL){
	    (*cb_fn)(cb_data);
	}
	return 0;
    }
};

#define TPOOL_THREAD_MAXNUM 64
class tpool{
private:
    std::queue<tpool_thcb*> wait_queue;
    std::vector<tpool_thcb*> done_list;
    pthread_t pt[TPOOL_THREAD_MAXNUM];
    int pt_num;
    sem_t pt_sem;
    pthread_mutex_t pt_mutex;

    static void* pt_runfn(void *arg){
	tpool *that;
	tpool_thcb *thcb;
	long long int sig;

	that = (tpool*)arg;

	while(true){

	    sem_wait(&that->pt_sem);
	    
	    pthread_mutex_lock(&that->pt_mutex);
	    
	    if(!that->wait_queue.empty()){
		thcb = that->wait_queue.front();
		that->wait_queue.pop();
	    }else{
		thcb = NULL;
	    }
	    
	    pthread_mutex_unlock(&that->pt_mutex);

	    if(thcb == NULL){
		continue;
	    }

	    thcb->run();

	    pthread_mutex_lock(&that->pt_mutex);

	    that->done_list.push_back(thcb);

	    pthread_mutex_unlock(&that->pt_mutex);

	    sig = 1;
	    write(that->fd,&sig,sizeof(sig)),that->done_list.size();
	}
	return NULL;
    }

public:
    int fd;

    tpool(int pt_num){
	if((this->pt_num = pt_num) > TPOOL_THREAD_MAXNUM){
	    this->pt_num = TPOOL_THREAD_MAXNUM;
	}
	fd = eventfd(0,EFD_NONBLOCK);
	sem_init(&pt_sem,0,0);
	pthread_mutex_init(&pt_mutex,NULL);
    }
    ~tpool(){
	close(fd);
	sem_destroy(&pt_sem);
	pthread_mutex_destroy(&pt_mutex);
    }
    int start(){
	int i;

	for(i = 0;i < pt_num;i++){
	    pthread_create(&pt[pt_num],NULL,pt_runfn,this);
	}

	return 0;
    }
    int done(){
	int i;
	std::vector<tpool_thcb*> l;
	long long int sig;

	pthread_mutex_lock(&pt_mutex);

	l.swap(done_list);

	pthread_mutex_unlock(&pt_mutex);

	for(i = l.size() - 1;i >= 0;i--){
	    l[i]->done();
	    delete l[i];
	}

	read(fd,&sig,sizeof(sig));
    }
    int add(tpool_protofn *th_fn,void *th_data,tpool_protofn *cb_fn,void *cb_data){
	tpool_thcb *thcb;

	thcb = new tpool_thcb(th_fn,th_data,cb_fn,cb_data);

	pthread_mutex_lock(&pt_mutex);

	wait_queue.push(thcb);
	
	pthread_mutex_unlock(&pt_mutex);

	sem_post(&pt_sem);

	return 0;
    }
};
