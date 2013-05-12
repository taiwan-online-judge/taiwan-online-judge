var imc = new function(){
    this.proxy = function(linkid){
        var that = this;
        var conn_linkidmap = {};
        var caller_retidmap = {};
        var call_pathmap = {};

        var route_call = function(caller_retid,iden,dst,func_name,param){
            var i;
            var part;
            var dst_linkid;
            var dst_path;
            var caller_linkid;

            var _retcall_cb = function(data){
                func = caller_retidmap[caller_retid];
                if(func == undefined){

                }else{
                    delete caller_retidmap[caller_retid]
                    func({'stat':true,'data':data});
                }
            };

            part = dst.split('/');
            dst_linkid = part[2];
            dst_path = part.slice(3).join('/');

            caller_linkid = iden.linkid
            if(caller_retid.split('/')[0] != caller_linkid){
                return false;
            }

            if(dst_linkid == linkid){
                if(caller_linkid == linkid){
                }else{

                }

                if((func = call_pathmap[dst_path + func_name]) == undefined){

                }
                func(param,_retcall_cb);
            }else{

            }
        };

        that.call = function(iden,dst,func_name,param,callback){
            caller_retid = linkid + '/' + caller_retidmap.length;
            caller_retidmap[caller_retid] = callback;
            route_call(caller_retid,iden,dst,func_name,param);
        };

        that.register_call = function(path,func_name,func){
            call_pathmap[path + func_name] = func;
        };

        imc.proxy.instance = that;
    };

};

function imc_call(iden,dst,func_name,param,callback){
    imc.proxy.instance.call(iden,dst,func_name,param,callback); 
};
function imc_register_call(path,func_name,func){
    imc.proxy.instance.register_call(path,func_name,func); 
};
