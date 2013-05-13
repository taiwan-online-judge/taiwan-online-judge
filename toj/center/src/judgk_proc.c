#include<linux/fs.h>
#include<linux/slab.h>
#include<linux/fdtable.h>
#include<linux/sched.h>
#include<linux/kthread.h>
#include<asm/uaccess.h>

#include"judge_def.h"
#include"judgk.h"
#include"judgk_com.h"
#include"judgk_proc.h"

int judgk_proc_init(){
    int i;

    proc_task_ht = kmalloc(sizeof(struct hlist_head) * PROC_TASK_HTSIZE,GFP_KERNEL);
    for(i = 0;i < PROC_TASK_HTSIZE;i++){
	INIT_HLIST_HEAD(&proc_task_ht[i]);
    }
    proc_info_cachep = kmem_cache_create("proc_info_cachep",sizeof(struct judgk_proc_info),0,0,NULL);

    proc_watcher_task = kthread_run(proc_watcher,NULL,"judgk_proc");

    return 0;
}
int judgk_proc_exit(){
    kthread_stop(proc_watcher_task);
    return 0;
}

int judgk_proc_add(unsigned long arg){
    int ret;

    struct task_struct *task;
    struct judgk_proc_info *info;
    struct judgk_com_proc_add *com_proc_add;

    ret = 0;
    com_proc_add = kmalloc(sizeof(struct judgk_com_proc_add),GFP_KERNEL);
    copy_from_user(com_proc_add,(void* __user)arg,sizeof(struct judgk_com_proc_add));

    if((task = get_pid_task(find_vpid(com_proc_add->pid),PIDTYPE_PID)) == NULL){
	ret = -1;
	goto end;
    }
    if(judgk_proc_task_lookup(task) != NULL){
	put_task_struct(task);
	ret = -1;
	goto end;
    }

    info = kmem_cache_alloc(proc_info_cachep,GFP_KERNEL);
    info->task = task;
    info->std_in = fcheck_files(task->files,0);
    info->std_out = fcheck_files(task->files,1);
    info->status = JUDGE_AC;
    info->timelimit = com_proc_add->timelimit;
    info->jiff_start = jiffies;
    info->jiff_end = info->jiff_start + usecs_to_jiffies(com_proc_add->hardtimelimit);
    info->memlimit = com_proc_add->memlimit;
    info->runtime = 0L;
    info->memory = 0L;

    if(proc_get_path(com_proc_add->run_path,info->run_path)){
	put_task_struct(task);
	kmem_cache_free(proc_info_cachep,info);

	ret = -1;
	goto end;
    }
    proc_close_fd(task);

    spin_lock(&proc_task_htlock);

    list_add_rcu(&info->list,&proc_task_list);
    hlist_add_head_rcu(&info->node,&proc_task_ht[(unsigned long)info->task % PROC_TASK_HTSIZE]);

    spin_unlock(&proc_task_htlock);

    com_proc_add->kern_task = (unsigned long)task;
    copy_to_user((void* __user)arg,com_proc_add,sizeof(struct judgk_com_proc_add));

end:

    kfree(com_proc_add);

    return ret;
}
int judgk_proc_get(unsigned long arg){
    struct task_struct *task;
    struct judgk_proc_info *info;
    struct judgk_com_proc_get *com_proc_get;

    com_proc_get = kmalloc(sizeof(struct judgk_com_proc_get),GFP_KERNEL);
    copy_from_user(com_proc_get,(void* __user)arg,sizeof(struct judgk_com_proc_get));
    task = (struct task_struct*)com_proc_get->kern_task;
    if((info = judgk_proc_task_lookup(task)) == NULL){
	kfree(com_proc_get);
	return -1;
    }

    com_proc_get->status = info->status;
    if(info->runtime > 0L){
	com_proc_get->runtime = info->runtime;
    }else{
	com_proc_get->runtime = cputime_to_usecs(task->utime);
	info->runtime = com_proc_get->runtime;
    }
    com_proc_get->memory = info->memory;

    copy_to_user((void* __user)arg,com_proc_get,sizeof(struct judgk_com_proc_get));
    kfree(com_proc_get);

    spin_lock(&proc_task_htlock);

    list_del_rcu(&info->list);
    hlist_del_rcu(&info->node);

    spin_unlock(&proc_task_htlock);

    synchronize_rcu();

    put_task_struct(info->task);
    kmem_cache_free(proc_info_cachep,info);

    return 0;
}
int judgk_proc_del(unsigned long arg){
    struct task_struct *task;
    struct judgk_proc_info *info;

    task = (struct task_struct*)arg;
    if((info = judgk_proc_task_lookup(task)) == NULL){
	return -1;
    }

    spin_lock(&proc_task_htlock);

    list_del_rcu(&info->list);
    hlist_del_rcu(&info->node);

    spin_unlock(&proc_task_htlock);

    synchronize_rcu();

    put_task_struct(info->task);
    kmem_cache_free(proc_info_cachep,info);

    return 0;
}
struct judgk_proc_info* judgk_proc_task_lookup(struct task_struct *task){
    struct judgk_proc_info *info;

    rcu_read_lock();

    info = NULL;
    hlist_for_each_entry_rcu(info,&proc_task_ht[(unsigned long)task % PROC_TASK_HTSIZE],node){
	if((unsigned long)info->task == (unsigned long)task){
	    break;
	}
	info = NULL;
    }

    rcu_read_unlock();

    return info;
}

static int proc_watcher(void *data){
    struct judgk_proc_info *info;

    while(!kthread_should_stop()){
    
	rcu_read_lock();

	list_for_each_entry_rcu(info,&proc_task_list,list){
	    if(cputime_to_usecs(info->task->utime) > info->timelimit){
		info->status = JUDGE_TLE;
		send_sig(SIGKILL,info->task,0);
	    }else if(time_after(jiffies,info->jiff_end)){
		info->runtime = jiffies_to_usecs((unsigned long)(-((long)info->jiff_start - (long)jiffies)));
		info->status = JUDGE_TLE;
		send_sig(SIGKILL,info->task,0);
	    }
	}

	rcu_read_unlock();

	schedule_timeout_interruptible(HZ / 2);
    }

    return 0;
}
static int proc_get_path(char *in_path,char *real_path){
    struct file *f;
    char *buf_path;

    if(IS_ERR(f = filp_open(in_path,O_RDONLY,0))){
	return -1;
    }

    buf_path = kmalloc(sizeof(char) * (PATH_MAX + 1),GFP_KERNEL);
    real_path[0] = '\0';
    strncat(real_path,d_path(&f->f_path,buf_path,PATH_MAX + 1),PATH_MAX + 1);
    kfree(buf_path);
    filp_close(f,NULL);

    return 0;
}
//Watch out kernel update
static int proc_close_fd(struct task_struct *task){
    struct file *f;
    struct files_struct *files;
    struct fdtable *fdt;
    int fd;

    files = task->files;

    spin_lock(&files->file_lock);

    fdt = files_fdtable(files); 
    for(fd = 3;fd < fdt->max_fds;fd++){
	if((fd = find_next_bit(fdt->open_fds,fdt->max_fds,fd)) >= fdt->max_fds){
	    break;
	}
	f = fdt->fd[fd];
	if(f == NULL){
	    continue;
	}

	rcu_assign_pointer(fdt->fd[fd],NULL);
	__clear_bit(fd,fdt->close_on_exec);
	__clear_bit(fd,fdt->open_fds);
	if(fd < files->next_fd){
	    files->next_fd = fd;
	}

	spin_unlock(&files->file_lock);

	filp_close(f,files);

	spin_lock(&files->file_lock);

    }

    spin_unlock(&files->file_lock);

    return 0;
}
