struct judgm_proc_info{
    struct hlist_node node;
    struct list_head list;

    struct task_struct *task;
    struct file *pin;
    struct file *pout;
    char run_path[PATH_MAX + 1];
    int status;
    unsigned long timelimit;
    unsigned long jiffiesstart;
    unsigned long jiffiesend;
    unsigned long memlimit;
    unsigned long runtime;
    unsigned long peakmem;
};
