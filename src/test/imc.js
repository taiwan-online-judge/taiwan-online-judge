var imc = new function(){
    this.proxy = function(linkid){
        var that = this;
        var conn_linkidmap = {};
        var caller_retidmap = {};
        var call_pathmap = {};

        var route_call = function(caller_retid,iden,dst,func_name,param){
            var i;

            part = dst.split('/');
            dst_linkid = part[1];
            dst_path = part.slice(2).join('/');

            caller_linkid = iden.linkid
            if(caller_retid.split('/')[0] != caller_linkid){
                return false;
            }

            if(caller_linkid == linkid){

            }else{

            }
        };

        that.call = function(iden,dst,func_name,param,callback){
            route_call(1234,iden,dst,func_name,param);
        };

        imc.proxy.instance = that;
    };

};

var imc_call = function(iden,dst,func_name,param,callback){
    imc.proxy.instance.call(iden,dst,func_name,param,callback) 
};
