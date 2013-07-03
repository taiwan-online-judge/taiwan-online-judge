'use strict'

var mod = new function(){
    var that = this;
    var sq_node = new vus.node('sq');
    var pro_node = new vus.node('pro');
    var curr_sqmod = null;
    var curr_pmod = null;

    that.ready = function(){
        sq_node.url_chg = function(direct,url_upart,url_dpart,param){
            var sqid;

            if(direct == 'in'){
                index.set_menu('方塊');
                index.clear_tabnav();
                
                sqid = url_dpart[0];
                sq_node.child_delayset(sqid);
                    
                com.call_backend('core/square/','get_square_info',function(result){
                    var data = result.data;
                    var sqmodname;

                    if(com.is_callerr(result)){
                        index.add_alert('','警告','開啓方塊發生錯誤');    
                    }else{
                        index.set_title(data.title);

                        sqmodname = escape(data.sqmodname);
                        $.getScript('/toj/sqmod/' + sqmodname + '/js/' + sqmodname + '.js',function(script,status,xhr){
                            var sqid_node;

                            sqid_node = new vus.node(sqid);
                            eval('curr_sqmod = new ' + sqmodname + '(sqid_node);'); 

                            sq_node.child_set(sqid_node);
                        });
                    }
                },parseInt(sqid));
            }else if(direct == 'out'){
                curr_sqmod.unload();
                curr_sqmod = null;
            }

            return 'cont';
        };
        com.vus_root.child_set(sq_node);

        pro_node.url_chg = function(direct,url_upart,url_dpart,param){
            var proid;

            if(direct == 'in'){
                index.set_menu('題目');
                index.clear_tabnav();
                
                proid = url_dpart[0];
                pro_node.child_delayset(proid);
                    
                com.call_backend('core/problem/','get_problem_info',function(result){
                    var data = result.data;
                    var pmodname;

                    if(com.is_callerr(result)){
                        index.add_alert('','警告','開啓題目發生錯誤');    
                    }else{
                        index.set_title(data.title);

                        pmodname = escape(data.pmodname);
                        $.getScript('/toj/pmod/' + pmodname + '/js/' + pmodname + '.js',function(script,status,xhr){
                            var proid_node;

                            proid_node = new vus.node(proid);
                            eval('curr_pmod = new ' + pmodname + '(parseInt(proid),proid_node);'); 

                            pro_node.child_set(proid_node);
                        });
                    }
                },parseInt(proid));

            }else if(direct == 'out'){
                curr_pmod.unload();
                curr_pmod = null;
            }

            return 'cont';
        };
        com.vus_root.child_set(pro_node);
    };
}
