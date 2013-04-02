#define IOCTL_PROC_ADD _IOWR('x',0x0,int)
#define IOCTL_PROC_GET _IOWR('x',0x1,int)
#define IOCTL_PROC_DEL _IOR('x',0x3,int)

#define IOCTL_HYPERIO_ADD _IOWR('x',0x10,int)
#define IOCTL_HYPERIO_READ _IOWR('x',0x11,int)
#define IOCTL_HYPERIO_WRITE _IOWR('x',0x12,int)
#define IOCTL_HYPERIO_DEL _IOWR('x',0x13,int)

#define JUDGK_COM_HYPERIO_BUFSIZE 4194304

struct judgk_com_proc_add{
    char run_path[PATH_MAX + 1];
    pid_t pid;
    unsigned long kern_task;
    unsigned long timelimit;
    unsigned long hardtimelimit;
    unsigned long memlimit;
};
struct judgk_com_proc_get{
    unsigned long kern_task;
    int status;
    unsigned long runtime;
    unsigned long memory;
};
