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
static ssize_t xpack_readfn(long fd,void *buf,size_t count);

static std::map<int,pack_bzinfo*> pack_fdmap;

int pack_pack(char *packpath,char *dirpath);
int pack_unpack(char *packpath,char *dirpath);
