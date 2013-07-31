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
        that.send_file = function(filekey,blob,callback){};
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
        var MSGTYPE_SENDFILE = 'sendfile';
        var MSGTYPE_ABORTFILE = 'abortfile';

        var that = this;
        var caller_retid_count = 0;
        var conn_linkmap = {};
        var conn_retidmap = {};
        var callpath_root = {'child':{},'name':{},'filt':[]};
        var info_filekeymap = {};
        var conn_filekeymap = {};

        function walk_path(path,create){
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
        }

        function route_call(caller_link,caller_retid,idendesc,dst,func_name,timeout,callback,param){
            var i;
            var j;
            var part;
            var dst_link;
            var dst_path;
            var caller_link;
            var cnode;
            var dpart;
            var func;

            function _add_wait_caller(conn_link){
                conn_retidmap[conn_link][caller_retid] = {
                    'timeout':timeout,
                    'callback':callback
                }   
            }

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
                        if(self_link in conn_retidmap && 
                            caller_retid in conn_retidmap[self_link]){

                            delete conn_retidmap[self_link][caller_retid];

                            if(callback != null && callback != undefined){
                                callback({'stat':true,'data':data}); 
                            }
                        }   
                    }].concat(param));
                }else{
                    if(callback != null && callback != undefined){
                        callback({'stat':false,'data':'Enoexist'}); 
                    }
                }   
            }else{
                that.request_conn(dst_link,function(conn){
                    if(caller_link == self_link){
                        _add_wait_caller(conn.link);
                    }

                    send_msg_call(conn,caller_link,caller_retid,idendesc,dst,
                                  func_name,timeout,param);
                });
            }
        }
        function ret_call(conn_link,caller_link,caller_retid,result){
            var wait;
            
            if(conn_link in conn_retidmap &&
               caller_retid in conn_retidmap[conn_link]){

                wait = conn_retidmap[conn_link][caller_retid];
                delete conn_retidmap[conn_link][caller_retid];
            }else{
                return;
            }

            if(caller_link == self_link){
                wait.callback(result);
            }else{
                request_conn(caller_link,function(conn){
                    send_msg_ret(conn,caller_link,caller_retid,result);
                });
            }
        }
        function route_sendfile(out_conn,src_link,filekey,filesize){
            var info;

            function _send_cb(err){
                if(del_wait_filekey(out_conn,filekey)){
                    return;
                }

                if(err != undefined){
                    out_conn.abort_file(filekey,err);
                    send_msg_abortfile(out_conn,filekey,err);
                }

                ret_sendfile(filekey,err);
            }

            if(src_link != self_link){
                //TODO
                return;
            }
            
            if((info = info_filekeymap[filekey]) == undefined){
                return;
            }

            info.callback = _send_cb;
            add_wait_filekey(out_conn.link,filekey,info.blob.size,_send_cb);
            out_conn.send_file(filekey,info.blob,_send_cb);
        }
        function ret_sendfile(filekey,err){
            var info;
            
            if((info = info_filekeymap[filekey]) == undefined){
                return false;
            }

            delete info_filekeymap[filekey];

            if(err == undefined){
                info.result_callback('Success');
            }else{
                info.result_callback(err);
            }

            return true;
        }
        function add_wait_filekey(conn_link,filekey,filesize,callback){
            conn_filekeymap[conn_link][filekey] = {
                'callback':callback
            };
        }
        function del_wait_filekey(conn_link,filekey){
            if(conn_link in conn_filekeymap &&
               filekey in conn_filekeymap[conn_link]){

                delete conn_filekeymap[conn_link][filekey];

                return true;
            }else{
                return false;
            }
        }

        function recv_dispatch(conn,data){
            var msgo = JSON.parse(data);

            if(msgo.type == MSGTYPE_CALL){
                recv_msg_call(conn,msgo);
            }else if(msgo.type == MSGTYPE_RET){
                recv_msg_ret(conn,msgo);
            }else if(msgo.type == MSGTYPE_SENDFILE){
                recv_msg_sendfile(conn,msgo);
            }else if(msgo.type == MSGTYPE_ABORTFILE){
                recv_msg_abortfile(conn,msgo);
            }
        }

        function send_msg_call(conn,caller_link,caller_retid,idendesc,dst,func_name,timeout,param){
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
        }
        function recv_msg_call(conn,msg){
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
        }

        function send_msg_ret(conn,caller_link,caller_retid,result){
            var msg = {
                'type':MSGTYPE_RET,
                'caller_link':caller_link,
                'caller_retid':caller_retid,
                'result':result
            };

            conn.send_msg(JSON.stringify(msg));
        }
        function recv_msg_ret(conn,msg){
            var caller_link = msg['caller_link'];
            var caller_retid = msg['caller_retid'];
            var result = msg['result'];

            ret_call(conn.link,caller_link,caller_retid,result);
        }

        function recv_msg_sendfile(conn,msg){
            route_sendfile(conn,msg.src_link,msg.filekey,msg.filesize);
        }

        function send_msg_abortfile(conn,filekey,err){
            var msg = {
                'type':MSGTYPE_ABORTFILE,
                'filekey':filekey,
                'error':err
            };

            conn.send_msg(JSON.stringify(msg));
        }
        function recv_msg_abortfile(conn,msg){
            var filekey = msg.filekey;    
            var err = msg.error;
            
            if(conn.link in conn_filekeymap &&
               filekey in conn_filekeymap[conn.link]){

                conn_filekeymap[conn.link][filekey].callback(err);
            }
        }

        that.add_conn = function(conn){
            conn_linkmap[conn.link] = conn;
            conn_retidmap[conn.link] = {};
            conn_filekeymap[conn.link] = {};
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
            retids = conn_retidmap[conn.link];
            for(retid in retids){
                ret_call(conn.link,caller_link,caller_retid,result);
            }

            filekeys = conn_filekeymap[conn.link];
            for(filekey in filekeys){
                filekeys[filekey].callback('Eclose');
            }

            delete conn_retidmap[conn.link];
            delete conn_linkmap[conn.link];
            delete conn_filekeymap[conn.link];
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
        that.sendfile = function(dst_link,
                                 blob,
                                 filekey_callback,
                                 result_callback,
                                 prog_callback){

            var filekey = self_link + '_' + Math.random();

            info_filekeymap[filekey] = {
                'blob':blob,
                'result_callback':result_callback,
                'prog_callback':prog_callback,
                'callback':function(err){
                    if(ret_sendfile(filekey,err) && err != undefined){
                        that.call(dst_link + 'imc/','abort_sendfile',65536,null,filekey,err);
                    }
                }
            };

            that.call(dst_link + 'imc/','pend_recvfile',65536,function(result){
                filekey_callback(filekey);
            },self_link,filekey,blob.size);
        };
        that.abortfile = function(filekey){
            if((info = info_filekeymap[filekey]) != undefined){
                info.callback('Eabort');
            }  
        };

        that.register_call = function(path,func_name,func){
            var cnode;

            cnode = walk_path(path,true);
            cnode.name[func_name] = func;
        };
        that.unregister_call = function(path,func_name){
            var cnode;

            cnode = walk_path(path,true);
            delete cnode.name[func_name];
        }
        that.register_filter = function(path,func){
            var cnode;

            cnode = walk_path(path,true);
            cnode.filt.push(func);
        };
        that.unregister_filter = function(path,func){
            var i;
            var cnode;
            var new_filt = new Array();

            cnode = walk_path(path,true);
            for(i = 0;i < cnode.filt.length;i++){
                if(cnode.filt[i] != func){
                    new_filt.push(cnode.filt[i]); 
                }
            }
            cnode.filt.remove(func);
        };

        that.register_call('imc/','abort_sendfile',
                           function(callback,filekey,err){

            callback('Success');
            ret_sendfile(filekey,'Eabort');
        });

        conn_retidmap[self_link] = {};
        conn_filekeymap[self_link] = {};

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
