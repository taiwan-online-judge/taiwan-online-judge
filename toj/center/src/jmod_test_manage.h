class manage_result_info{
public:
    int test_allcount;
    int test_count;
    int test_result;
    double test_totalscore;
    unsigned long test_totalruntime;
    unsigned long test_maxmemory;
    json_object *jso_res;
    json_object *jso_resarray;

    manage_result_info(int allcount){
	this->test_allcount = allcount;
	this->test_count = 0;
	this->test_result = JUDGE_AC;
	this->test_totalscore = 0;
	this->test_totalruntime = 0;
	this->test_maxmemory = 0;

	this->jso_res = json_object_new_object();
	this->jso_resarray = json_object_new_array();
	json_object_object_add(this->jso_res,"result",this->jso_resarray);
    }
    ~manage_result_info(){
	json_object_put(jso_res);
    }
};

DLL_PUBLIC int submit(judgm_manage_submitinfo *info,void **manage_data);
DLL_PUBLIC int result(judgm_manage_resultinfo *info,void *manage_data);

static void __attribute__ ((constructor)) manage_init();
static int manage_load_setfile(FILE *setfile,int &count);

static judgm_manage_queuesubmit_fn manage_queuesubmit_fn;
