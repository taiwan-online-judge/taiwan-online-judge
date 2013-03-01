#define HYPERIO_MAXNUM 256
#define HYPERIO_FILP_HTSIZE 1009

struct hyperio_info{
    atomic_t ref_count;
    struct hlist_node node;
    struct file *filp;
    struct tty_port port;

    bool create_flag;
    bool end_flag;
    struct file_operations *hook_fops;
    const struct file_operations *old_fops;
    
    atomic64_t read_remain;
    off_t read_off;
    char *read_buf;
    struct completion read_rwait;
    struct completion read_wwait;

    atomic64_t write_remain;
    off_t write_off;
    char *write_buf;
    struct completion write_rwait;
    struct completion write_wwait;
};

static inline struct hyperio_info* hyperio_filp_lookup(struct file *filp);
static int hyperio_tty_open(struct tty_struct * tty, struct file * filp);
static void hyperio_tty_close(struct tty_struct * tty, struct file * filp);
static int hyperio_tty_write(struct tty_struct *tty,const unsigned char *buf,int count);
static int hyperio_tty_write_room(struct tty_struct *tty);
static ssize_t hyperio_tty_filpread(struct file *filp,char __user *buf,size_t count,loff_t *off);
static ssize_t hyperio_tty_filpwrite(struct file *filp,const char __user *buf,size_t count,loff_t *off);

static struct tty_driver *hyperio_tty_drv;
static struct tty_operations hyperio_tops = {
    .open = hyperio_tty_open,
    .close = hyperio_tty_close,
    .write = hyperio_tty_write,
    .write_room = hyperio_tty_write_room
};
static struct hyperio_info *hyperio_table;
static struct hlist_head *hyperio_filp_ht;
static DEFINE_SPINLOCK(hyperio_filp_htlock);

int judgk_hyperio_init(void);
int judgk_hyperio_exit(void);
int judgk_hyperio_add(struct file *filp);
int judgk_hyperio_read(struct file *filp,size_t len);
int judgk_hyperio_write(struct file *filp,size_t len);
int judgk_hyperio_del(struct file *filp);
int judgk_hyperio_mmap(struct file *filp,struct vm_area_struct *vma);
