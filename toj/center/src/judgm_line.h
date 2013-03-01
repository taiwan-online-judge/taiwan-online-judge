struct judgm_line_info{
    int subid;

    char *pro_path;
    char *code_path;
    char *run_path;
    
    int judgk_modfd;
    void *line_dll;
    void *check_dll;

    int lang;
    FILE *set_file;
    char *set_data;
    
    char res_data[JUDGE_RES_DATAMAX];
    size_t res_len;
};
typedef int (*judgm_line_run_fn)(judgm_line_info *info);
