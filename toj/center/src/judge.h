#ifndef JUDGE_H
#define JUDGE_H

#define JUDGE_THREAD_MAX 16
#define JUDGE_THREAD_JUDGEMAX 2

#define JUDGE_CACHESTATE_READY 0
#define JUDGE_CACHESTATE_UPDATE 1

class judge_pro_info{
public:
    int proid;
    int cacheid;
    int ref_count;

    int state;
    int update_cacheid;

    judge_pro_info(int proid,int cacheid){
	this->proid = proid;
	this->cacheid = cacheid;
	this->ref_count = 0;

	this->state = JUDGE_CACHESTATE_READY;
	this->update_cacheid = 0;
    }
};

class judge_submit_info{
public:
    int subid;
    judge_pro_info *pro_info;
    int lang;
    char *set_data;
    int set_len;

    judge_submit_info(int subid,judge_pro_info *pro_info,int lang,char *set_data,int set_len){
	this->subid = subid;
	this->pro_info = pro_info;
	this->lang = lang;
	this->set_data = new char[set_len];
	memcpy(this->set_data,set_data,set_len);
	this->set_len = set_len;
    }
    ~judge_submit_info(){
	delete this->set_data;
    }
};

#endif
