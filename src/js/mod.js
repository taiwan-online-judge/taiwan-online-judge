var mod = new function(){
    var that = this;

    that.ready = function(){
        var sq_node = new vus.node('sq');

        sq_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){

            }else if(direct == 'out'){
            
            }

            return 'stop';
        };
        com.vus_root.child_set(sq_node);
    };
}
