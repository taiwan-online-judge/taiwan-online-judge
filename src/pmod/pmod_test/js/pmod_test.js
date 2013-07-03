'use strict'

var pmod_test = function(proid,pro_node){
    var that = this;
    var j_index_page = $('#index_page');
    var manage_node = new vus.node('manage');
    var callpath = 'pro/' + proid + '/';
    
    pro_node.url_chg = function(direct,url_upart,url_dpart,param){
        if(direct == 'in'){
            pro_node.child_set(manage_node);
        }else if(direct == 'out'){
            pro_node.child_del(manage_node);
        }

        return 'cont';
    };
    that.unload = function(){
        
    };
    
    manage_node.url_chg = function(direct,url_upart,url_dpart,param){
        var j_create_mode;
        var j_set_mode;
        var j_create_testmode;
        var j_set_testmode;
        var j_mode_list;
        var j_testmode_list;

        var set_mode_id = null;
        var set_testmode_id = null;
        var set_testdata_id = null;

        var testmode_idmap;

        function _mode_set(j_item,modeid,testmodeid){
            j_item.find('td.id').text(modeid);
            j_item.find('td.testmode').text(testmode_idmap[testmodeid]);

            j_item.find('button.set').off('click').on('click',function(e){
                set_mode_id = modeid;
                j_set_mode.modal('show'); 
            });

            if(modeid == 1){
                j_item.find('button.del').remove();
            }else{
                j_item.find('button.del').off('click').on('click',function(e){
                    com.call_backend(callpath,'del_mode',function(result){
                        if(com.is_callerr(result)){
                            index.add_alert('','警告','管理發生錯誤'); 
                        }else{
                            _update();
                        }
                    },modeid);    
                });
            }
        }
        function _mode_create(modeid,testmodeid){
            var j_item = $('<tr><td class="id"></td><td class="testmode"></td><td class="oper"><div class="btn-group"><button class="btn btn-small set"><i class="icon-cog"></i></button><button class="btn btn-small del"><i class="icon-trash"></i></button></div></td></tr>')

            _mode_set(j_item,modeid,testmodeid);

            return j_item;
        }
        function _mode_update(testmode_list){
            com.call_backend(callpath,'list_mode',function(result){
                var i;
                var data = result.data;
                var j_testmode;
                var j_option;
                var modeo;
                var j_item;

                if(com.is_callerr(result)){
                    index.add_alert('','警告','管理發生錯誤');
                }else{
                    j_testmode = j_create_mode.find('[name="testmode"]');
                    j_testmode.empty();
                    for(i = 0;i < testmode_list.length;i++){
                        j_option = $('<option></option>');
                        j_option.text(testmode_list[i].testmodename);
                        j_option.attr('value',testmode_list[i].testmodeid);
                        j_testmode.append(j_option);
                    }
                    
                    j_testmode = j_set_mode.find('[name="testmode"]');
                    j_testmode.empty();
                    for(i = 0;i < testmode_list.length;i++){
                        j_option = $('<option></option>');
                        j_option.text(testmode_list[i].testmodename);
                        j_option.attr('value',testmode_list[i].testmodeid);
                        j_testmode.append(j_option);
                    }

                    j_mode_list.empty();
                    for(i = 0;i < data.length;i++){
                        modeo = data[i];

                        j_item = _mode_create(modeo.modeid,modeo.testmodeid);
                        j_mode_list.append(j_item);
                    }   
                }
            });
        }

        function _testmode_set(j_item,testmodeid,testmodename){
            j_item.find('td.id').text(testmodeid);
            j_item.find('td.name').text(testmodename);

            j_item.find('button.set').off('click').on('click',function(e){
                set_testmode_id = testmodeid;
                j_set_testmode.modal('show'); 
            });
            j_item.find('button.del').off('click').on('click',function(e){
                com.call_backend(callpath,'del_testmode',function(result){
                    if(com.is_callerr(result)){
                        index.add_alert('','警告','管理發生錯誤'); 
                    }else{
                        _update();
                    }
                },testmodeid);    
            });
        }
        function _testmode_create(testmodeid,testmodename){
            var j_item = $('<tr><td class="id"></td><td class="name"></td><td class="oper"><div class="btn-group"><button class="btn btn-small set"><i class="icon-cog"></i></button><button class="btn btn-small del"><i class="icon-trash"></i></button></div></td></tr>')

            _testmode_set(j_item,testmodeid,testmodename);

            return j_item;
        }
        function _testmode_update(){
            var defer = $.Deferred();

            com.call_backend(callpath,'list_testmode',function(result){
                var i;
                var data = result.data;
                var testmodeo;
                var j_item;

                if(com.is_callerr(result)){
                    index.add_alert('','警告','管理發生錯誤');
                }else{
                    testmode_idmap = new Object();
                    j_testmode_list.empty();
                    for(i = 0;i < data.length;i++){
                        testmodeo = data[i];

                        testmode_idmap[testmodeo.testmodeid] = testmodeo.testmodename;

                        j_item = _testmode_create(testmodeo.testmodeid,testmodeo.testmodename);
                        j_testmode_list.append(j_item);
                    }   

                    defer.resolve(data);
                }
            });

            return defer.promise();
        }
        function _update(){
            _testmode_update().done(_mode_update);
        }

        if(direct == 'in'){
            com.loadpage('/toj/pmod/pmod_test/html/manage.html').done(function(){
                j_mode_list = j_index_page.find('table.mode > tbody');
                j_testmode_list = j_index_page.find('table.testmode > tbody');

                j_create_mode = j_index_page.find('div.create_mode');
                com.create_codebox(j_create_mode.find('div.content'),'text/html');

                j_create_mode.on('shown',function(e){
                    j_create_mode.find('div.content').data('codebox').refresh();
                });
                j_create_mode.on('hide',function(e){
                    j_create_mode.find('div.content').data('codebox').setValue('');
                });
                j_create_mode.find('button.submit').on('click',function(e){
                    var content = j_create_mode.find('div.content').data('codebox').getValue();
                    var testmodeid = parseInt(j_create_mode.find('[name="testmode"]').val());

                    com.call_backend(callpath,'add_mode',function(result){
                        if(com.is_callerr(result)){
                            index.add_alert('','警告','管理發生錯誤');
                        }else{
                            index.add_alert('alert-success','成功','模式已建立');
                            j_create_mode.modal('hide');

                            _update();
                        } 
                    },content,testmodeid); 
                });
                j_create_mode.find('button.cancel').on('click',function(e){
                    j_create_mode.modal('hide'); 
                });

                j_index_page.find('button.create_mode').on('click',function(e){
                    j_create_mode.modal('show');
                });

                j_set_mode = j_index_page.find('div.set_mode');
                com.create_codebox(j_set_mode.find('div.content'),'text/html');
                
                j_set_mode.on('show',function(e){
                    com.call_backend(callpath,'get_mode',function(result){
                        var data = result.data;

                        if(com.is_callerr(result)){
                            index.add_alert('','警告','管理發生錯誤');
                        }else{
                            j_set_mode.find('div.content').data('codebox').setValue(data.content);
                            j_set_mode.find('[name="testmode"]').val(data.testmodeid);
                        }
                    },set_mode_id);
                });
                j_set_mode.on('shown',function(e){
                    j_set_mode.find('div.content').data('codebox').refresh();
                });
                j_set_mode.on('hide',function(e){
                    set_mode_id = null;
                    j_set_mode.find('div.content').data('codebox').setValue('');
                });
                j_set_mode.find('button.submit').on('click',function(e){
                    var content = j_set_mode.find('div.content').data('codebox').getValue();
                    var testmodeid = parseInt(j_set_mode.find('[name="testmode"]').val());

                    com.call_backend(callpath,'set_mode',function(result){
                        if(com.is_callerr(result)){
                            index.add_alert('','警告','管理發生錯誤');
                        }else{ 
                            index.add_alert('alert-success','成功','模式已設定');
                            j_set_mode.modal('hide');

                            _update();
                        }
                    },set_mode_id,content,testmodeid); 
                });
                j_set_mode.find('button.cancel').on('click',function(e){
                    j_set_mode.modal('hide'); 
                });

                j_create_testmode = j_index_page.find('div.create_testmode');
                j_create_testmode.on('hide',function(e){
                    j_create_testmode.find('input').val('');
                });
                j_create_testmode.find('button.submit').on('click',function(e){
                    var name = j_create_testmode.find('[name="name"]').val();     
                    var timelimit = parseInt(j_create_testmode.find('[name="timelimit"]').val());
                    var memlimit = parseInt(j_create_testmode.find('[name="memlimit"]').val());

                    com.call_backend(callpath,'add_testmode',function(result){
                        if(com.is_callerr(result)){
                            index.add_alert('','警告','管理發生錯誤');
                        }else{
                            index.add_alert('alert-success','成功','測試已建立');
                            j_create_testmode.modal('hide');

                            _update();
                        }
                    },name,timelimit,memlimit);
                });
                j_create_testmode.find('button.cancel').on('click',function(e){
                    j_create_testmode.modal('hide'); 
                });

                j_set_testmode = j_index_page.find('div.set_testmode');
                j_set_testmode.on('show',function(e){
                    com.call_backend(callpath,'get_testmode',function(result){
                        var data = result.data;

                        if(com.is_callerr(result)){
                            index.add_alert('','警告','管理發生錯誤');
                        }else{
                            j_set_testmode.find('[name="name"]').val(data.testmodename);
                            j_set_testmode.find('[name="timelimit"]').val(data.timelimit);
                            j_set_testmode.find('[name="memlimit"]').val(data.memlimit);
                        }
                    },set_testmode_id);
                });
                j_set_testmode.on('hide',function(e){
                    set_testmode_id = null; 
                });
                j_set_testmode.find('button.submit').on('click',function(e){
                    var name = j_set_testmode.find('[name="name"]').val();
                    var timelimit = parseInt(j_set_testmode.find('[name="timelimit"]').val());
                    var memlimit = parseInt(j_set_testmode.find('[name="memlimit"]').val());

                    com.call_backend(callpath,'set_testmode',function(result){
                        var data = result.data;

                        if(com.is_callerr(result)){
                            index.add_alert('','警告','管理發生錯誤');
                        }else{
                            index.add_alert('alert-success','成功','測試已設定');
                            j_set_testmode.modal('hide');

                        }
                    },set_testmode_id,name,timelimit,memlimit);

                });
                j_set_testmode.find('button.cancel').on('click',function(e){
                    j_set_testmode.modal('hide'); 
                });
                
                j_index_page.find('button.create_testmode').on('click',function(e){
                    j_create_testmode.modal('show');
                });

                _update();
            });
        }

        return 'cont';
    };

};
