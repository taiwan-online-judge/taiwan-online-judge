var user = new function(){
    var that = this;
    var j_index_page;

    that.ready = function(){
        var login_node = new vus.node('login'); 
        var register_node = new vus.node('register'); 

        j_index_page = $('#index_page');

        login_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                com.loadpage('/toj/html/login.html').done(function(){
                    j_index_page.find('button.submit').on('click',function(e){
                        console.log('test');
                    }); 
                });
            }

            return 'cont'
        }
        com.vus_root.child_set(login_node);
        
        register_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                com.loadpage('/toj/html/register.html').done(function(){
                    j_index_page.find('button.submit').on('click',function(e){
                        console.log('test');

                        imc.Proxy.instance.register_filter('test/',function(dpart,func_name){
                            console.log(dpart);
                            console.log(func_name);
                        });
                        imc.Proxy.instance.register_call('test/route/','80s',function(callback,a,b){
                            console.log(b);
                            callback('ret');
                        });
                        imc.Proxy.instance.call(com.backend_link + 'test/','get_client_list',1000,function(result){
                            console.log(result);
                        },1,2);
                    }); 
                });
            }
        }
        com.vus_root.child_set(register_node);
    };
};
