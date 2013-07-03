var user = new function(){
    var that = this;
    var j_index_page;

    that.uid = null;
    that.authmap = null;
    that.username = null;
    that.nickname = null;
    that.email = null;
    that.avatar = null;
    that.cover = null;

    that.datachg_callback = $.Callbacks();
    that.authchg_callback = $.Callbacks();

    that.ready = function(){
        var defer = $.Deferred();

        var uid;
        var user_node_uid = null;
        var j_tabnav_main; 
        var j_tabnav_edit; 

        var user_node = new vus.node('user');
        var main_node = new vus.node('main');
        var edit_node = new vus.node('edit');
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
            _set_user(uid);
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
        function _get_user_authlist(uid){
            var defer = $.Deferred();

            com.call_backend('core/user/','list_auth',function(result){
                if(com.is_callerr(result)){
                    defer.reject(result.data);
                }
                defer.resolve(result.data);
            });

            return defer.promise();
        }
        function _set_user(uid){
            var defer = $.Deferred();

            $.when(_get_user_info(uid),_get_user_authlist(uid)).done(function(data,authlist){
                var i;
                var type;

                if(that.username == null){
                    type = 'login';
                }else{
                    type = 'set';
                }

                that.uid = data.uid;
                that.username = data.username;
                that.nickname = data.nickname;
                that.email = data.email;
                that.avatar = data.avatar;
                that.cover = data.cover;

                user.authmap = new Object();
                for(i = 0;i < authlist.length;i++){
                    user.authmap[authlist[i].accessid] = authlist[i];
                }

                that.datachg_callback.fire(type);
                that.authchg_callback.fire();

                defer.resolve();
            }).fail(function(){
                defer.reject();
            });

            return defer.promise();
        }

        j_index_page = $('#index_page');

        if((uid = imc.Auth.get_current_iden().uid) == undefined){
            defer.resolve();
        }else{
            _set_user(uid).done(function(){
                defer.resolve();
            });
        }

        user_node.url_chg = function(direct,url_upart,url_dpart,param){
            var param_uid;

            if(direct == 'in' || direct == 'same'){
                if((param_uid = parseInt(param[0])) == user_node_uid){
                    return 'cont'; 
                }
                user_node_uid = param_uid;

                index.set_menu('使用者');
                index.set_title('');
                index.clear_tabnav();
                
                j_tabnav_main = index.add_tabnav('個人','/toj/user:' + user_node_uid + '/main/');

                if(user_node_uid == that.uid){
                    j_tabnav_edit = index.add_tabnav('編輯資料','/toj/user:' + user_node_uid + '/edit/');
                    user_node.child_set(edit_node);
                }
            }else if(direct == 'out'){
                user_node_uid = null;
                user_node.child_del(edit_node);
            }
        };
        com.vus_root.child_set(user_node);

        main_node.url_chg = function(direct,url_upart,url_dpart,param){
            var j_win = $(window);
            var j_header = $('#index_header');
            var j_menutag = $('#index_menutag');
            var j_paneltag = $('#index_paneltag');
            
            function _active(){
                j_header.addClass('force');
                j_header.addClass('active');
                j_menutag.addClass('force');
                j_menutag.addClass('active');
                j_paneltag.addClass('force');
                j_paneltag.addClass('active');
            }
            function _inactive(){
                j_header.removeClass('force');
                j_menutag.removeClass('force');
                j_paneltag.removeClass('force');
            }

            if(direct == 'in' || direct == 'same'){
                j_tabnav_main.active();

                j_index_page.css('visibility','hidden');

                $.when(
                    _get_user_info(user_node_uid),
                    com.loadpage('/toj/html/user_main.html')
                ).done(function(data){
                    var reen = false;
                    var url;

                    if((url = data.avatar) == ''){
                        url = com.get_defaultimg(user_node_uid);
                    }
                    j_index_page.find('img.avatar').attr('src',url);
                    if((url = data.cover) == ''){
                        url = 'http://i.imgur.com/7COsFS4.jpg';
                    }
                    j_index_page.find('div.cover').css('background-image','url(\'' + url + '\')');
                    j_index_page.find('h3.name').text(data.nickname + '(' + data.username + ')');
                    j_index_page.find('p.aboutme').text(data.aboutme);

                    j_win.on('scroll.user_main',function(e){
                        if(reen == true){
                            return;
                        }
                        reen = true;

                        if(j_win.scrollTop() > 500){
                            _inactive();
                            j_win.scroll();
                        }else{
                            _active();
                        }

                        reen = false;
                    });

                    _active();
                    j_win.scrollTop(500);
                    j_index_page.show();
                    j_index_page.css('visibility','visible');
                });
            }else if(direct == 'out'){
                console.log(direct);
                j_win.off('scroll.user_main');
                _inactive();
            }

            return 'cont';
        };
        user_node.child_set(main_node);

        edit_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in' || direct == 'same'){
                j_tabnav_edit.active();

                $.when(
                    _get_user_info(user_node_uid),
                    com.loadpage('/toj/html/user_edit.html')
                ).done(function(data){
                    var j_nickname = j_index_page.find('[name="nickname"]');
                    var j_email = j_index_page.find('[name="email"]');
                    var j_avatar = j_index_page.find('[name="avatar"]');
                    var j_cover = j_index_page.find('[name="cover"]');
                    var j_aboutme = j_index_page.find('[name="aboutme"]');
                    var j_oldpassword = j_index_page.find('[name="oldpassword"]');
                    var j_password = j_index_page.find('[name="password"]');
                    var j_repeat = j_index_page.find('[name="repeat"]');
                    var j_img_avatar = j_index_page.find('img.avatar');
                    var j_img_cover = j_index_page.find('img.cover');

                    j_avatar.on('change',function(e){
                        var url = $(this).val();

                        if(url == ''){
                            url = com.get_defaultimg(that.uid);
                        }
                        j_img_avatar.attr('src',url);
                    });
                    j_cover.on('change',function(e){
                        var url = $(this).val();

                        if(url == ''){
                            url = 'http://i.imgur.com/7COsFS4.jpg';
                        }
                        j_img_cover.attr('src',url);
                    });

                    j_nickname.val(data.nickname);
                    j_email.val(data.email);
                    j_avatar.val(data.avatar);
                    j_avatar.change();
                    j_cover.val(data.cover);
                    j_cover.change();
                    j_aboutme.val(data.aboutme);
                    
                    j_index_page.find('button.submit').on('click',function(e){
                        var oldpassword;
                        var password;
                        var repeat;
                        var set_defer = $.Deferred();
                        var change_defer = $.Deferred();

                        oldpassword = j_oldpassword.val();
                        password = j_password.val();
                        repeat = j_repeat.val();

                        if(password != repeat){
                            index.add_alert('alert-error','失敗','重複密碼不同',true);
                            return;
                        }

                        com.call_backend('core/user/','set_user_info',function(result){
                            var errmsg;

                            if(com.is_callerr(result)){
                                if(result.data == 'Eusername_too_short'){
                                    errmsg = '使用者名稱過短';
                                }else if(data == 'Eusername_too_long'){
                                    errmsg = '使用者名稱過長';
                                }else if(data == 'Eavatar_too_short'){
                                    errmsg = '個人頭像網址過短';
                                }else if(data == 'Eavatar_too_long'){
                                    errmsg = '個人頭像網址過長';
                                }else if(data == 'Enickname_too_short'){
                                    errmsg = '暱稱過短';
                                }else if(data == 'Enickname_too_long'){
                                    errmsg = '暱稱過長';
                                }else if(data == 'Eemail_too_short'){
                                    errmsg = '信箱過短';
                                }else if(data == 'Eemail_too_long'){
                                    errmsg = '信箱過長';
                                }else{
                                    errmsg = '資料更新時發生錯誤';
                                }
                                
                                index.add_alert('alert-error','失敗',errmsg,true);
                                set_defer.reject();
                            }else{
                                _set_user(that.uid);
                                set_defer.resolve();
                            }
                        },that.uid,j_nickname.val(),j_email.val(),j_avatar.val(),j_aboutme.val(),j_cover.val());

                        if(oldpassword == ''){
                            change_defer.resolve();
                        }else{
                            com.call_backend('core/user/','change_user_password',function(result){
                                var errmsg;
                                
                                console.log(result);
                                if(com.is_callerr(result)){
                                    if(result.data == 'Epassword_too_short'){
                                        errmsg = '密碼過短';
                                    }else if(data == 'Epsaaword_too_long'){
                                        errmsg = '密碼過長';
                                    }else if(data == 'Ewrong_old_password'){
                                        errmsg = '舊密碼錯誤';
                                    }else{
                                        errmsg = '密碼更改時發生錯誤';
                                    }

                                    index.add_alert('alert-error','失敗',errmsg,true);
                                    change_defer.reject();
                                }else{
                                    change_defer.resolve();
                                }                             
                            },that.uid,oldpassword,password);
                        }
                        
                        $.when(set_defer,change_defer).done(function(){
                            index.add_alert('alert-success','成功','資料已更新',true);
                            com.url_push('/toj/user:' + that.uid + '/main/');
                        });
                    });
                    j_index_page.find('button.cancel').on('click',function(e){
                        com.url_push_back('/toj/user.*/edit/');
                    });
                });
            }else if(direct == 'out'){

            }
            
            return 'cont';
        };

        login_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                index.set_menu('登入');
                index.set_title('');
                index.clear_tabnav();

                com.loadpage('/toj/html/login.html').done(function(){
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

                            if(com.is_callerr(result)){
                                j_alert.text('登入失敗');
                                j_alert.show();
                            }else{
                                _login(data.uid,data.hash,data.idendesc);
                                com.url_push_back('/toj/(login/|register)/');
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
                index.set_menu('註冊');
                index.set_title('');
                index.clear_tabnav();

                com.loadpage('/toj/html/register.html').done(function(){
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
                                    com.url_push_back('/toj/(login/|register)/');
                                },username,password);
                            }else{
                                console.log(data);
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
                                }else{
                                    j_alert.text('註冊時發生錯誤');
                                }
                                
                                j_alert.show();
                            } 
                        },username,password,nickname,email,'','','');
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

        return defer.promise();
    };
};
