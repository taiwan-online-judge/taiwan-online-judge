var user = new function(){
    var that = this;
    var j_index_page;

    that.uid = null;
    that.username = null;
    that.nickname = null;
    that.email = null;
    that.avatar = null;

    that.login_callback = $.Callbacks();

    that.ready = function(){
        var uid;
        var user_node_uid = null;

        var user_node = new vus.node('user');
        var main_node = new vus.node('main');
        var login_node = new vus.node('login'); 
        var register_node = new vus.node('register'); 
        var logout_node = new vus.node('logout'); 

        function _login(uid,hash,idendesc){
            var expire;
            
            expire = new Date();
            expire.setDate(expire.getDate() + 30);
            document.cookie = 'uid=' + uid + ';path=/;expires=' + expire.toUTCString();
            document.cookie = 'hash=' + hash + ';path=/;expires=' + expire.toUTCString();

            imc.Auth.change_current_iden(idendesc);
            _set_user_data(uid);
        };
        function _logout(){
            document.cookie = 'uid=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'hash=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.location.href = '/toj/home/';
        };
        function _get_user_info(uid){
            var defer = $.Deferred();

            com.call_backend('core/user/','get_user_info',function(result){
                if(com.is_callerr(result)){
                    defer.reject(result.data);
                }
                defer.resolve(result.data);
            },uid);

            return defer.promise();
        };
        function _set_user_data(uid){
            _get_user_info(uid).done(function(data){
                that.uid = data.uid;
                that.username = data.username;
                that.nickname = data.nickname;
                that.email = data.email;
                that.avatar = data.avatar;

                that.login_callback.fire();

            }).fail(function(data){
                //TODO GE
            });
        }

        j_index_page = $('#index_page');

        if((uid = imc.Auth.get_current_iden().uid) != undefined){
            _set_user_data(uid);
        }

        user_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                user_node_uid = parseInt(param[0]);
            }
        };
        com.vus_root.child_set(user_node);

        main_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                $.when(
                    _get_user_info(user_node_uid),
                    com.loadpage('使用者','/toj/html/user_main.html')
                ).done(function(data){
                    j_index_page.find('h3.name').text(data.nickname + '(' + data.username + ')');
                    j_index_page.find('p.aboutme').text(data.aboutme);
                });
            }
        };
        user_node.child_set(main_node);

        login_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                com.loadpage('登入','/toj/html/login.html').done(function(){
                    var j_alert = j_index_page.find('div.alert');
                    var j_submit = j_index_page.find('button.submit');

                    j_index_page.find('[name="username"]').focus();

                    j_index_page.find('input').on('keypress',function(e){
                        if(e.keyCode == 13){
                            j_submit.click();
                        }
                    });

                    j_submit.on('click',function(e){
                        var username = j_index_page.find('[name="username"]').val();
                        var password = j_index_page.find('[name="password"]').val();

                        com.call_backend('core/user/','login',function(result){
                            data = result.data;

                            if(result.stat == true && typeof(data) != 'string'){
                                _login(data.uid,data.hash,data.idendesc);
                                com.url_push('/toj/home/');
                            }else{
                                j_alert.text('登入失敗');
                                j_alert.show();
                            } 
                        },username,password);
                    }); 
                });
            }

            return 'cont'
        };
        com.vus_root.child_set(login_node);
        
        register_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                com.loadpage('註冊','/toj/html/register.html').done(function(){
                    var j_alert = j_index_page.find('div.alert');

                    j_index_page.find('[name="username"]').focus();

                    j_index_page.find('button.submit').on('click',function(e){
                        var username = j_index_page.find('[name="username"]').val();
                        var password = j_index_page.find('[name="password"]').val();
                        var repeat = j_index_page.find('[name="repeat"]').val();
                        var nickname = j_index_page.find('[name="nickname"]').val();
                        var email = j_index_page.find('[name="email"]').val();

                        if(password != repeat){
                            j_alert.text('重復密碼不同');
                            j_alert.show();
                            return;   
                        }

                        com.call_backend('core/user/','register',function(result){
                            data = result.data;

                            if(result.stat == true && typeof(data) != 'string'){
                                com.call_backend('core/user/','login',function(result){
                                    data = result.data; 
                                    _login(data.uid,data.hash,data.idendesc);
                                },username,password);
                            }else{
                                if(data == 'Eusername_too_short'){
                                    j_alert.text('使用者名稱過短');
                                }else if(data == 'Eusername_too_long'){
                                    j_alert.text('使用者名稱過長');
                                }else if(data == 'Epassword_too_short'){
                                    j_alert.text('密碼過短');
                                }else if(data == 'Epassword_too_long'){
                                    j_alert.text('密碼過長');
                                }else if(data == 'Enickname_too_short'){
                                    j_alert.text('暱稱過短');
                                }else if(data == 'Enickname_too_long'){
                                    j_alert.text('暱稱過長');
                                }else if(data == 'Eemail_too_short'){
                                    j_alert.text('信箱過短');
                                }else if(data == 'Eemail_too_long'){
                                    j_alert.text('信箱過長');
                                }else if(data == 'Eusername_exists'){
                                    j_alert.text('使用者名稱已存在');
                                }
                                
                                j_alert.show();
                            } 
                        },username,password,nickname,email,'','');
                    }); 
                });
            }
        };
        com.vus_root.child_set(register_node);

        logout_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                _logout();
            }
        };
        com.vus_root.child_set(logout_node);
    };

    that.login_callback.add(function(){
        var j_index_header = $('#index_header');
        var j_a;

        j_a = j_index_header.find('li.nickname > a');
        j_a.text(that.nickname);
        j_a.attr('href','/toj/user:' + that.uid + '/main/');

        j_index_header.find('li.login').hide();
        j_index_header.find('li.register').hide();
        j_index_header.find('li.nickname').show();
        j_index_header.find('li.logout').show();
    });
};
