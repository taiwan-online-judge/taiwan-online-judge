static int __init mod_init(void);
static void __exit mod_exit(void);

static long mod_ioctl(struct file *filp,unsigned int cmd,unsigned long arg);

static dev_t mod_dev;
static struct cdev mod_cdev;
static struct class *mod_class;
extern int judgk_hyperio_mmap(struct file *filp,struct vm_area_struct *vma);
static struct file_operations mod_fops = {
    .owner = THIS_MODULE,
    .unlocked_ioctl = mod_ioctl,
    .mmap = judgk_hyperio_mmap
};

extern int judgk_hyperio_init(void);
extern int judgk_hyperio_exit(void);
extern int judgk_hyperio_add(struct file *filp);
extern int judgk_hyperio_read(struct file *filp,size_t len);
extern int judgk_hyperio_write(struct file *filp,size_t len);
extern int judgk_hyperio_del(struct file *filp);
