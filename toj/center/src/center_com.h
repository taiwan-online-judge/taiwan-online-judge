#define CENTER_COMCODE_SETID 1
#define CENTER_COMCODE_SETINFO 2
#define CENTER_COMCODE_SUBMIT 3
#define CENTER_COMCODE_RESULT 4

#define CENTER_COMCODE_SETPRO 10
#define CENTER_COMCODE_REQPRO 11
#define CENTER_COMCODE_SENDPRO 12
#define CENTER_COMCODE_SETJMOD 13
#define CENTER_COMCODE_REQJMOD 14
#define CENTER_COMCODE_SENDJMOD 15

#define CENTER_COMCODE_REQCODE 20
#define CENTER_COMCODE_SENDCODE 21

struct center_com_header{
    int code;
    int size;
}__attribute__((packed));
struct center_com_setid{
    int id;  //0:new judge
}__attribute__((packed));
struct center_com_setinfo{
    int avail;
}__attribute__((packed));
struct center_com_submit{
    int subid;
    int proid;
    int lang;
    char set_data[JUDGE_SET_DATAMAX];
}__attribute__((packed));
struct center_com_result{ //just result header
    int subid;
}__attribute__((packed));

struct center_com_setpro{
    int proid;
    int cacheid;
    int type;  //0:add problem 1:drop problem
}__attribute__((packed));
struct center_com_reqpro{
    int proid;
}__attribute__((packed));
struct center_com_sendpro{
    int proid;
    int cacheid;
    size_t filesize;
}__attribute__((packed));

struct center_com_setjmod{
    char jmod_name[NAME_MAX + 1];
    int cacheid;
    int type;  //0:add jmod 1:drop jmod
}__attribute__((packed));
struct center_com_reqjmod{
    char jmod_name[NAME_MAX + 1];
}__attribute__((packed));
struct center_com_sendjmod{
    char jmod_name[NAME_MAX + 1];
    int cacheid;
    size_t filesize;
}__attribute__((packed));

struct center_com_reqcode{
    int subid;
}__attribute__((packed));
struct center_com_sendcode{
    int subid;
    size_t filesize;
}__attribute__((packed));
