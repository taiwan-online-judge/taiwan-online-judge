'use strict'

var pmod_test = function(proid,pro_node){
    var that = this;
    var j_index_page = $('#index_page');
    var manage_node = new vus.node('manage');
    var callpath = 'pro/' + proid + '/';
    
    pro_node.url_chg = function(direct,url_upart,url_dpart,param){
        if(direct == 'in'){
            pro_node.child_set(manage_node);

            if(url_dpart.length > 0){
                return 'cont';
            }

            com.loadpage('/toj/pmod/pmod_test/html/view.html','/toj/pmod/pmod_test/css/view.css').done(function(){
                var j_submit;

                j_submit = j_index_page.find('div.submit');

                com.call_backend(callpath,'view',function(result){
                    var data = result.data;
                    var j_info;

                    if(com.is_callerr(result)){
                        index.add_alert('alert-error','錯誤','讀取題目失敗');
                    }else{
                        j_info = j_index_page.find('div.info');
                        j_info.find('table.limit td.timelimit').text(data.timelimit + ' ms');
                        j_info.find('table.limit td.memlimit').text(data.memlimit + ' KB');

                        j_info.find('button.submit').on('click',function(e){
                            j_submit.modal('show');
                        });

                        j_index_page.find('div.content').html(data.content);
                    }
                });
            });
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
            var j_item = $('<tr class="item"><td class="id"></td><td class="testmode"></td><td class="oper"><div class="btn-group"><button class="btn btn-small set"><i class="icon-cog"></i></button><button class="btn btn-small del"><i class="icon-trash"></i></button></div></td></tr>')

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
                    j_option = $('<option></option>');
                    j_option.text('未設定');
                    j_option.attr('value',0);
                    j_testmode.append(j_option);
                    
                    j_testmode = j_set_mode.find('[name="testmode"]');
                    j_testmode.empty();
                    for(i = 0;i < testmode_list.length;i++){
                        j_option = $('<option></option>');
                        j_option.text(testmode_list[i].testmodename);
                        j_option.attr('value',testmode_list[i].testmodeid);
                        j_testmode.append(j_option);
                    }
                    j_option = $('<option></option>');
                    j_option.text('未設定');
                    j_option.attr('value',0);
                    j_testmode.append(j_option);

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
            var j_item = $('<tr class="item"><td class="id"></td><td class="name"></td><td class="oper"><div class="btn-group"><button class="btn btn-small set"><i class="icon-cog"></i></button><button class="btn btn-small del"><i class="icon-trash"></i></button></div></td></tr>')

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
        function _mix_content(j_box){
            var content_title = j_box.find('div.content input.title').val();
            var content = j_box.find('div.content div.data').data('codebox').getValue();
            var format_title = j_box.find('div.format input.title').val();
            var format = j_box.find('div.format div.data').data('codebox').getValue();
            var testdata_title = j_box.find('div.testdata input.title').val();
            var testdata = j_box.find('div.testdata div.data').data('codebox').getValue();

            console.log(content_title);

            return '<!--content_title_start--><h4>' + content_title + '</h4><!--content_title_end-->' + 
                   '<!--content_start-->' + content + '<!--content_end-->' + 
                   '<!--format_title_start--><h4>' + format_title + '</h4><!--format_title_end-->' +
                   '<!--format_start-->' + format + '<!--format_end-->' + 
                   '<!--testdata_title_start--><h4>' + testdata_title + '</h4><!--testdata_title_end-->' +
                   '<!--testdata_start-->' + testdata + '<!--testdata_end-->';
        }
        function _parse_content(j_box,mix_content){
            var part;
            var content_title;
            var content;
            var format_title;
            var format;
            var testdata_title;
            var testdata;

            console.log(mix_content);
            part = mix_content.match(/<!--content_title_start--><h4>([\s\S.]*)<\/h4><!--content_title_end-->/);
            if(part != null){
                content_title = part[1];
            }else{
                content_title = '';
            }
            part = mix_content.match(/<!--content_start-->([\s\S.]*)<!--content_end-->/);
            if(part != null){
                content = part[1];
            }else{
                content = '';
            }
            
            part = mix_content.match(/<!--format_title_start--><h4>([\s\S.]*)<\/h4><!--format_title_end-->/);
            if(part != null){
                format_title = part[1];
            }else{
                format_title = '';
            }
            part = mix_content.match(/<!--format_start-->([\s\S.]*)<!--format_end-->/);
            if(part != null){
                format = part[1];
            }else{
                format = '';
            }
            
            part = mix_content.match(/<!--testdata_title_start--><h4>([\s\S.]*)<\/h4><!--testdata_title_end-->/);
            if(part != null){
                testdata_title = part[1];
            }else{
                testdata_title = '';
            }
            part = mix_content.match(/<!--testdata_start-->([\s\S.]*)<!--testdata_end-->/);
            if(part != null){
                testdata = part[1];
            }else{
                testdata = '';
            }

            j_box.find('div.content input.title').val(content_title);
            j_box.find('div.content div.data').codebox().setValue(content);
            j_box.find('div.format input.title').val(format_title);
            j_box.find('div.format div.data').codebox().setValue(format);
            j_box.find('div.testdata input.title').val(testdata_title);
            j_box.find('div.testdata div.data').codebox().setValue(testdata);
        }

        if(direct == 'in'){
            com.loadpage('/toj/pmod/pmod_test/html/manage.html').done(function(){
                j_mode_list = j_index_page.find('table.mode > tbody');
                j_testmode_list = j_index_page.find('table.testmode > tbody');

                j_create_mode = j_index_page.find('div.create_mode');
                j_create_mode.find('div.content div.data').codebox({'mode':'text/html'});
                j_create_mode.find('div.format div.data').codebox({'mode':'text/html'});
                j_create_mode.find('div.testdata div.data').codebox({'mode':'text/html'});

                j_create_mode.on('shown',function(e){
                    var i;
                    var codeboxs;

                    codeboxs = j_create_mode.find('div.block div.data');
                    for(i = 0;i < codeboxs.length;i++){
                        $(codeboxs[i]).data('codebox').refresh();
                    }
                });
                j_create_mode.on('hide',function(e){
                    var i;
                    var codeboxs;

                    j_create_mode.find('div.content input.title').val('內容');
                    j_create_mode.find('div.format input.title').val('I/O格式');
                    j_create_mode.find('div.testdata input.title').val('範例測資');
                    
                    codeboxs = j_create_mode.find('div.block div.data');
                    for(i = 0;i < codeboxs.length;i++){
                        $(codeboxs[i]).data('codebox').setValue('');
                    }
                });
                j_create_mode.find('button.submit').on('click',function(e){
                    var testmodeid = parseInt(j_create_mode.find('[name="testmode"]').val());
                    var mix_content;

                    mix_content = _mix_content(j_create_mode);

                    com.call_backend(callpath,'add_mode',function(result){
                        if(com.is_callerr(result)){
                            index.add_alert('','警告','管理發生錯誤');
                        }else{
                            index.add_alert('alert-success','成功','模式已建立');
                            j_create_mode.modal('hide');

                            _update();
                        } 
                    },mix_content,testmodeid); 
                });
                j_create_mode.find('button.cancel').on('click',function(e){
                    j_create_mode.modal('hide'); 
                });

                j_index_page.find('button.create_mode').on('click',function(e){
                    j_create_mode.modal('show');
                });

                j_set_mode = j_index_page.find('div.set_mode');
                j_set_mode.find('div.content div.data').codebox({'mode':'text/html'});
                j_set_mode.find('div.format div.data').codebox({'mode':'text/html'});
                j_set_mode.find('div.testdata div.data').codebox({'mode':'text/html'});
                
                j_set_mode.on('show',function(e){
                    com.call_backend(callpath,'get_mode',function(result){
                        var data = result.data;
                        var parse_content;

                        if(com.is_callerr(result)){
                            index.add_alert('','警告','管理發生錯誤');
                        }else{
                            parse_content = _parse_content(j_set_mode,data.content);

                            if(data.testmodeid == null){
                                j_set_mode.find('[name="testmode"]').val(0);
                            }else{
                                j_set_mode.find('[name="testmode"]').val(data.testmodeid);
                            }
                        }
                    },set_mode_id);
                });
                j_set_mode.on('shown',function(e){
                    var i;
                    var codeboxs;

                    codeboxs = j_set_mode.find('div.block div.data');
                    for(i = 0;i < codeboxs.length;i++){
                        $(codeboxs[i]).data('codebox').refresh();
                    }
                });
                j_set_mode.on('hide',function(e){
                    var i;
                    var codeboxs;

                    set_mode_id = null;

                    j_set_mode.find('div.block input.title').val('');
                    
                    codeboxs = j_set_mode.find('div.block div.data');
                    for(i = 0;i < codeboxs.length;i++){
                        $(codeboxs[i]).data('codebox').setValue('');
                    }
                });
                j_set_mode.find('button.submit').on('click',function(e){
                    var testmodeid = parseInt(j_set_mode.find('[name="testmode"]').val());
                    var mix_content;

                    if(testmodeid == 0){
                        testmodeid = null;
                    }

                    mix_content = _mix_content(j_set_mode);

                    com.call_backend(callpath,'set_mode',function(result){
                        if(com.is_callerr(result)){
                            index.add_alert('','警告','管理發生錯誤');
                        }else{ 
                            index.add_alert('alert-success','成功','模式已設定');
                            j_set_mode.modal('hide');

                            _update();
                        }
                    },set_mode_id,mix_content,testmodeid); 
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
