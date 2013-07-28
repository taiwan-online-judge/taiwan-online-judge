#include<unistd.h>
#include<malloc.h>
#include<pthread.h>
#include<semaphore.h>
#include<sys/syscall.h>
#include<sys/types.h>
#include<sys/eventfd.h>
#include<linux/aio_abi.h>

#include<Python.h>

#define AIO_MAX_EVENT 4096
#define AIO_MAX_GETEVENT 64

struct aio_pack{
    struct aio_pack *next;

    int id;
    struct iocb *iocb;
    char *data;
    char *buf;
};

static int io_setup(unsigned int nr_events,aio_context_t *ctx_idp);
static int io_submit(aio_context_t ctx_id,long nr,struct iocb **iocbpp);
static int io_destroy(aio_context_t ctx_id);
static PyObject* spup_apply_mask(PyObject *self,PyObject *args);
static PyObject* spup_aio_get_evtfd(PyObject *self,PyObject *args);
static PyObject* spup_aio_read(PyObject *self,PyObject *args);
static PyObject* spup_aio_write(PyObject *self,PyObject *args);
static PyObject* spup_aio_getevents(PyObject *self,PyObject *args);
static void* spup_aio_handler(void *arg);

static PyMethodDef method[] = {
    {"apply_mask",spup_apply_mask,METH_VARARGS,"apply_mask"},

    {"aio_get_evtfd",spup_aio_get_evtfd,METH_NOARGS,"aio_get_evtfd"},
    {"aio_read",spup_aio_read,METH_VARARGS,"aio_read"},
    {"aio_write",spup_aio_write,METH_VARARGS,"aio_write"},
    {"aio_getevents",spup_aio_getevents,METH_VARARGS,"aio_getevents"},
    {NULL,NULL,0,NULL}
};
static struct PyModuleDef module = {
    PyModuleDef_HEAD_INIT,
    "spup",
    NULL,
    -1,
    method
};
static PyObject *spup_error;
static aio_context_t spup_aio_ctx;
static int spup_aio_evtfd;
static int spup_aio_id;
static pthread_t spup_aio_thread;
static struct aio_pack *spup_aio_queue[AIO_MAX_EVENT];
static int spup_aio_head;
static int spup_aio_tail;
static sem_t spup_aio_sem;

PyMODINIT_FUNC PyInit_spup(void){
    PyObject *m;

    m = PyModule_Create(&module);
    if(m == NULL){
        return NULL;
    }

    spup_error = PyErr_NewException("spup.error",NULL,NULL);
    Py_INCREF(spup_error);
    PyModule_AddObject(m,"error",spup_error);

    memset(&spup_aio_ctx,0,sizeof(spup_aio_ctx));
    io_setup(AIO_MAX_EVENT,&spup_aio_ctx);
    spup_aio_evtfd = eventfd(0,0);
    spup_aio_id = 0;
    pthread_create(&spup_aio_thread,NULL,spup_aio_handler,NULL);
    spup_aio_head = 0;
    spup_aio_tail = 0;
    sem_init(&spup_aio_sem,0,0);

    return m;
}

static int io_setup(unsigned int nr_events,aio_context_t *ctx_idp){
    return syscall(SYS_io_setup,nr_events,ctx_idp);
}
static int io_submit(aio_context_t ctx_id,long nr,struct iocb **iocbpp){
    return syscall(SYS_io_submit,ctx_id,nr,iocbpp);
}
static int io_getevents(aio_context_t ctx_id,
                        long min_nr,
                        long nr,
                        struct io_event *events,
                        struct timespec *timeout){

    return syscall(SYS_io_getevents,ctx_id,min_nr,nr,events,timeout);
}
static int io_destroy(aio_context_t ctx_id){
    return syscall(SYS_io_destroy,ctx_id);
}

static PyObject* spup_apply_mask(PyObject *self,PyObject *args){
    int i;
    int j;

    char *mask;
    int mask_len;
    char *data;
    int data_len;
    unsigned int mask_val;
    char *tmp;
    PyObject *ret;

    PyArg_ParseTuple(args,"y#y#",&mask,&mask_len,&data,&data_len);
    if(mask_len < 4){
        Py_INCREF(Py_None);
        return Py_None;
    }

    tmp = malloc(data_len);
    if(tmp == NULL){
        Py_INCREF(Py_None);
        return Py_None;
    }

    mask_val = *(unsigned int*)mask;
    for(i = 0;(i + 4) <= data_len;i += 4){
        *((unsigned int*)(tmp + i)) = *((unsigned int*)(data + i)) ^ mask_val;
    }
    for(j = 0;i < data_len;i++,j++){
        tmp[i] = data[i] ^ mask[j];
    }

    ret = PyBytes_FromStringAndSize(tmp,data_len);
    free(tmp);

    return ret;
}

static PyObject* spup_aio_get_evtfd(PyObject *self,PyObject *args){
    return PyLong_FromLong(spup_aio_evtfd);
}
static PyObject* spup_aio_read(PyObject *self,PyObject *args){
    Py_INCREF(Py_None);
    return Py_None;
}
static PyObject* spup_aio_write(PyObject *self,PyObject *args){
    int fd;
    char *data;
    int data_len;
    Py_ssize_t len;
    unsigned long off;

    struct aio_pack *pack;
    struct iocb *iocb;
    char *buf;
    
    PyArg_ParseTuple(args,"iy#nk",&fd,&data,&data_len,&len,&off);
    if(len > data_len){
        Py_INCREF(Py_None);
        return Py_None;
    }

    pack = malloc(sizeof(*pack));
    iocb = malloc(sizeof(*iocb));
    buf = memalign(512,len);
    if(pack == NULL || iocb == NULL || buf == NULL){
        if(pack != NULL){
            free(pack);
        }
        if(iocb != NULL){
            free(iocb);
        }
        if(buf != NULL){
            free(buf);
        }

        Py_INCREF(Py_None);
        return Py_None;
    }

    //memcpy(buf,data,len);

    Py_INCREF(Py_None);
    return Py_None;

    spup_aio_id += 1;
    pack->id = spup_aio_id;
    pack->iocb = iocb;
    pack->buf = buf;

    memset(iocb,0,sizeof(*iocb));
    iocb->aio_lio_opcode = IOCB_CMD_PWRITE;
    iocb->aio_reqprio = 0;
    iocb->aio_fildes = fd;
    iocb->aio_buf = (unsigned long)buf;
    iocb->aio_nbytes = len;
    iocb->aio_offset = off;
    iocb->aio_flags = IOCB_FLAG_RESFD;
    iocb->aio_resfd = spup_aio_evtfd;
    iocb->aio_data = (unsigned long)pack;

    spup_aio_queue[spup_aio_tail] = pack;
    spup_aio_tail = (spup_aio_tail + 1) % AIO_MAX_EVENT;
    sem_post(&spup_aio_sem);

    return PyLong_FromLong(pack->id);
}
static PyObject* spup_aio_getevents(PyObject *self,PyObject *args){
    int i;

    PyObject *ret;
    struct io_event *evts;
    int nr;
    struct aio_pack *pack;
    char *buf;

    evts = malloc(sizeof(*evts) * AIO_MAX_GETEVENT);
    if(evts == NULL){
        Py_INCREF(Py_None);
        return Py_None;
    }

    nr = io_getevents(spup_aio_ctx,1,AIO_MAX_GETEVENT,evts,NULL);
    for(i = 0;i < nr;i++){
        pack = (struct aio_pack*)evts[i].data;
        buf = pack->buf;

        printf("  %lld\n",evts[i].res);

        free(buf);
        free(pack);
        free((struct iocb*)evts[i].obj);
    }

    free(evts);
    return ret;
}

static void* spup_aio_handler(void *arg){
    int count;
    struct aio_pack *pack;
    struct iocb *iocbs[64];

    while(1){
        sem_wait(&spup_aio_sem);

        count = 0;
        while(1){
            pack = spup_aio_queue[spup_aio_head];
            iocbs[count] = pack->iocb;

            spup_aio_head = (spup_aio_head + 1) % AIO_MAX_EVENT;
            count++;

            if(count >= 64){
                break;
            }
            if(sem_trywait(&spup_aio_sem)){
                break;
            }
        }
        
        printf("%d\n",io_submit(spup_aio_ctx,count,iocbs));
    }

    return NULL;
}
