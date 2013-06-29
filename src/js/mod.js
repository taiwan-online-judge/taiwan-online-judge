var mod = new function(){
    var that = this;

    that.curr_sqmod = null;

    that.ready = function(){
        var sq_node = new vus.node('sq');

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

                            curr_sqmod = sqmodname;

                            sqid_node = new vus.node(sqid);
                            eval(sqmodname + '(sqid_node);'); 

                            sq_node.child_set(sqid_node);
                        });
                    }
                },parseInt(sqid));
            }else if(direct == 'out'){
                eval(curr_sqmod + '.unload()'); 
            }

            return 'cont';
        };
        com.vus_root.child_set(sq_node);
    };
}
