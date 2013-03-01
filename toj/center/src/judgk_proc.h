#define PROC_TASK_HTSIZE 1009

static int proc_watcher(void *data);
static int proc_get_path(char *in_path,char *real_path);
static int proc_close_fd(struct task_struct *task);

static struct task_struct *proc_watcher_task;
static LIST_HEAD(proc_task_list);
static struct hlist_head *proc_task_ht;
static DEFINE_SPINLOCK(proc_task_htlock);
static struct kmem_cache *proc_info_cachep;

int judgk_proc_init(void);
int judgk_proc_exit(void);
int judgk_proc_add(unsigned long arg);
int judgk_proc_get(unsigned long arg);
int judgk_proc_del(unsigned long arg);
struct judgk_proc_info* judgk_proc_task_lookup(struct task_struct *task);
