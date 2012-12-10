static __attribute__((constructor)) void judgx_init(void);
static __attribute__((destructor)) void judgx_exit(void);
static int rmdir_callback(const char *path,const struct stat *st,int flag,struct FTW *ftwbuf);
static int proc_protect(struct judgx_proc_info *proc_info);

static int judgx_modfd;

DLL_PUBLIC int judgx_ini_load(FILE *f,judgx_ini_handler handler,void *data);
DLL_PUBLIC int judgx_compile(char *cpppath,char *exepath,char *arg);
DLL_PUBLIC struct judgx_proc_info* judgx_proc_create(char *runpath,char *exepath,unsigned long timelimit,unsigned long hardtimelimit,unsigned long memlimit);
DLL_PUBLIC int judgx_proc_run(struct judgx_proc_info *proc_info,judgx_check_run_fn check_run);
DLL_PUBLIC int judgx_proc_kill(struct judgx_proc_info *proc_info);
DLL_PUBLIC int judgx_proc_free(struct judgx_proc_info *proc_info);
