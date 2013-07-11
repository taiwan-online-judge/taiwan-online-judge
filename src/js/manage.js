'use strict'

var manage = new function(){
    var that = this;
    var j_index_page;
    
    var manage_node = new vus.node('manage');
    var dash_node = new vus.node('dash'); 
    var square_node = new vus.node('square'); 
    var problem_node = new vus.node('problem'); 

    var j_tabnav_dash;
    var j_tabnav_square;
    var j_tabnav_problem;

    that.ready = function(){
        j_index_page = $('#index_page');

        manage_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                index.set_menu('管理');
                index.clear_tabnav();

                j_tabnav_dash = index.add_tabnav('儀表板','/toj/manage/dash/');
                j_tabnav_square = index.add_tabnav('方塊','/toj/manage/square/');
                j_tabnav_problem = index.add_tabnav('題目','/toj/manage/problem/');
            }

            return 'cont';
        };
        com.vus_root.child_set(manage_node);
        
        dash_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                j_tabnav_dash.active();

                com.loadpage('/toj/html/manage_dash.html','/toj/css/manage_dash.css').done(function(){
                    var i;
                    var j_accesslist = j_index_page.find('table.accesslist');
                    var j_item;
                    var j_permission;
                    var accessid;
                    var authlist;
                    var autho;

                    authlist = new Array();
                    for(accessid in user.authmap){
                        authlist.push(user.authmap[accessid]);
                    }
                    authlist.sort(function(a,b){
                        return a.accessid - b.accessid;
                    });

                    for(i = 0;i < authlist.length;i++){
                        autho = authlist[i];

                        j_item = $('<tr class="item"><td class="accessid"></td><td class="permission"></td></tr>'); 
                        j_item.find('td.accessid').text(autho.accessid);
                        j_permission = j_item.find('td.permission');

                        if(com.check_access(autho.accessid,ACCESS_READ)){
                            j_permission.append($('<span class="label label-success">READ</span>'));
                        }
                        if(com.check_access(autho.accessid,ACCESS_WRITE)){
                            j_permission.append($('<span class="label label-warning">WRITE</span>'));
                        }
                        if(com.check_access(autho.accessid,ACCESS_CREATE)){
                            j_permission.append($('<span class="label label-info">CREATE</span>'));
                        }
                        if(com.check_access(autho.accessid,ACCESS_DELETE)){
                            j_permission.append($('<span class="label label-important">DELETE</span>'));
                        }
                        if(com.check_access(autho.accessid,ACCESS_SETPER)){
                            j_permission.append($('<span class="label label-inverse">SETPER</span>'));
                        }
                        if(com.check_access(autho.accessid,ACCESS_EXECUTE)){
                            j_permission.append($('<span class="label">EXECUTE</span>'));
                        }

                        j_accesslist.append(j_item);
                    } 
                }); 
            }else if(direct == 'out'){

            }

            return 'cont';
        };
        manage_node.child_set(dash_node);

        square_node.url_chg = function(direct,url_upart,url_dpart,param){
            var j_create;
            var j_set;
            var j_list;
            var cate_idmap;
            var id_catemap;
            var create_tagbox_cate;
            var set_tagbox_cate;
            var set_data;

            function _item_set(j_item,id,title,hidden,start_time,end_time,cateid,intro,logo){
                var i;
                var j_hidden;
                var j_cate;
                var j_label;

                j_item.find('td.id').text(id);
                j_item.find('td.title').text(title);

                if(start_time != null){
                    j_item.find('td.time div.start').text('┌─' + com.get_timestring(start_time));
                }
                if(end_time != null){
                    j_item.find('td.time div.end').text('└→' + com.get_timestring(end_time));
                }
                
                j_hidden = j_item.find('td.hid');
                if(hidden == false){
                    j_hidden.text('公開');
                    j_hidden.removeClass('text-warning');
                }else{
                    j_hidden.text('隱藏');
                    j_hidden.addClass('text-warning');
                }

                j_cate = j_item.find('td.cate');
                j_cate.empty();
                for(i = 0;i < cateid.length;i++){
                    j_label = $('<span class="label"></span>');
                    j_label.text(cate_idmap[cateid[i]]);
                    j_cate.append(j_label); 
                }

                j_item.find('button.set').off('click').on('click',function(e){
                    set_data = {
                        'id':id,
                        'title':title,
                        'hidden':hidden,
                        'start_time':start_time,
                        'end_time':end_time,
                        'cateid':cateid,
                        'intro':intro,
                        'logo':logo,
                    };

                    j_set.modal('show');
                });
                j_item.find('button.del').off('click').on('click',function(e){
                    com.call_backend('core/square/','delete_square',function(result){
                        if(com.is_callerr(result)){
                            index.add_alert('alert-error','失敗','刪除方塊發生錯誤');
                        }else{
                            _update_list(); 
                        }
                    },id);
                });
            }
            function _item_create(id,title,hidden,start_time,end_time,cateid,intro,logo){
                var j_item = $('<tr class="item"><td class="id"></td><td class="title"><td class="time"><div class="time start"></div><div class="time end"></div></td><td class="hid"></td></td><td class="cate"></td><td class="oper"><div class="btn-group"><button class="btn btn-small set"><i class="icon-cog"></i></button><button class="btn btn-small del"><i class="icon-trash"></i></button></div></td></tr>');
                
                _item_set(j_item,id,title,hidden,start_time,end_time,cateid,intro,logo);

                return j_item;
            }
            function _update_sqmod(){
                var defer = $.Deferred();

                com.call_backend('core/square/','list_sqmod',function(result){
                    var data = result.data;

                    if(com.is_callerr(result)){
                        index.add_alert('','警告','管理發生錯誤');
                        defer.reject(data);
                    }else{
                        defer.resolve(data);
                    }
                });

                return defer.promise();
            }
            function _update_list(){
                com.call_backend('core/square/','list_category',function(result){
                    var i;
                    var data = result.data;
                    var catelist;
                    var cateo;

                    if(com.is_callerr(result)){
                        index.add_alert('','警告','管理發生錯誤');
                    }else{
                        cate_idmap = new Object();
                        id_catemap = new Object();
                        catelist = new Array();
                        for(i = data.length - 2;i >= 0;i--){
                            cateo = data[i];
                            cate_idmap[cateo.cateid] = cateo.catename;
                            id_catemap[cateo.catename] = cateo.cateid;
                            catelist.push(cateo.catename);
                        }

                        create_tagbox_cate.set_words(catelist);
                        set_tagbox_cate.set_words(catelist);

                        com.call_backend('core/square/','list_square',function(result){
                            var i;
                            var data = result.data;
                            var items;
                            var j_item;
                            var sqo;

                            if(com.is_callerr(result)){
                                index.add_alert('','警告','管理發生錯誤');
                            }else{
                                items = j_list.find('tr.item');

                                for(i = 0;i < Math.min(items.length,data.length);i++){
                                    sqo = data[i];

                                    if(sqo.start_time != null){
                                        sqo.start_time = new Date(sqo.start_time);
                                    }
                                    if(sqo.end_time != null){
                                        sqo.end_time = new Date(sqo.end_time);
                                    }
                                    
                                    _item_set($(items[i]),sqo.sqid,
                                              sqo.title,
                                              sqo.hidden,
                                              sqo.start_time,
                                              sqo.end_time,
                                              sqo.cateid,
                                              sqo.intro,
                                              sqo.logo); 
                                }
                                for(;i < data.length;i++){
                                    sqo = data[i];
                                    
                                    j_item = _item_create(sqo.sqid,
                                                          sqo.title,
                                                          sqo.hidden,
                                                          sqo.start_time,
                                                          sqo.end_time,
                                                          sqo.cateid,
                                                          sqo.intro,
                                                          sqo.logo);
                                    j_list.append(j_item);
                                }
                                for(;i < items.length;i++){
                                    $(items[i]).remove();
                                }
                            }
                        });
                    }
                }); 
            }

            if(direct == 'in'){
                com.loadpage('/toj/html/manage_square.html','/toj/css/manage_square.css').done(function(){
                    var j_catebox;
                    var j_button;

                    j_tabnav_square.active();

                    j_create = j_index_page.find('div.create');
                    j_set = j_index_page.find('div.set');
                    j_list = j_index_page.find('table.list > tbody');

                    j_catebox = j_create.find('div.catebox');
                    create_tagbox_cate = j_catebox.tagbox({'words':[],'restrict':true,'duplicate':false});
                    j_catebox.find('input').attr('placeholder','+加入分類');

                    j_button = j_index_page.find('div.oper > button.create');
                    if(com.check_access(ACCESSID_SQUAREMG,ACCESS_CREATE)){
                        j_button.show();
                    }
                    j_index_page.find('div.oper > button.create').on('click',function(e){
                        j_create.modal('show');      
                    });

                    j_create.find('[name="logo"]').on('change',function(e){
                        var url;
                        var j_logo = j_create.find('img.logo');

                        if((url = $(this).val()) == ''){
                            j_logo.hide(); 
                        }else{
                            j_logo.attr('src',url);
                            j_logo.show(); 
                        }
                    });
                    j_create.find('button.submit').on('click',function(e){
                        var i;
                        var title = j_create.find('[name="title"]').val(); 
                        var intro = j_create.find('[name="intro"]').val(); 
                        var logo = j_create.find('[name="logo"]').val(); 
                        var sqmodid = parseInt(j_create.find('[name="sqmod"]').val());
                        var hidden = j_create.find('[name="hidden"]').val(); 
                        var tags = create_tagbox_cate.get_tag();
                        var cateid_list;
                        
                        if(hidden == '0'){
                            hidden = false;
                        }else{
                            hidden = true;
                        }

                        cateid_list = new Array();
                        for(i = 0;i < tags.length;i++){
                            cateid_list.push(id_catemap[tags[i]]);
                        }

                        com.call_backend('core/square/','create_square',function(result){
                            var data = result.data;
                            var err = null; 

                            if(com.is_callerr(result)){
                                if(data == 'Etitle_too_short'){
                                    err = '方塊名稱過短';
                                }else if(data == 'Etitle_too_long'){
                                    err = '方塊名稱過長';
                                }else if(data == 'Eintro_too_short'){
                                    err = '方塊介紹過短';
                                }else if(data == 'Eintro_too_long'){
                                    err = '方塊介紹過長';
                                }else if(data == 'Elogo_too_short'){
                                    err = '方塊圖片網址過短';
                                }else if(data == 'Elogo_too_long'){
                                    err = '方塊圖片網址過長';
                                }else if(data == 'Etoo_many_category'){
                                    err = '方塊分類過多';
                                }
                                
                                if(err != null){
                                    index.add_alert('alert-error','失敗',err);
                                }else{
                                    index.add_alert('','警告','管理發生錯誤');
                                }
                            }else{
                                index.add_alert('alert-success','成功','方塊已建立');
                                j_create.modal('hide');
                                _update_list(); 
                            }
                        },title,hidden,sqmodid,intro,logo,cateid_list);

                    });
                    j_create.find('button.cancel').on('click',function(e){
                        j_create.modal('hide');
                    });
                    j_create.on('show',function(e){
                        _update_sqmod().done(function(sqmod_list){
                            var i;
                            var j_sqmod;
                            var j_option;
                            var sqmodo;

                            j_sqmod = j_create.find('[name="sqmod"]');
                            j_sqmod.empty();
                            for(i = 0;i < sqmod_list.length;i++){
                                sqmodo = sqmod_list[i];

                                j_option = $('<option></option>');
                                j_option.attr('value',sqmodo.sqmodid);
                                j_option.text(sqmodo.sqmodname);

                                j_sqmod.append(j_option);
                            }
                        });
                    });
                    j_create.on('hide',function(e){
                        j_create.find('input').val(''); 
                        j_create.find('img.logo').attr('src',null);
                        create_tagbox_cate.clear();
                    });

                    j_catebox = j_set.find('div.catebox');
                    set_tagbox_cate = j_catebox.tagbox({'words':[],'restrict':true,'duplicate':false});
                    j_catebox.find('input').attr('placeholder','+加入分類');

                    j_set.find('[name="logo"]').on('change',function(e){
                        var url;
                        var j_logo = j_set.find('img.logo');

                        if((url = $(this).val()) == ''){
                            j_logo.attr('src',com.get_defaultimg(set_data.id));
                        }else{
                            j_logo.attr('src',url);
                        }
                    });
                    j_set.on('show',function(e){
                        var i;
                        var url;

                        j_set.find('[name="title"]').val(set_data.title);
                        j_set.find('[name="intro"]').val(set_data.intro);
                        j_set.find('[name="logo"]').val(set_data.logo);

                        if((url = set_data.logo) == ''){
                            url = com.get_defaultimg(set_data.id);
                        }
                        j_set.find('img.logo').attr('src',url);

                        if(set_data.hidden == false){
                            j_set.find('[name="hidden"]').val(0);
                        }else{
                            j_set.find('[name="hidden"]').val(1);
                        }

                        set_tagbox_cate.clear();
                        for(i = 0;i < set_data.cateid.length;i++){
                            set_tagbox_cate.add_tag(cate_idmap[set_data.cateid[i]]); 
                        }

                        j_set.on('shown',function(e){
                            set_tagbox_cate.refresh();
                        });
                    });
                    j_set.find('button.submit').on('click',function(e){
                        var i;
                        var title = j_set.find('[name="title"]').val(); 
                        var intro = j_set.find('[name="intro"]').val(); 
                        var logo = j_set.find('[name="logo"]').val(); 
                        var hidden = j_set.find('[name="hidden"]').val(); 
                        var tags = set_tagbox_cate.get_tag();
                        var cateid_list;
                        
                        if(hidden == '0'){
                            hidden = false;
                        }else{
                            hidden = true;
                        }

                        cateid_list = new Array();
                        for(i = 0;i < tags.length;i++){
                            cateid_list.push(id_catemap[tags[i]]);
                        }

                        com.call_backend('core/square/','set_square',function(result){
                            var data = result.data;
                            var err = null; 

                            if(com.is_callerr(result)){
                                if(data == 'Etitle_too_short'){
                                    err = '方塊名稱過短';
                                }else if(data == 'Etitle_too_long'){
                                    err = '方塊名稱過長';
                                }else if(data == 'Eintro_too_short'){
                                    err = '方塊介紹過短';
                                }else if(data == 'Eintro_too_long'){
                                    err = '方塊介紹過長';
                                }else if(data == 'Elogo_too_short'){
                                    err = '方塊圖片網址過短';
                                }else if(data == 'Elogo_too_long'){
                                    err = '方塊圖片網址過長';
                                }else if(data == 'Etoo_many_category'){
                                    err = '方塊分類過多';
                                }
                                
                                if(err != null){
                                    index.add_alert('alert-error','失敗',err);
                                }else{
                                    index.add_alert('','警告','管理發生錯誤');
                                }
                            }else{
                                index.add_alert('alert-success','成功','方塊已設定');
                                j_set.modal('hide');
                                _update_list(); 
                            }
                        },set_data.id,title,set_data.start_time,set_data.end_time,hidden,intro,logo,cateid_list);
                    });
                    j_set.find('button.cancel').on('click',function(e){
                        j_set.modal('hide');
                    });
                    j_set.on('hide',function(e){
                        j_set.find('input').val(''); 
                        j_set.find('img.logo').attr('src',null);
                        set_tagbox_cate.clear();
                    });

                    _update_list();
                });
            }
            
            return 'cont';
        };
        manage_node.child_set(square_node);

        problem_node.url_chg = function(direct,url_upart,url_dpart,param){
            var j_create;
            var j_set;
            var j_list;
            var set_data;

            function _item_set(j_item,proid,title,hidden,pmodid){
                var j_hidden;

                j_item.find('td.proid').text(proid); 
                j_item.find('td.title').text(title); 
                j_hidden = j_item.find('td.hid');
                if(hidden == false){
                    j_hidden.text('公開');
                    j_hidden.removeClass('text-warning');
                }else{
                    j_hidden.text('隱藏');
                    j_hidden.addClass('text-warning');
                }

                j_item.find('button.set').on('click',function(e){
                    set_data = {
                        'proid':proid,
                        'title':title,
                        'hidden':hidden
                    }; 

                    j_set.modal('show');
                });
                j_item.find('button.del').on('click',function(e){
                    com.call_backend('core/problem/','delete_problem',function(result){
                        if(com.is_callerr(result)){
                            index.add_alert('alert-error','失敗','刪除題目發生錯誤'); 
                        }else{
                            _update_list();
                        }
                    },proid); 
                });
            }
            function _item_create(proid,title,hidden,pmodid){
                var j_item = $('<tr class="item"><td class="proid"></td><td class="title"></td><td class="hid"></td><td class="oper"><div class="btn-group"><button class="btn btn-small set"><i class="icon-cog"></i></button><button class="btn btn-small del"><i class="icon-trash"></i></button></div></td></tr>');

                _item_set(j_item,proid,title,hidden,pmodid);

                return j_item;
            }
            function _update_pmod(){
                var defer = $.Deferred();

                com.call_backend('core/problem/','list_pmod',function(result){
                    var i;
                    var data = result.data;
                    var j_pmod;
                    var j_option;

                    if(com.is_callerr(result)){
                        index.add_alert('','警告','管理發生錯誤'); 
                        defer.reject(data);
                    }else{
                        defer.resolve(data);        
                    }
                });

                return defer.promise();
            }
            function _update_list(){
                com.call_backend('core/problem/','list_problem',function(result){
                    var i;
                    var data = result.data; 
                    var proo;
                    var j_item;

                    if(com.is_callerr(result)){
                        index.add_alert('','警告','管理發生錯誤'); 
                    }else{
                        j_list.empty();
                        for(i = 0;i < data.length;i++){
                            proo = data[i];
                            j_item = _item_create(proo.proid,proo.title,proo.hidden,proo.pmodid);
                            j_list.append(j_item);
                        } 
                    }
                });
            }

            if(direct == 'in'){
                j_tabnav_problem.active();

                com.loadpage('/toj/html/manage_problem.html','/toj/css/manage_problem.css').done(function(){
                    var j_button;

                    j_create = j_index_page.find('div.create'); 
                    j_set = j_index_page.find('div.set'); 
                    j_list = j_index_page.find('table.list > tbody');

                    j_button = j_index_page.find('div.oper > button.create');
                    if(com.check_access(ACCESSID_PROBLEMMG,ACCESS_CREATE)){
                        j_button.show();
                    }
                    j_button.on('click',function(e){
                        j_create.modal('show'); 
                    });

                    j_create.on('show',function(e){
                        _update_pmod().done(function(pmod_list){
                            var i;
                            var j_pmod;
                            var j_option;

                            j_pmod = j_create.find('[name="pmod"]');
                            j_pmod.empty();
                            for(i = 0;i < pmod_list.length;i++){
                                j_option = $('<option></option>');
                                j_option.attr('value',pmod_list[i].pmodid);
                                j_option.text(pmod_list[i].pmodname);

                                j_pmod.append(j_option);
                            }
                        });
                    });
                    j_create.on('hide',function(e){
                        j_create.find('input').val('');
                    });
                    j_create.find('button.submit').on('click',function(e){
                        var title = j_create.find('[name="title"]').val(); 
                        var pmodid = parseInt(j_create.find('[name="pmod"]').val());
                        var hidden = j_create.find('[name="hidden"]').val(); 

                        if(hidden == '0'){
                            hidden = false;
                        }else{
                            hidden = true;
                        }

                        com.call_backend('core/problem/','create_problem',function(result){
                            var data = result.data;
                            var err = null;

                            if(com.is_callerr(result)){
                                if(data == 'title_too_short'){
                                    err = '題目名稱過短'; 
                                }else if(data == 'title_too_long'){
                                    err = '題目名稱過長'; 
                                } 

                                if(err != null){
                                    index.add_alert('alert-error','失敗',err);
                                }else{
                                    index.add_alert('','警告','管理發生錯誤');
                                }
                            }else{
                                j_create.modal('hide');
                                index.add_alert('alert-success','成功','題目已建立');
                                _update_list();
                            }
                        },title,hidden,pmodid);
                    });
                    j_create.find('button.cancel').on('click',function(e){
                        j_create.modal('hide');
                    });
                    
                    j_set.on('show',function(e){
                        j_set.find('[name="title"]').val(set_data.title);
                        if(set_data.hidden == false){
                            j_set.find('[name="hidden"]').val(0);
                        }else{
                            j_set.find('[name="hidden"]').val(1);
                        }
                    });
                    j_set.on('hide',function(e){
                        j_set.find('input').val('');
                    });
                    j_set.find('button.submit').on('click',function(e){
                        var title = j_set.find('[name="title"]').val(); 
                        var hidden = j_set.find('[name="hidden"]').val(); 

                        if(hidden == '0'){
                            hidden = false;
                        }else{
                            hidden = true;
                        }

                        com.call_backend('core/problem/','set_problem',function(result){
                            var data = result.data;
                            var err = null;

                            if(com.is_callerr(result)){
                                if(data == 'title_too_short'){
                                    err = '題目名稱過短'; 
                                }else if(data == 'title_too_long'){
                                    err = '題目名稱過長'; 
                                } 

                                if(err != null){
                                    index.add_alert('alert-error','失敗',err);
                                }else{
                                    index.add_alert('','警告','管理發生錯誤');
                                }
                            }else{
                                j_set.modal('hide');
                                index.add_alert('alert-success','成功','題目已設定');
                                _update_list();
                            }
                        },set_data.proid,title,hidden);
                    });
                    j_set.find('button.cancel').on('click',function(e){
                        j_set.modal('hide');
                    });

                    _update_list();
                }); 
            }

            return 'cont';
        };
        manage_node.child_set(problem_node);
    };
};
