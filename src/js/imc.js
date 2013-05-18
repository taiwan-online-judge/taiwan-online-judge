var __extend__ = function(child,parent){
    child.prototype.__super__ = parent;
};

var imc = new function(){
    this.Connection = function(linkid){
        var that = this;

        that.link_linkidmap = {};
        that.close_callback = [];
        that.linkid = linkid;

        that.send_msg = function(data){};
        that.start_recv = function(recv_callback){};

        that.close = function(){
            var i;

            for(i = 0;i < that.close_callback.length;i++){
                that.close_callback[i](that);
            }
        };
    };

    this.Proxy = function(linkid,auth,connect_linkid){
        var MSGTYPE_CALL = 'call';
        var MSGTYPE_RET = 'ret';

        var that = this;
        var caller_retid_count = 0;
        var conn_linkidmap = {};
        var conn_retidmap = {};
        var call_pathmap = {};

        var route_call = function(caller_retid,timeout,idendesc,dst,func_name,param,callback){
            var i;
            var part;
            var dst_linkid;
            var dst_path;
            var caller_linkid;
            var func;

            var _add_wait_caller = function(conn_linkid){
                conn_retidmap[conn_linkid][caller_retid] = {
                    'timeout':timeout,
                    'callback':callback
                }   
            };

            part = dst.split('/');
            dst_linkid = part[2];
            dst_path = part.slice(3).join('/');

            iden = auth.get_iden(idendesc);

            caller_linkid = iden.linkid
            if(caller_retid.split('/')[0] != caller_linkid){
                return false;
            }

            if(dst_linkid == linkid){
                if((func = call_pathmap[dst_path + func_name]) != undefined){
                    _add_wait_caller(linkid);

                    func(iden,param,function(data){
                        if(linkid in conn_retidmap && caller_retid in conn_retidmap[linkid]){
                            delete conn_retidmap[linkid][caller_retid];
                            callback({'stat':true,'data':data}); 
                        }   
                    });
                }else{
                    callback({'stat':false,'data':'Enoexist'}); 
                }   
            }else{
                that.request_conn(dst_linkid,function(conn){
                    if(caller_linkid == linkid){
                        _add_wait_caller(conn.linkid);
                    }

                    send_msg_call(conn,caller_retid,timeout,idendesc,dst,func_name,param);
                });
            }
        };

        var recv_dispatch = function(conn,data){
            msgo = JSON.parse(data);
            if(msgo.type == MSGTYPE_CALL){
                recv_msg_call(conn,msgo);
            }else if(msgo.type == MSGTYPE_RET){
                recv_msg_ret(conn,msgo);
            }
        };

        var send_msg_call = function(conn,caller_retid,timeout,idendesc,dst,func_name,param){
            msg = {
                'type':MSGTYPE_CALL,
                'caller_retid':caller_retid,
                'timeout':timeout,
                'idendesc':idendesc,
                'dst':dst,
                'func_name':func_name,
                'param':param
            };

            conn.send_msg(JSON.stringify(msg));
        };
        var recv_msg_call = function(conn,msg){
            var caller_retid = msg.caller_retid;
            var timeout = msg.timeout;
            var idendesc = msg.idendesc;
            var dst = msg.dst;
            var func_name = msg.func_name;
            var param = msg.param;

            route_call(caller_retid,timeout,idendesc,dst,func_name,param,function(result){
                that.request_conn(caller_retid,function(conn){
                    var iden;

                    iden = auth.get_iden(idendesc);
                    send_msg_ret(conn,iden.linkid,caller_retid,result);
                });
            });
        };

        var send_msg_ret = function(conn,caller_linkid,caller_retid,result){
            msg = {
                'type':MSGTYPE_RET,
                'caller_linkid':caller_linkid,
                'caller_retid':caller_retid,
                'result':result
            };

            conn.send_msg(JSON.stringify(msg));
        };
        var recv_msg_ret = function(conn,msg){
            var caller_linkid = msg['caller_linkid'];
            var caller_retid = msg['caller_retid'];
            var result = msg['result'];

            if(caller_linkid == linkid){
                if(conn.linkid in conn_retidmap && caller_retid in conn_retidmap[conn.linkid]){
                    wait = conn_retidmap[conn.linkid][caller_retid];
                    delete conn_retidmap[conn.linkid][caller_retid];

                    wait.callback(result);
                }   
            }else{
                request_conn(caller_linkid,function(conn){
                    send_msg_ret(conn,caller_linkid,caller_retid,result);
                });
            }
        };

        that.add_conn = function(conn){
            conn_linkidmap[conn.linkid] = conn;
            conn_retidmap[conn.linkid] = {};
            conn.start_recv(recv_dispatch);
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

        that.call = function(idendesc,timeout,dst,func_name,param,callback){
            caller_retid = linkid + '/' + caller_retid_count;
            caller_retid_count += 1;

            route_call(caller_retid,timeout,idendesc,dst,func_name,param,callback);
        };

        that.register_call = function(path,func_name,func){
            call_pathmap[path + func_name] = func;
        };

        conn_retidmap[linkid] = {};

        imc.Proxy.instance = that;
    };

    this.Auth = function(){
        var that = this;

        that.get_iden = function(idendesc){
            return JSON.parse(JSON.parse(idendesc)[0]);
        };

        imc.Auth.instance = that;
    };
};

function imc_call(idendesc,dst,func_name,param,callback){
    imc.Proxy.instance.call(idendesc,10000,dst,func_name,param,callback); 
}
function imc_register_call(path,func_name,func){
    imc.Proxy.instance.register_call(path,func_name,func); 
}
