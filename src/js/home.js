var home = new function(){
    var that = this;

    that.ready = function(){
        var home_node = new vus.node('home');

        home_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                com.loadpage('首頁','/toj/html/home.html').done(function(){
                    index.set_title('Taiwan Online Judge');
                });
            }
        };
        com.vus_root.child_set(home_node);
    };
}
