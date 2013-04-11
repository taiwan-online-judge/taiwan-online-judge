static int security_init_hook(void);
static unsigned long security_check(void);
static inline void security_hook_rf(struct judgk_proc_info *info);

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

