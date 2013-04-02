#define PACK_BUFSIZE 65536
struct pack_bzinfo{
    bz_stream bzs;
    char buf[PACK_BUFSIZE];
    int len;
    int off;
    bool endflag;
};

static int pack_copenfn(const char *pathname,int flags,...);
static int pack_cclosefn(long fd);
static ssize_t cpack_writefn(long fd,const void *buf,size_t count);
static int pack_xopenfn(const char *pathname,int flags,...);
static int pack_xclosefn(long fd);
static ssize_t pack_xreadfn(long fd,void *buf,size_t count);

static std::map<int,pack_bzinfo*> pack_fdmap;

int tool_pack(char *pack_path,char *dir_path);
int tool_unpack(char *pack_path,char *dir_path);

static int cleardir_callback(const char *path,const struct stat *st,int flag,struct FTW *ftw_buf);
static int copydir_travel(char *old_path,int old_len,char *new_path,int new_len);

int tool_cleardir(char *path);
int tool_copydir(char *old_path,char *new_path);
