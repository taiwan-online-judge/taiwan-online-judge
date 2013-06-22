'use strict'

var __extend__ = function(child,parent){
    child.prototype.__super__ = parent;
};

var imc = new function(){
    var that = this;

    that.Connection = function(link){
        var that = this;

        that.link_linkmap = {};
        that.close_callback = [];
        that.link = link;

        that.send_msg = function(data){};
        that.start_recv = function(recv_callback){};

        that.close = function(){
            var i;

            for(i = 0;i < that.close_callback.length;i++){
                that.close_callback[i](that);
            }
        };
    };

    that.Proxy = function(self_link,auth,conn_link){
        var MSGTYPE_CALL = 'call';
        var MSGTYPE_RET = 'ret';

        var that = this;
        var caller_retid_count = 0;
        var conn_linkmap = {};
        var conn_retidmap = {};
        var callpath_root = {'child':{},'name':{},'filt':[]};

        var walk_path = function(path,create){
            var i;
            var parts;
            var part;
            var cnode;
            var nnode;
            
            parts = path.split('/');
            parts.pop();
            cnode = callpath_root;
            for(i = 0;i < parts.length;i++){
                part = parts[i];
                if(part in cnode.child){
                    cnode = cnode.child[part];
                }else{
                    break;
                }
            }

            if(create == true){
                for(;i < parts.length;i++){
                    part = parts[i];
                    nnode = {'child':{},'name':{},'filt':[]};
                    cnode.child[part] = nnode;
                    cnode = nnode;
                }
            }else if(i < parts.length){
                return undefined;
            }

            return cnode;
        };

        var route_call = function(caller_link,caller_retid,idendesc,dst,func_name,timeout,callback,param){
            var i;
            var j;
            var part;
            var dst_link;
            var dst_path;
            var caller_link;
            var cnode;
            var dpart;
            var func;

            var _add_wait_caller = function(conn_link){
                conn_retidmap[conn_link][caller_retid] = {
                    'timeout':timeout,
                    'callback':callback
                }   
            };

            console.log(func_name);

            part = dst.split('/');
            dst_link = part.slice(0,3).join('/') + '/'
            dst_path = part.slice(3,-1);

            if(dst_link == self_link){
                cnode = callpath_root;
                dpart = dst_path.slice(0);
                for(i = 0;i < cnode.filt.length;i++){
                    cnode.filt[i](dpart,func_name);
                }

                for(i = 0;i < dst_path.length;i++){
                    if((cnode = cnode.child[dst_path[i]]) == undefined){
                        cnode = null;
                        break;
                    }

                    dpart.shift();
                    for(j = 0;j < cnode.filt.length;j++){
                        cnode.filt[j](dpart,func_name);
                    }
                }

                if(cnode != null && (func = cnode.name[func_name]) != undefined){
                    _add_wait_caller(self_link);

                    func.apply(undefined,[function(data){
                        if(self_link in conn_retidmap && caller_retid in conn_retidmap[self_link]){
                            delete conn_retidmap[self_link][caller_retid];
                            callback({'stat':true,'data':data}); 
                        }   
                    }].concat(param));
                }else{
                    callback({'stat':false,'data':'Enoexist'}); 
                }   
            }else{
                that.request_conn(dst_link,function(conn){
                    if(caller_link == self_link){
                        _add_wait_caller(conn.link);
                    }

                    send_msg_call(conn,caller_link,caller_retid,idendesc,dst,func_name,timeout,param);
                });
            }
        };

        var recv_dispatch = function(conn,data){
            var msgo = JSON.parse(data);

            if(msgo.type == MSGTYPE_CALL){
                recv_msg_call(conn,msgo);
            }else if(msgo.type == MSGTYPE_RET){
                recv_msg_ret(conn,msgo);
            }
        };

        var send_msg_call = function(conn,caller_link,caller_retid,idendesc,dst,func_name,timeout,param){
            var msg = {
                'type':MSGTYPE_CALL,
                'caller_link':caller_link,
                'caller_retid':caller_retid,
                'idendesc':idendesc,
                'dst':dst,
                'func_name':func_name,
                'timeout':timeout,
                'param':param
            };

            conn.send_msg(JSON.stringify(msg));
        };
        var recv_msg_call = function(conn,msg){
            var caller_link = msg.caller_link
            var caller_retid = msg.caller_retid;
            var timeout = msg.timeout;
            var idendesc = msg.idendesc;
            var dst = msg.dst;
            var func_name = msg.func_name;
            var param = msg.param;

            route_call(caller_link,caller_retid,idendesc,dst,func_name,timeout,function(result){
                that.request_conn(caller_retid,function(conn){
                    send_msg_ret(conn,caller_link,caller_retid,result);
                });
            },param);
        };

        var send_msg_ret = function(conn,caller_link,caller_retid,result){
            var msg = {
                'type':MSGTYPE_RET,
                'caller_link':caller_link,
                'caller_retid':caller_retid,
                'result':result
            };

            conn.send_msg(JSON.stringify(msg));
        };
        var recv_msg_ret = function(conn,msg){
            var caller_link = msg['caller_link'];
            var caller_retid = msg['caller_retid'];
            var result = msg['result'];
            var wait;

            if(caller_link == self_link){
                if(conn.link in conn_retidmap && caller_retid in conn_retidmap[conn.link]){
                    wait = conn_retidmap[conn.link][caller_retid];
                    delete conn_retidmap[conn.link][caller_retid];

                    wait.callback(result);
                }   
            }else{
                request_conn(caller_link,function(conn){
                    send_msg_ret(conn,caller_link,caller_retid,result);
                });
            }
        };

        that.add_conn = function(conn){
            conn_linkmap[conn.link] = conn;
            conn_retidmap[conn.link] = {};
            conn.start_recv(recv_dispatch);
        };
        that.link_conn = function(link,conn){
            conn.link_linkmap[link] = true;
            conn_linkmap[link] = conn;    
        };
        that.unlink_conn = function(link){
            conn = conn_linkmap[link];
            delete conn_linkmap[link];
            delete conn.link_linkmap[link];
        };
        that.del_conn = function(conn){
            delete conn_linkmap[conn.link];
        };
        that.request_conn = function(link,callback){
            var conn = conn_linkmap[link];
            var _conn_cb = function(conn){
                if(conn != null && conn.link != link){
                    that.link_conn(link,conn);
                }

                callback(conn);
            };

            if(conn != undefined){
                _conn_cb(conn); 
            }else{
                conn_link(link,_conn_cb);
            }
        };

        that.call = function(dst,func_name,timeout,callback){
            var i;
            var params = new Array()
            var caller_retid;

            for(i = 4;i < arguments.length;i++){
                params.push(arguments[i]); 
            }

            caller_retid = self_link + '/' + caller_retid_count;
            caller_retid_count += 1;

            route_call(self_link,caller_retid,imc.Auth.get_current_idendesc(),dst,func_name,timeout,callback,params);
        };

        that.register_call = function(path,func_name,func){
            var cnode;

            cnode = walk_path(path,true);
            cnode.name[func_name] = func;
        };
        that.register_filter = function(path,func){
            var cnode;

            cnode = walk_path(path,true);
            cnode.filt.push(func);
        };

        conn_retidmap[self_link] = {};

        imc.Proxy.instance = that;
    };

    this.Auth = function(){
        var that = this;

        that.get_iden = function(idendesc){
            return JSON.parse(JSON.parse(idendesc)[0]);
        };
        
        imc.Auth.change_current_iden = function(idendesc){
            var iden = imc.Auth.instance.get_iden(idendesc);

            imc.Auth.current_idendata = [iden,idendesc];
        };
        imc.Auth.get_current_iden = function(){
            return imc.Auth.current_idendata[0];
        };
        imc.Auth.get_current_idendesc = function(){
            return imc.Auth.current_idendata[1];
        };

        imc.Auth.current_idendata = null;
        imc.Auth.instance = that;
    };
};
