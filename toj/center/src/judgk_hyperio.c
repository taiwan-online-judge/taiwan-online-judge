#include<linux/fs.h>
#include<linux/tty.h>
#include<linux/slab.h>
#include<linux/mm.h>
#include<linux/wait.h>
#include<linux/sched.h>
#include<asm/atomic.h>
#include<asm/mman.h>

#include"judgk.h"
#include"judgk_com.h"
#include"judgk_hyperio.h"

int judgk_hyperio_init(){
    int i;
    struct hyperio_info *info;

    hyperio_filp_ht = (struct hlist_head*)kmalloc(sizeof(struct hlist_head) * HYPERIO_FILP_HTSIZE,GFP_KERNEL);
    for(i = 0;i < HYPERIO_FILP_HTSIZE;i++){
	INIT_HLIST_HEAD(&hyperio_filp_ht[i]);
    }

    hyperio_table = (struct hyperio_info*)kmalloc(sizeof(struct hyperio_info) * HYPERIO_MAXNUM,GFP_KERNEL);
    for(i = 0;i < HYPERIO_MAXNUM;i++){
	info = &hyperio_table[i];

	atomic_set(&info->ref_count,0);
	info->filp = NULL;
	info->create_flag = false;
	info->end_flag = false;
	info->hook_fops = NULL;
	info->old_fops = NULL;
	
	atomic64_set(&info->read_remain,JUDGK_COM_HYPERIO_BUFSIZE);
	info->read_off = 0;
	info->read_buf = NULL;
	init_completion(&info->read_rwait);
	init_completion(&info->read_wwait);

	atomic64_set(&info->write_remain,JUDGK_COM_HYPERIO_BUFSIZE);
	info->write_off = 0;
	info->write_buf = NULL;
	init_completion(&info->write_rwait);
	init_completion(&info->write_wwait);
    }

    hyperio_tty_drv = tty_alloc_driver(HYPERIO_MAXNUM,TTY_DRIVER_REAL_RAW | TTY_DRIVER_DYNAMIC_DEV);
    hyperio_tty_drv->owner = THIS_MODULE;
    hyperio_tty_drv->driver_name = "judgk_tty";
    hyperio_tty_drv->name = "jtty";
    hyperio_tty_drv->type = TTY_DRIVER_TYPE_SYSTEM;
    hyperio_tty_drv->subtype = SYSTEM_TYPE_TTY;
    hyperio_tty_drv->flags = TTY_DRIVER_REAL_RAW | TTY_DRIVER_DYNAMIC_DEV;
    hyperio_tty_drv->init_termios = tty_std_termios;
    hyperio_tty_drv->init_termios.c_iflag &= ~(IGNBRK | BRKINT | PARMRK | ISTRIP | INLCR | IGNCR | ICRNL | IXON);
    hyperio_tty_drv->init_termios.c_oflag &= ~OPOST;
    hyperio_tty_drv->init_termios.c_lflag &= ~(ECHO | ECHONL | ICANON | ISIG | IEXTEN);
    hyperio_tty_drv->init_termios.c_cflag &= ~(CSIZE | PARENB);
    hyperio_tty_drv->init_termios.c_cflag |= CS8;
    tty_set_operations(hyperio_tty_drv,&hyperio_tops);

    tty_register_driver(hyperio_tty_drv);

    return 0;
}
int judgk_hyperio_exit(){
    int i;

    for(i = 0;i < HYPERIO_MAXNUM;i++){
	if(hyperio_table[i].create_flag == true){
	    tty_unregister_device(hyperio_tty_drv,i);
	    hyperio_table[i].create_flag = false;
	}
    }
    tty_unregister_driver(hyperio_tty_drv);

    return 0;
}
int judgk_hyperio_add(struct file *filp){
    int idx;
    struct hyperio_info *info;

    info = NULL;
    for(idx = 0;idx < HYPERIO_MAXNUM;idx++){
	if(atomic_cmpxchg(&hyperio_table[idx].ref_count,0,1) == 0){
	    info = &hyperio_table[idx];
	    break;
	}
    }
    if(info == NULL){
	return -1;
    }

    filp->private_data = info;

    info->filp = NULL;
    if(info->create_flag == false){
	tty_port_init(&info->port);
	tty_port_register_device(&info->port,hyperio_tty_drv,idx,NULL);
	info->create_flag = true;
    }
    info->end_flag = false;
    if(info->hook_fops == NULL){
	info->hook_fops = (struct file_operations*)kmalloc(sizeof(struct file_operations),GFP_KERNEL);
    }

    atomic64_set(&info->read_remain,JUDGK_COM_HYPERIO_BUFSIZE);
    info->read_off = 0;
    if(info->read_buf == NULL){
	info->read_buf = kmalloc(JUDGK_COM_HYPERIO_BUFSIZE,GFP_KERNEL);
    }
    memset(info->read_buf,0,JUDGK_COM_HYPERIO_BUFSIZE);
    init_completion(&info->read_rwait);
    init_completion(&info->read_wwait);

    atomic64_set(&info->write_remain,JUDGK_COM_HYPERIO_BUFSIZE);
    info->write_off = 0;
    if(info->write_buf == NULL){
	info->write_buf = kmalloc(JUDGK_COM_HYPERIO_BUFSIZE,GFP_KERNEL);
    }
    memset(info->write_buf,0,JUDGK_COM_HYPERIO_BUFSIZE);
    init_completion(&info->write_rwait);
    init_completion(&info->write_wwait);

    return idx;
}
int judgk_hyperio_read(struct file *filp,size_t len){
    struct hyperio_info *info;
    bool wait_flag;
    size_t remain;

    if((long)len >= 0){
	wait_flag = true;
    }else{
	wait_flag = false;
	len = -(long)len;
    }

    info = (struct hyperio_info*)filp->private_data;

    remain = atomic64_read(&info->write_remain);
    if(unlikely(len > (JUDGK_COM_HYPERIO_BUFSIZE - remain))){
	return -EINVAL;
    }

    if(unlikely(len > 0 && (remain = atomic64_add_return(len,&info->write_remain)) == len)){
	complete(&info->write_wwait);
    }
    if(wait_flag == true){
	while(unlikely(remain == JUDGK_COM_HYPERIO_BUFSIZE)){
	    if(info->end_flag == true){
		remain = atomic64_read(&info->write_remain);
		break;
	    }
	    wait_for_completion_interruptible(&info->write_rwait);
	    remain = atomic64_read(&info->write_remain);
	}
    }

    return JUDGK_COM_HYPERIO_BUFSIZE - remain;
}
int judgk_hyperio_write(struct file *filp,size_t len){
    struct hyperio_info *info;
    bool wait_flag;
    size_t remain;

    if((long)len >= 0){
	wait_flag = true;
    }else{
	wait_flag = false;
	len = -(long)len;
    }

    info = (struct hyperio_info*)filp->private_data;

    remain = atomic64_read(&info->read_remain);
    if(unlikely(len > remain)){
	return -EINVAL;
    }

    if(unlikely(len > 0 && (remain = atomic64_sub_return(len,&info->read_remain)) == (JUDGK_COM_HYPERIO_BUFSIZE - len))){
	complete(&info->read_rwait);
    }
    if(wait_flag == true){
	while(unlikely(remain == 0)){
	    if(info->end_flag == true){
		remain = atomic64_read(&info->read_remain);
		break;
	    }
	    wait_for_completion_interruptible(&info->read_wwait);
	    remain = atomic64_read(&info->read_remain);
	}
    }

    return remain;
}
int judgk_hyperio_del(struct file *filp){
    struct hyperio_info *info;

    info = (struct hyperio_info*)filp->private_data;
    info->end_flag = true;
    complete(&info->read_rwait);
    complete(&info->read_wwait);
    complete(&info->write_rwait);
    complete(&info->write_wwait);

    atomic_dec(&info->ref_count);
    return 0;
}
int judgk_hyperio_mmap(struct file *filp,struct vm_area_struct *vma){
    unsigned long size;
    unsigned long off;
    void *buf;

    size = vma->vm_end - vma->vm_start;
    off = vma->vm_pgoff << PAGE_SHIFT;
    if((size + off) > JUDGK_COM_HYPERIO_BUFSIZE){
	return -EINVAL;	
    }
    if((vma->vm_flags & VM_READ) != 0 && (vma->vm_flags & VM_WRITE) != 0){
	return -EINVAL;
    }
    if((vma->vm_flags & VM_READ) == 0 && (vma->vm_flags & VM_WRITE) == 0){
	return -EINVAL;
    }

    if((vma->vm_flags & VM_READ) != 0){
	buf = ((struct hyperio_info*)filp->private_data)->write_buf;
    }else{
	buf = ((struct hyperio_info*)filp->private_data)->read_buf;
    }
    remap_pfn_range(vma,
	    vma->vm_start,
	    virt_to_phys(buf + off) >> PAGE_SHIFT,
	    size,
	    vma->vm_page_prot);

    return 0;
}

static inline struct hyperio_info* hyperio_filp_lookup(struct file *filp){
    struct hyperio_info *info;

    rcu_read_lock();

    info = NULL;
    hlist_for_each_entry_rcu(info,&hyperio_filp_ht[(unsigned long)filp % HYPERIO_FILP_HTSIZE],node){
	if((unsigned long)info->filp == (unsigned long)filp){
	    break;
	}
	info = NULL;
    }

    rcu_read_unlock();

    return info;
}
static int hyperio_tty_open(struct tty_struct *tty, struct file *filp){
    struct hyperio_info *info;
    struct file_operations *hook_fops;
    
    info = &hyperio_table[tty->index];
    atomic_inc(&info->ref_count);
    info->filp = filp;

    hook_fops = info->hook_fops;
    info->old_fops = filp->f_op;
    memcpy(hook_fops,filp->f_op,sizeof(struct file_operations));

    hook_fops->read = hyperio_tty_filpread;
    hook_fops->write = hyperio_tty_filpwrite;

    filp->f_op = hook_fops;

    spin_lock(&hyperio_filp_htlock);

    hlist_add_head_rcu(&info->node,&hyperio_filp_ht[(unsigned long)info->filp % HYPERIO_FILP_HTSIZE]);

    spin_unlock(&hyperio_filp_htlock);

    return 0;
}
static void hyperio_tty_close(struct tty_struct *tty, struct file *filp){
    struct hyperio_info *info;

    info = &hyperio_table[tty->index];
    
    spin_lock(&hyperio_filp_htlock);

    hlist_del_rcu(&info->node);

    spin_unlock(&hyperio_filp_htlock);
    
    filp->f_op = info->old_fops;

    info->end_flag = true;
    complete(&info->read_rwait);
    complete(&info->read_wwait);
    complete(&info->write_rwait);
    complete(&info->write_wwait);

    atomic_dec(&info->ref_count);
}
static int hyperio_tty_write(struct tty_struct *tty,const unsigned char *buf,int count){
    return count;
}
static int hyperio_tty_write_room(struct tty_struct *tty){
    return JUDGK_COM_HYPERIO_BUFSIZE;
}
static ssize_t hyperio_tty_filpread(struct file *filp,char __user *buf,size_t count,loff_t *off){
    struct hyperio_info *info;
    size_t buf_len;
    off_t buf_off;
    size_t remain;
    size_t read_len;
    off_t read_off;

    if(unlikely(count < 0)){
	return -EINVAL;
    }

    info = hyperio_filp_lookup(filp);
    if(unlikely(info == NULL)){
	return -EIO;
    }

    buf_len = count;
    buf_off = 0;
    while(likely(buf_len > 0)){
	while(unlikely((remain = atomic64_read(&info->read_remain)) == JUDGK_COM_HYPERIO_BUFSIZE)){
	    if(unlikely(info->end_flag == true)){
		return -EIO;
	    }
	    if(likely(buf_off > 0)){
		return buf_off;
	    }
	    wait_for_completion_interruptible(&info->read_rwait);
	}
	if(unlikely(buf_len > (JUDGK_COM_HYPERIO_BUFSIZE - remain))){
	    read_len = JUDGK_COM_HYPERIO_BUFSIZE - remain;
	}else{
	    read_len = buf_len;
	}

	read_off = info->read_off;
	if(likely((read_len + read_off) < JUDGK_COM_HYPERIO_BUFSIZE)){
	    copy_to_user(buf + buf_off,info->read_buf + read_off,read_len); 
	    info->read_off = read_len + read_off;
	}else{
	    copy_to_user(buf + buf_off,info->read_buf + read_off,JUDGK_COM_HYPERIO_BUFSIZE - read_off); 
	    copy_to_user(buf + buf_off + (JUDGK_COM_HYPERIO_BUFSIZE - read_off),info->read_buf,(read_len + read_off) - JUDGK_COM_HYPERIO_BUFSIZE); 
	    info->read_off = (read_len + read_off) - JUDGK_COM_HYPERIO_BUFSIZE;
	}

	if(unlikely(atomic64_add_return(read_len,&info->read_remain) == read_len)){
	    complete(&info->read_wwait);
	}
	buf_len -= read_len;
	buf_off += read_len;
    }

    return count;
}
static ssize_t hyperio_tty_filpwrite(struct file *filp,const char __user *buf,size_t count,loff_t *off){
    struct hyperio_info *info;
    size_t buf_len;
    off_t buf_off;
    size_t remain;
    size_t write_len;
    off_t write_off;

    if(unlikely(count < 0)){
	return -EINVAL;
    }

    info = hyperio_filp_lookup(filp);
    if(unlikely(info == NULL)){
	return -EIO;
    }

    buf_len = count;
    buf_off = 0;
    while(likely(buf_len > 0)){
	while(unlikely((remain = atomic64_read(&info->write_remain)) == 0)){
	    if(unlikely(info->end_flag == true)){
		return -EIO;
	    }
	    wait_for_completion_interruptible(&info->write_wwait);
	}
	if(unlikely(buf_len > remain)){
	    write_len = remain;
	}else{
	    write_len = buf_len; 
	}

	write_off = info->write_off;
	if(unlikely((write_len + write_off) >= JUDGK_COM_HYPERIO_BUFSIZE)){
	    copy_from_user(info->write_buf + write_off,buf + buf_off,JUDGK_COM_HYPERIO_BUFSIZE - write_off); 
	    copy_from_user(info->write_buf,buf + buf_off + (JUDGK_COM_HYPERIO_BUFSIZE - write_off),(write_len + write_off) - JUDGK_COM_HYPERIO_BUFSIZE); 
	    info->write_off = (write_len + write_off) - JUDGK_COM_HYPERIO_BUFSIZE;
	}else{
	    copy_from_user(info->write_buf + write_off,buf + buf_off,write_len); 
	    info->write_off = write_len + write_off;
	}

	if(unlikely(atomic64_sub_return(write_len,&info->write_remain) == (JUDGK_COM_HYPERIO_BUFSIZE - write_len))){
	    complete(&info->write_rwait);
	}
	buf_len -= write_len;
	buf_off += write_len;
    }

    return count;
}
