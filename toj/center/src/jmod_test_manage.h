class manage_result_info{
public:
    int allcount;
    int count;
    int result;
    double totalscore;
    unsigned long totalruntime;
    unsigned long maxmemory;
    json_object *jso_res;
    json_object *jso_resarray;

    manage_result_info(int allcount){
	this->allcount = allcount;
	this->count = 0;
	this->result = JUDGE_AC;
	this->totalscore = 0;
	this->totalruntime = 0;
	this->maxmemory = 0;

	this->jso_res = json_object_new_object();
	this->jso_resarray = json_object_new_array();
	json_object_object_add(this->jso_res,"result",this->jso_resarray);
    }
    ~manage_result_info(){
	json_object_put(jso_res);
    }
};

DLL_PUBLIC int submit(judgm_manage_info *info,FILE *set_file);
DLL_PUBLIC int result(judgm_manage_info *info,line_result_data *res_data);

static void __attribute__ ((constructor)) manage_init();
static int manage_load_setfile(FILE *setfile,int &count);

static judgm_manage_queuesubmit_fn manage_queuesubmit_fn;
