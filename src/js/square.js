var square = new function(){
    var that = this;
    var j_index_page;
    var j_catelist;
    var j_indexlist;

    var square_node = new vus.node('square'); 
    var user_node = new vus.node('user');
    var index_node = new vus.node('index');

    function box_set(j_box,id,logo,title,start_time,end_time,intro,active){
        var j_oper;

        j_box.attr('boxid',id);

        j_box.find('div.logo').css('background-image','url(\'' + logo + '\')');
        j_box.find('h5.title').text(title);
        j_box.find('p.intro').text(intro);

        if(start_time != null){
            j_box.find('div.start').text('┌─' + com.get_timestring(start_time));
        }
        if(end_time != null){
            j_box.find('div.end').text('└→' + com.get_timestring(end_time));
        }

        j_oper = j_box.find('div.oper');
        j_oper.empty();
        if(active == null){
            j_oper.append('<button class="btn btn-primary join" data-loading-text="處理中">加入</button><a class="btn btn-default open">開啓</a>');
            j_oper.find('button.join').on('click',function(e){
                $(this).button('loading');

                com.call_backend('core/square/','join_square',function(result){
                    var data = result.data;

                    if(com.is_callerr(result)){
                        if(data == 'Ereject'){
                            index.add_alert('alert-error','拒絕','加入請求被拒絕');
                        }else if(data == 'Eno_such_sqid'){
                            index.add_alert('alert-error','錯誤','方塊不存在');
                        }else{
                            index.add_alert('alert-error','錯誤','操作方塊發生錯誤');
                        }
                    }else{
                        box_update(id,logo,title,start_time,end_time,intro,data.active);
                    }
                },id); 
            });
        }else{
            if(active == true){
                j_oper.append('<button class="btn btn-success quit" data-loading-text="處理中">退出</button><a class="btn btn-default open">開啓</a>');
            }else{
                j_oper.append('<button class="btn btn-warning quit" data-loading-text="處理中">取消申請</button><a class="btn btn-default open">開啓</a>');
            }

            j_oper.find('button.quit').on('click',function(e){
                $(this).button('loading');

                com.call_backend('core/square/','quit_square',function(result){
                    var data = result.data;

                    if(com.is_callerr(result)){
                        if(data == 'Eno_such_sqid'){
                            index.add_alert('alert-error','錯誤','方塊不存在');
                        }else{
                            index.add_alert('alert-error','錯誤','操作方塊發生錯誤');
                        }
                    }else{
                        box_update(id,logo,title,start_time,end_time,intro,null);
                    }
                },id); 
            });
        }

        j_oper.find('a.open').attr('href','/toj/sq/' + id + '/');
    }
    function box_update(id,logo,title,start_time,end_time,intro,active){
        var i;
        var boxs;

        boxs = j_indexlist.find('[boxid="' + id + '"]');
        for(i = 0;i < boxs.length;i++){
            box_set($(boxs[i]),id,logo,title,start_time,end_time,intro,active);
        }
    }
    function box_create(id,logo,title,start_time,end_time,intro,active){
        var j_box = $('<div class="col-lg-6 box"><div class="logo"></div><h5 class="title"></h5><div class="time start"></div><div class="time end"></div><p class="intro"></p><div class="btn-group oper"></div></div>');

        box_set(j_box,id,logo,title,start_time,end_time,intro,active);

        return j_box;
    }
    function catebox_set(j_box,cateid,catename){
        j_box.attr('cateid',cateid);
        j_box.find('h3.catename').text(catename);
    }
    function catebox_create(cateid,catename){
        var j_box = $('<div class="catebox"><h3 class="catename"></h3><h4 class="run">進行中</h4><div class="clearfix boxlist run"></div><h4 class="pend">等待中</h4><div class="clearfix boxlist pend"></div><h4 class="past">已結束</h4><div class="clearfix boxlist past"></div>');

        catebox_set(j_box,cateid,catename);

        return j_box;
    }   

    function catelist_update(){
        var defer = $.Deferred();

        com.call_backend('core/square/','list_category',function(result){
            var data = result.data;        

            if(com.is_callerr(result)){
                index.add_alert('','警告','方塊目錄發生錯誤');
                defer.reject();
            }else{
                defer.resolve(data);
            }
        });

        return defer.promise();
    }
    function indexlist_update(catelist,joined){
        var i; 
        var j_catebox;
        var cateo;
        
        j_catelist.empty();
        j_indexlist.empty();
        for(i = 0;i < catelist.length;i++){
            cateo = catelist[i];

            com.call_backend('core/square/','list_square',function(cateo){return function(result){
                var i;
                var data = result.data;
                var show_list;
                var sqo;
                var logo;
                var start_time;
                var end_time;
                var j_cate;
                var j_box;
                var j_run;
                var j_pend;
                var j_past;
                var j_a;

                if(com.is_callerr(result)){
                    index.add_alert('','警告','方塊目錄發生錯誤');
                }else{
                    show_list = new Array();
                    for(i = 0;i < data.length;i++){
                        sqo = data[i];
                        if((joined == false || sqo.active != null) && sqo.hidden == false){
                            show_list.push(sqo);
                        }
                    }
                    if(show_list.length == 0){
                        return;
                    }

                    j_cate = $('<a class="list-group-item" href=""></a>');
                    j_cate.text(cateo.catename);
                    j_cate.on('click',function(e){
                        $(window).scrollTop(j_indexlist.find('[cateid="' + cateo.cateid + '"]').offset().top - 66);

                        return false;
                    });
                    j_catelist.append(j_cate);

                    j_catebox = catebox_create(cateo.cateid,cateo.catename);       
                    j_indexlist.append(j_catebox);

                    j_run = j_catebox.find('div.run');
                    j_pend = j_catebox.find('div.pend');
                    j_past = j_catebox.find('div.past');

                    for(i = 0;i < show_list.length;i++){
                        sqo = show_list[i];
                        if((joined == true && sqo.active == null) || sqo.hidden == true){
                            continue;
                        }

                        if((logo = sqo.logo) == ''){
                            logo = com.get_defaultimg(sqo.sqid);
                        }
                        
                        j_box = box_create(sqo.sqid,logo,sqo.title,sqo.start_time,sqo.end_time,sqo.intro,sqo.active);

                        if(sqo.status == 1){
                            j_pend.append(j_box);
                        }else if(sqo.status == 2){
                            j_run.append(j_box);
                        }else if(sqo.status == 3){
                            j_past.append(j_box);
                        }
                    } 

                    if(j_pend.children().length > 0){
                        j_catebox.find('h4.pend').show();
                        j_pend.show();
                    }
                    if(j_run.children().length > 0){
                        j_catebox.find('h4.run').show();
                        j_run.show();
                    }
                    if(j_past.children().length > 0){
                        j_catebox.find('h4.past').show();
                        j_past.show();
                    }
                }
            }}(cateo),cateo.cateid);
        }
    }
    function update(joined){
        catelist_update().done(function(catelist){
            indexlist_update(catelist,joined);
        });
    }

    that.ready = function(){
        var user_tabnav;
        var index_tabnav;

        j_index_page = $('#index_page');

        square_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                index.set_menu('方塊');
                index.set_title('');
                index.clear_tabnav();

                if(user.uid != null){
                    square_node.child_delayset('user');
                }
                square_node.child_delayset('index');

                com.loadpage('/toj/html/square.html','/toj/css/square.css').done(function(){
                    j_catelist = j_index_page.find('div.catelist');
                    j_indexlist = j_index_page.find('div.indexlist');

                    if(user.uid != null){
                        user_tabnav = index.add_tabnav('已加入','/toj/square/user/');
                        square_node.child_set(user_node);
                    }
                    index_tabnav = index.add_tabnav('目錄','/toj/square/index/');
                    square_node.child_set(index_node);
                });

                if(url_dpart.length == 0){
                    if(user.uid == null){
                        com.url_update('/toj/square/index/');
                    }else{
                        com.url_update('/toj/square/user/');
                    }
                }
            }else if(direct == 'out'){
                square_node.child_del(user_node);
                square_node.child_del(index_node);
            }

            return 'cont';
        };
        com.vus_root.child_set(square_node);

        user_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                user_tabnav.active();

                update(true);
            } 

            return 'cont';
        }
        
        index_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                index_tabnav.active();

                update(false);
            } 

            return 'cont';
        }
    };
};
