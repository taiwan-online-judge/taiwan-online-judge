#define LINE_ERRMSG_MAXSIZE 4096

typedef int (*check_init_fn)(int judgk_modfd,char *data_path,char *run_path);
typedef int (*check_run_fn)(int &status,char *err_msg);
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
    char err_msg[LINE_ERRMSG_MAXSIZE];
};
