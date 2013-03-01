static int line_load_setfile(FILE *set_file,int test_id,int &timelimit,int &memlimit,double &score);
static int line_sig_set();
static int line_sig_restore();
static int line_sig_block();
static int line_sig_unblock();
static int line_sig_wait();

static judgm_proc *line_proc;
static check_stop_fn line_chk_stop_fn;

DLL_PUBLIC int run(judgm_line_info *info);
