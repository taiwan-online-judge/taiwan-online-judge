'use strict'

var stat = new function(){
    var that = this;
    var j_index_page;
    var stat_node;

    that.ready = function(){
        j_index_page = $('#index_page');

        stat_node = new vus.node('stat');
        stat_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                index.set_menu('狀態');
                index.clear_tabnav();

                com.loadpage('/toj/html/stat.html').done(function(){
                    var j_log = j_index_page.find('div.backend');

                    imc.Proxy.instance.register_call('core/stat/','print_log',function(callback,data){
                        var i;
                        var j_line;

                        if(data.charCodeAt(0) != 10){
                            j_line = $('<div></div>');
                            j_line.text(data);

                            j_log.prepend(j_line);
                        }
                        callback('Success');
                    });
                });
            }else if(direct == 'out'){
                imc.Proxy.instance.unregister_call('core/stat/','print_log');
            }

            return 'cont';
        };
        com.vus_root.child_set(stat_node);
    };
};
