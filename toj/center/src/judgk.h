struct judgk_proc_info{
    struct hlist_node node;
    struct list_head list;

    struct task_struct *task;
    struct file *std_in;
    struct file *std_out;
    char run_path[PATH_MAX + 1];
    int status;
    unsigned long timelimit;
    unsigned long jiff_start;
    unsigned long jiff_end;
    unsigned long memlimit;
    unsigned long runtime;
    unsigned long memory;
};
