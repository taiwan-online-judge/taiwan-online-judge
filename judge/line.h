#define CHECK_THREAD_WAITTIME 5

typedef int (*check_init_fn)(char *runpath,char *datapath);
typedef void* (*check_thread_fn)(void *arg);
typedef int (*check_stop_fn)(void);

struct line_setting_info{
    unsigned long timelimit;
    unsigned long hardtimelimit;
    unsigned long memlimit;
    int count;
    int score[JUDGX_LINE_RESULTMAX];
};
struct line_procrun_info{
    struct judgx_proc_info *proc_info;
    judgx_check_run_fn check_run;
    sem_t *done_sem;
};
struct check_thread_info{
    int status;
    sem_t *done_sem;
};

static void line_ini_handler(void *data,char *section,char *key,char *value);
static void* line_procrun_thread(void *arg);

DLL_PUBLIC int run(struct judgx_line_info *line_info);
