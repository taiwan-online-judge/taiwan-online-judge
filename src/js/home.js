var home = new function(){
    var that = this;

    that.ready = function(){
        var home_node = new vus.node('home');

        home_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                index.set_menu('首頁');
                index.set_title('Taiwan Online Judge');
                index.clear_tabnav();
                com.loadpage('/toj/html/home.html');
            }
        };
        com.vus_root.child_set(home_node);
    };
}
