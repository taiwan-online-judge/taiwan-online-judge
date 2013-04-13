static int security_init_hook(void);
static inline void security_kill(void);
static long security_check(void);

static unsigned long security_meminfo_ino;
static unsigned long* security_hook_addr;
static struct security_operations *ori_sops;
static struct security_operations hook_sops;
static void *security_block_code;

int judgk_security_hook(void);
int judgk_security_unhook(void);

unsigned long judgk_security_checkaddr;

extern struct judgk_proc_info* judgk_proc_task_lookup(struct task_struct *task);
extern void judgk_security_block(void);
extern void judgk_security_blockend(void);

static int hook_inode_permission(struct inode *inode,int mask);
static int hook_file_permission(struct file *file,int mask);
static int hook_file_open(struct file *file, const struct cred *cred);
static int hook_file_ioctl(struct file *file,unsigned int cmd,unsigned long arg);
static void hook_d_instantiate(struct dentry *dentry,struct inode *inode);
static int hook_vm_enough_memory(struct mm_struct *mm,long pages);
