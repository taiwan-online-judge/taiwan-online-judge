var square = new function(){
    var that = this;
    var j_index_page;
    var j_catelist;
    var j_indexlist;

    that.ready = function(){
        var square_node = new vus.node('square'); 
        var user_node = new vus.node('user');
        var index_node = new vus.node('index');
        var user_tabnav;
        var index_tabnav;

        function box_set(j_box,id,logo,title,start_time,end_time,intro,active){
            var j_oper;

            j_box.attr('boxid',id);

            j_box.find('img.logo').attr('src',logo);
            j_box.find('h5.title').text(title);
            j_box.find('p.intro').text(intro);

            if(start_time != null || end_time != null){
                if(start_time != null){
                    j_box.find('div.start').text('┌─' + start_time);
                }
                if(end_time != null){
                    j_box.find('div.end').text('└→' + end_time);
                }
            }

            j_oper = j_box.find('div.oper');
            j_oper.empty();
            if(active == null){
                j_oper.append('<button class="btn btn-primary join" data-loading-text="處理中">加入</button><button class="btn">開啓</button>');
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
                if(active== true){
                    j_oper.append('<button class="btn btn-success quit" data-loading-text="處理中">退出</button><button class="btn">開啓</button>');
                }else{
                    j_oper.append('<button class="btn btn-warning quit" data-loading-text="處理中">取消申請</button><button class="btn">開啓</button>');
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
            var j_box = $('<div class="span5 box"><img class="logo"></img><h5 class="title"></h5><div class="time start"></div><div class="time end"></div><p class="intro"></p><div class="btn-group oper"></div></div>');

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
                        if(data.length == 0){
                            return;
                        }

                        j_cate = $('<li><a href=""></a></li>');
                        j_a = j_cate.find('a');
                        j_a.text(cateo.catename);
                        j_a.on('click',function(e){
                            $(window).scrollTop(j_indexlist.find('[cateid="' + cateo.cateid + '"]').offset().top - 66);
                            return false;
                        });
                        j_catelist.append(j_cate);

                        j_catebox = catebox_create(cateo.cateid,cateo.catename);       
                        j_indexlist.append(j_catebox);

                        j_run = j_catebox.find('div.run');
                        j_pend = j_catebox.find('div.pend');
                        j_past = j_catebox.find('div.past');

                        for(i = 0;i < data.length;i++){
                            sqo = data[i];
                            if(joined == true && sqo.active == null){
                                continue;
                            }

                            if((logo = sqo.logo) == ''){
                                logo = 'http://www.gravatar.com/avatar/' + sqo.sqid + '?f=y&d=identicon&s=96';
                            }
                            if(sqo.start_time == null){
                                start_time = null; 
                            }else{
                                start_time = com.get_timestring(sqo.start_time);
                            }
                            if(sqo.end_time == null){
                                end_time = null; 
                            }else{
                                end_time = com.get_timestring(sqo.end_time);
                            }
                            
                            j_box = box_create(sqo.sqid,logo,sqo.title,start_time,end_time,sqo.intro,sqo.active);

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

        j_index_page = $('#index_page');

        square_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                index.set_menu('方塊');
                index.set_title('');
                index.clear_tabnav();

                square_node.child_delayset('user');
                square_node.child_delayset('index');

                com.loadpage('/toj/html/square.html').done(function(){
                    j_catelist = j_index_page.find('ul.catelist');
                    j_indexlist = j_index_page.find('div.indexlist');

                    user_tabnav = index.add_tabnav('已加入','/toj/square/user/');
                    index_tabnav = index.add_tabnav('目錄','/toj/square/index/');
                    
                    square_node.child_set(user_node);
                    square_node.child_set(index_node);
                });
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
