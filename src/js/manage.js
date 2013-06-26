'use strict'

var manage = new function(){
    var that = this;
    var j_index_page;

    that.ready = function(){
        var j_tabnav_square;

        var manage_node = new vus.node('manage');
        var square_node = new vus.node('square'); 

        j_index_page = $('#index_page');

        manage_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                index.set_menu('管理');
                index.clear_tabnav();

                j_tabnav_square = index.add_tabnav('方塊','/toj/manage/square/');

                com.call_backend('core/user/','list_auth',function(result){
                    console.log(result);
                });
            }

            return 'cont';
        };
        com.vus_root.child_set(manage_node);

        square_node.url_chg = function(direct,url_upart,url_dpart,param){
            var j_set;
            var j_list;
            var set_timepicker_start;
            var set_timepicker_end;
            var catemap;

            function _item_set(j_item,id,title,status,cateid,intro,logo,hidden,start_time,end_time){
                var i;
                var j_cate;
                var j_label;

                j_item.find('td.id').text(id);
                j_item.find('td.title').text(title);

                if(status == 1){
                    j_item.find('td.status').append($('<span class="label label-warning">等待中</span>'));
                }else if(status == 2){
                    j_item.find('td.status').append($('<span class="label label-success">進行中</span>'));
                }else if(status == 3){
                    j_item.find('td.status').append($('<span class="label">已結束</span>'));
                }

                j_cate = j_item.find('td.cate');
                for(i = 0;i < cateid.length;i++){
                    j_label = $('<span class="label label-info"></span>');
                    j_label.text(catemap[cateid[i]]);
                    j_cate.append(j_label); 
                }

                j_item.find('button.set').on('click',function(e){
                    var i;
                    var j_catebox;
                    var j_tag;
                    var catelist;
                    var key;

                    j_set.find('[name="title"]').val(title);
                    j_set.find('[name="intro"]').val(intro);
                    j_set.find('[name="logo"]').val(logo);

                    if(logo == ''){
                        logo = com.get_defaultimg(id);
                    }
                    j_set.find('img.logo').attr('src',logo);

                    if(start_time != null){
                        set_timepicker_start.setDate(new Date(start_time));
                    }else{
                        set_timepicker_start.setDate(null);
                    }
                    if(end_time != null){
                        set_timepicker_end.setDate(new Date(end_time));
                    }else{
                        set_timepicker_end.setDate(null);
                    }

                    catelist = new Array();
                    for(key in catemap){
                        if(key == 0){
                            continue;
                        }
                        catelist.push(catemap[key]);
                    }
                    
                    j_catebox = com.create_tagbox(j_set.find('div.catebox'),catelist,true,false);
                    j_catebox.find('input').attr('placeholder','+加入分類');
                    for(i = 0;i < cateid.length;i++){
                        j_catebox.add_tag(catemap[cateid[i]]); 
                    }

                    j_set.on('shown',function(e){
                        j_catebox.refresh();
                    });

                    j_set.modal('show');
                });
            }
            function _item_create(id,title,status,cateid,intro,logo,hidden,start_time,end_time){
                var j_item = $('<tr class="item"><td class="id"></td><td class="title"><td class="status"></td></td><td class="cate"></td><td class="oper"><button class="btn btn-small set"><i class="icon-cog"></i></button></td></tr>');
                
                _item_set(j_item,id,title,status,cateid,intro,logo,hidden,start_time,end_time);

                return j_item;
            }
            function _update(){
                com.call_backend('core/square/','list_category',function(result){
                    var i;
                    var data = result.data;

                    if(com.is_callerr(result)){
                        index.add_alert('','警告','管理發生錯誤');
                    }else{
                        catemap = new Object();
                        for(i = 0;i < data.length;i++){
                            catemap[data[i].cateid] = data[i].catename;
                        }

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
                                    
                                    _item_set($(items[i]),sqo.sqid,
                                              sqo.title,
                                              sqo.status,
                                              sqo.cateid,
                                              sqo.intro,
                                              sqo.logo,
                                              sqo.hidden,
                                              sqo.start_time,
                                              sqo.end_time); 
                                }
                                for(;i < data.length;i++){
                                    sqo = data[i];

                                    j_item = _item_create(sqo.sqid,
                                                          sqo.title,
                                                          sqo.status,
                                                          sqo.cateid,
                                                          sqo.intro,
                                                          sqo.logo,
                                                          sqo.hidden,
                                                          sqo.start_time,
                                                          sqo.end_time);
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
                com.loadpage('/toj/html/manage_square.html').done(function(){
                    var j_start;
                    var j_end;

                    j_list = j_index_page.find('table.list');
                    j_set = j_index_page.find('div.set');
                    j_tabnav_square.active();

                    j_start = j_set.find('div.start');
                    set_timepicker_start = com.create_datetimepicker(j_start);
                    j_start.find('input').attr('placeholder','留空表示不限制');
                    j_end = j_set.find('div.end');
                    set_timepicker_end = com.create_datetimepicker(j_end);
                    j_end.find('input').attr('placeholder','留空表示不限制');
                    
                    _update();
                });
            }
            
            return 'cont';
        };
        manage_node.child_set(square_node);
    };
};
