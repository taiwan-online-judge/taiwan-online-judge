#include<linux/fs.h>
#include<linux/security.h>
#include<linux/sched.h>
#include<linux/hardirq.h>
#include<linux/vmalloc.h>
#include<asm/uaccess.h>

#include"judge_def.h"
#include"judgk.h"
#include"judgk_security.h"

int judgk_security_hook(){
    int i;

    int count;
    size_t len;
    unsigned long *ori_array;
    unsigned long *hook_array;
    void *addr;

    security_init_hook();

    ori_sops = (struct security_operations*)*security_hook_addr;
    memcpy(&hook_sops,ori_sops,sizeof(struct security_operations));

    count = (sizeof(hook_sops) - sizeof(hook_sops.name)) / sizeof(unsigned long);
    len = (judgk_security_blockend - judgk_security_block) + sizeof(unsigned long);
    security_block_code = __vmalloc(((((len * count - 1) >> PAGE_SHIFT) + 1) << PAGE_SHIFT),GFP_KERNEL | GFP_ATOMIC,PAGE_KERNEL_EXEC);

    judgk_security_checkaddr = (unsigned long)security_check;

    ori_array = (unsigned long*)(((char*)ori_sops) + sizeof(hook_sops.name));
    hook_array = (unsigned long*)(((char*)&hook_sops) + sizeof(hook_sops.name));
    for(i = 0;i < count;i++){
	addr = (((char*)security_block_code) + len * i);
	memcpy(addr,&ori_array[i],sizeof(unsigned long));
	memcpy(((char*)addr + sizeof(unsigned long)),judgk_security_block,len - sizeof(unsigned long));
	hook_array[i] = (unsigned long)addr + sizeof(unsigned long);
    }

    //hook_sops.capable = hook_capable;
    //hook_sops.bprm_set_creds = hook_bprm_set_creds;
    //hook_sops.bprm_check_security = hook_bprm_check_security;
    //hook_sops.bprm_secureexec = hook_bprm_secureexec;
    //hook_sops.bprm_committing_creds = hook_bprm_committing_creds;
    //hook_sops.bprm_committed_creds = hook_bprm_committed_creds;
    //hook_sops.inode_alloc_security = hook_inode_alloc_security;
    //hook_sops.inode_free_security = hook_inode_free_security;
    //hook_sops.inode_follow_link = hook_inode_follow_link;
    //hook_sops.inode_getattr = hook_inode_getattr;
    //hook_sops.file_alloc_security = hook_file_alloc_security;
    //hook_sops.file_free_security = hook_file_free_security;
    //hook_sops.mmap_addr = hook_mmap_addr;
    //hook_sops.mmap_file = hook_mmap_file;
    //hook_sops.file_mprotect = hook_file_mprotect;
    //hook_sops.task_free = hook_task_free;
    //hook_sops.cred_free = hook_cred_free;
    //hook_sops.cred_prepare = hook_cred_prepare;

    *security_hook_addr = (unsigned long)&hook_sops;

    return 0;
}
int judgk_security_unhook(){
    *security_hook_addr = (unsigned long)ori_sops;
    return 0;
}

static int security_init_hook(){
    ssize_t ret;
    int i;
    int j;

    struct file *f;
    char line[128];
    unsigned char code[3] = {0x48,0xc7,0x05};
    unsigned long addr;

    f = filp_open("/proc/meminfo",O_RDONLY,0);
    security_meminfo_ino = f->f_dentry->d_inode->i_ino;
    filp_close(f,NULL);

    f = filp_open("/proc/kallsyms",O_RDONLY,0);
    set_fs(KERNEL_DS);

    i = 0;
    addr = 0;
    while(true){
	ret = f->f_op->read(f,&line[i],1,&f->f_pos);

	if(line[i] == '\n' || ret <= 0){
	    line[i] = '\0';

	    addr = 0;
	    for(j = 0;j < i;j++){
		if(line[j] == ' '){
		    j++;
		    break;
		}

		addr *= 16UL;
		if(line[j] >= '0' && line[j] <= '9'){
		    addr += (unsigned long)(line[j] - '0');
		}else{
		    addr += (unsigned long)(line[j] - 'a' + 10);
		}
	    }
	    for(;j < i;j++){
		if(line[j] == ' '){
		    j++;
		    break;
		}
	    }
	    if(j < i){
		if(strcmp("reset_security_ops",line + j) == 0){
		    break;
		}
	    }

	    i = 0;
	}else{
	    i++;
	}

	if(ret <= 0){
	    break;
	}
    }

    set_fs(USER_DS);
    filp_close(f,NULL);

    i = 0;    
    while(i < 3){
	if(*(unsigned char*)addr != code[i]){
	    i = 0;
	}else{
	    i++;
	}
	addr++;
    }
    
    security_hook_addr = (unsigned long*)(addr + (unsigned long)*(unsigned int*)addr + 8UL);

    return 0;
}
static unsigned long security_check(void){
    struct judgk_proc_info *info;

    info = judgk_proc_task_lookup(current);
    if(likely(info == NULL || in_interrupt())){
	return 0;
    }

    pr_alert("judgk:PID %d  Security block\n",current->tgid);

    security_hook_rf(info);
    return -EACCES;
}
static inline void security_hook_rf(struct judgk_proc_info *info){
    info->status = JUDGE_RF; 
    send_sig(SIGKILL,current,0);
}

static int hook_inode_permission(struct inode *inode,int mask){
    struct judgk_proc_info *info;

    info = judgk_proc_task_lookup(current);
    if(likely(info == NULL || in_interrupt())){
	return ori_sops->inode_permission(inode,mask);
    }

    if((mask & ~(MAY_EXEC | MAY_READ | MAY_OPEN | MAY_CHDIR | MAY_NOT_BLOCK)) != 0){
	pr_alert("judgk:PID %d  RF inode_permission %08x\n",current->tgid,mask);

	security_hook_rf(info);
	return -EACCES;
    }
    return ori_sops->inode_permission(inode,mask);
}
static int hook_file_permission(struct file *file,int mask){
    struct judgk_proc_info *info;

    info = judgk_proc_task_lookup(current);
    if(likely(info == NULL || in_interrupt())){
	return ori_sops->file_permission(file,mask);
    }

    if((mask & ~(MAY_READ | MAY_WRITE)) != 0){
	security_hook_rf(info);
	return -EACCES;
    }else if((mask & MAY_WRITE) != 0 && file != info->std_out){
	security_hook_rf(info);
	return -EACCES;
    }
    return ori_sops->file_permission(file,mask);
}
static int hook_file_open(struct file *file, const struct cred *cred){
    int ret;
    int i;

    struct judgk_proc_info *info;
    char *buf_path,*path;

    info = judgk_proc_task_lookup(current);
    if(likely(info == NULL || in_interrupt())){
	return ori_sops->file_open(file,cred);
    }

    ret = 0;
    buf_path = kmalloc(sizeof(char) * (PATH_MAX + 1),GFP_KERNEL);
    path = d_path(&file->f_path,buf_path,PATH_MAX + 1);

    if((file->f_mode & !(FMODE_READ | FMODE_LSEEK | FMODE_PREAD | FMODE_EXEC)) != 0){
	ret = -EACCES;
    }else if(file->f_dentry->d_inode == NULL || file->f_dentry->d_inode->i_ino != security_meminfo_ino){
	i = 0;
	while(info->run_path[i] != '\0'){
	    if(path[i] != info->run_path[i]){
		ret = -EACCES;
		break;
	    }
	    i++;
	}
	if(path[i] == info->run_path[i]){
	    ret = -EACCES;
	}
    }

    kfree(buf_path);

    if(ret != 0){
	pr_alert("judgk:PID %d  RF file_open %s %08x\n",current->tgid,path,file->f_mode);

	security_hook_rf(info);
	return ret;
    }
    return ori_sops->file_open(file,cred);
}
static int hook_file_ioctl(struct file *file,unsigned int cmd,unsigned long arg){
    struct judgk_proc_info *info;

    info = judgk_proc_task_lookup(current);
    if(likely(info == NULL || in_interrupt())){
	return ori_sops->file_ioctl(file,cmd,arg);
    }

    if(file != info->std_in && file != info->std_out){
	pr_alert("judgk:PID %d  file_ioctl\n",current->tgid);

	security_hook_rf(info);
	return -EACCES;
    }
    return ori_sops->file_ioctl(file,cmd,arg);
}
static void hook_d_instantiate(struct dentry *dentry,struct inode *inode){
    struct judgk_proc_info *info;

    info = judgk_proc_task_lookup(current);
    if(likely(info == NULL || in_interrupt())){
	return ori_sops->d_instantiate(dentry,inode);
    }

    if(inode == NULL || inode->i_ino != security_meminfo_ino){
	pr_alert("judgk:PID %d  d_instantiate\n",current->tgid);
	security_hook_rf(info);
    }
    return ori_sops->d_instantiate(dentry,inode);
}
static int hook_vm_enough_memory(struct mm_struct *mm,long pages){
    struct judgk_proc_info *info;

    info = judgk_proc_task_lookup(current);
    if(likely(info == NULL)){
	return ori_sops->vm_enough_memory(mm,pages);
    }

    info->memory = (mm->total_vm + pages) << PAGE_SHIFT;
    //pr_alert("judgk:PID %d  vm_enough_memory %lu\n",current->tgid,info->memory);

    if(info->memory > info->memlimit){
	info->status = JUDGE_MLE;
	send_sig(SIGKILL,current,0);
	return -EACCES;
    }
    return ori_sops->vm_enough_memory(mm,pages);
}
