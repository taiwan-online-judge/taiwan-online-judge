typedef int (*check_init_fn)(int judgk_modfd,char *datapath,char *runpath);
typedef int (*check_run_fn)(int &status);
typedef int (*check_stop_fn)();

struct line_set_data{
    int test_id;
};
struct line_result_data{
    int test_id;
    int status;
    double score;
    unsigned long runtime;
    unsigned long memory;
    char errmsg[4096];
};
