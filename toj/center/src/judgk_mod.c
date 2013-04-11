#include<linux/module.h>
#include<linux/kernel.h>
#include<linux/kdev_t.h>
#include<linux/device.h>
#include<linux/cdev.h>
#include<linux/fs.h>
#include<linux/sched.h>

#include"judgk.h"
#include"judgk_com.h"
#include"judgk_mod.h"

static int __init mod_init(){
    alloc_chrdev_region(&mod_dev,0,1,"judgk");
    mod_class = class_create(THIS_MODULE,"chardev");
    device_create(mod_class,NULL,mod_dev,NULL,"judgk");
    cdev_init(&mod_cdev,&mod_fops);
    cdev_add(&mod_cdev,mod_dev,1);

    judgk_proc_init();
    judgk_security_hook();
    judgk_syscall_hook();
    judgk_hyperio_init();

    pr_alert("judgk:Init\n");
    return 0;
}
static void __exit mod_exit(){
    cdev_del(&mod_cdev);
    device_destroy(mod_class,mod_dev);
    class_destroy(mod_class);
    unregister_chrdev_region(mod_dev,1);

    judgk_proc_exit();
    judgk_syscall_unhook();
    judgk_security_unhook();
    judgk_hyperio_exit();

    schedule_timeout_interruptible(3 * HZ);
    pr_alert("judgk:Exit\n");
}
module_init(mod_init);
module_exit(mod_exit);
MODULE_LICENSE("Dual MIT/GPL");

static long mod_ioctl(struct file *filp,unsigned int cmd,unsigned long arg){
    int ret;

    ret = -1;
    switch(cmd){
	case IOCTL_PROC_ADD:
	    ret = judgk_proc_add(arg);
	    break;
	case IOCTL_PROC_GET:
	    ret = judgk_proc_get(arg); 
	    break;
	case IOCTL_PROC_DEL:
	    ret = judgk_proc_del(arg);
	    break;
	case IOCTL_HYPERIO_ADD:
	    ret = judgk_hyperio_add(filp);
	    break;
	case IOCTL_HYPERIO_READ:
	    ret = judgk_hyperio_read(filp,arg);
	    break;
	case IOCTL_HYPERIO_WRITE:
	    ret = judgk_hyperio_write(filp,arg);
	    break;
	case IOCTL_HYPERIO_DEL:
	    ret = judgk_hyperio_del(filp);
	    break;
    }

    return ret;
}
