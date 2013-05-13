var __extend__ = function(child,parent){
    child.prototype.__super__ = parent;
};

var imc = new function(){
    this.Connection = function(linkid){
        var that = this;
        var link_linkidmap = {};
        var close_callback = [];

        that.send_msg = function(data){};
        that.start_recv = function(recv_callback){};

        that.close = function(){
            var i;

            for(i = 0;i < close_callback.length;i++){
                close_callback[i](that);
            }
        };
    };

    this.Proxy = function(linkid,connect_linkid){
        var MSGTYPE_CALL = 'call';
        var MSGTYPE_RET = 'ret';

        var that = this;
        var conn_linkidmap = {};
        var caller_retidmap = {};
        var call_pathmap = {};

        var route_call = function(caller_retid,timeout,iden,dst,func_name,param){
            var i;
            var part;
            var dst_linkid;
            var dst_path;
            var caller_linkid;
            var func;

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

                if((func = call_pathmap[dst_path + func_name]) != undefined){
                    func(param,_retcall_cb);
                }else{

                }   
            }else{

            }
        };

        var recv_dispatch = function(conn,data){
            msgo = JSON.parse(data);
            if(msgo.type == MSGTYPE_CALL){
                recv_msg_call(conn,msgo);
            }else if(msgo.type == MSGTYPE_RET){

            }
        };

        var send_msg_call = function(conn,msg){

        };
        var recv_msg_call = function(conn,msg){
            route_call(msg.caller_retid,msg.timeout,msg.iden,msg.dst,msg.func_name,msg.param)
        };

        that.add_conn = function(conn){
            conn_linkidmap[conn.linkid] = conn;
            conn.start_recv(recv_dispatch;
        };
        that.link_conn = function(linkid,conn){
            conn.link_linkidmap[linkid] = true;
            conn_linkidmap[linkid] = conn;    
        };
        that.unlink_conn = function(linkid){
            conn = conn_linkidmap[linkid];
            delete conn_linkidmap[linkid];
            delete conn.link_linkidmap[linkid];
        };
        that.del_conn = function(conn){
            delete conn_linkidmap[conn.linkid];
        };
        that.request_conn = function(linkid,callback){
            var _conn_cb = function(conn){
                if(conn != null && conn.linkid != linkid){
                    that.link_conn(linkid,conn);
                }

                callback(conn);
            };

            conn = conn_linkidmap[linkid];
            if(conn != undefined){
                _conn_cb(conn); 
            }else{
                connect_linkid(linkid,_conn_cb);
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

        imc.Proxy.instance = that;
    };

};

function imc_call(iden,dst,func_name,param,callback){
    imc.Proxy.instance.call(iden,dst,func_name,param,callback); 
}
function imc_register_call(path,func_name,func){
    imc.Proxy.instance.register_call(path,func_name,func); 
}
