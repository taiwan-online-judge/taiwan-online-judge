var mail = new function(){
    var that = this;
    var j_index_page;
    var j_maillist;

    var mailitem_set = function(j_item,from,title,time,unread){
        j_item.find('td.from').text(from);
        j_item.find('td.title').text(title);
        j_item.find('td.time').text(time);

        if(unread == true){
            j_item.addClass('warning');
        }
    };
    var mailitem_create = function(from,title,time,unread){
        var j_item = $('<tr class="item"><td class="from"></td><td class="title"></td><td class="time"></td></tr>');

        mailitem_set(j_item,from,title,time,unread);

        return j_item;
    };

    that.ready = function(){
        var mail_node = new vus.node('mail');

        j_index_page = $('#index_page');
        
        mail_node.url_chg = function(direct,url_upart,url_dpart,param){
            if(direct == 'in'){
                com.loadpage('信箱','/toj/html/mail.html').done(function(){
                    var j_oper;
                    var j_newmail;
                    var newmail_content;

                    j_maillist = j_index_page.find('table.maillist > tbody');

                    j_oper = j_index_page.find('div.oper');
                    j_oper.find('li.newmail > a').on('click',function(e){
                        j_newmail.modal('show');
                        return false;
                    });

                    j_newmail = j_index_page.find('div.newmail');
                    newmail_content = com.create_codebox(j_newmail.find('div.content'),'text/html');

                    j_newmail.on('shown',function(e){
                        newmail_content.refresh();
                    });
                    j_newmail.on('hide',function(e){
                        j_newmail.find('input').val('');
                        newmail_content.setValue('');
                    });
                    j_newmail.find('button.submit').on('click',function(e){
                        var to_username = j_newmail.find('input.to_username').val();
                        var title = j_newmail.find('input.title').val();
                        var content = newmail_content.getValue();

                        com.call_backend('core/mail/','send_mail',function(result){
                            var data = result.data;
                            var errmsg;

                            j_newmail.modal('hide');

                            if(com.is_callerr(result)){
                                if(data == 'Etitle_too_short'){
                                    errmsg = '郵件標題過短';
                                }else if(data == 'Etitle_too_long'){
                                    errmsg = '郵件標題過長';
                                }else if(data == 'Econtent_too_short'){
                                    errmsg = '郵件內容過短';
                                }else if(data == 'Econtent_too_long'){
                                    errmsg = '郵件內容過長';
                                }else if(data == 'Eto_username'){
                                    errmsg = '收件人不存在';
                                }else{
                                    errmsg = '信件寄出時發生錯誤';
                                }

                                index.add_alert('alert-error','失敗',errmsg,true);
                            }else{
                                index.add_alert('alert-success','成功','信件已寄出',true);
                            }
                        },to_username,title,content);
                    });
                    j_newmail.find('button.cancel').on('click',function(e){
                        j_newmail.modal('hide');
                    });

                    com.call_backend('core/mail/','get_mail_count',function(result){
                        if(com.is_callerr(result)){
                            //TODO GE
                        }else{
                            
                        }
                    });
                    com.call_backend('core/mail/','list_mail',function(result){
                        console.log(result);
                    },1);

                    var j_item;
                    var i;

                    for(i = 0;i < 20;i++){
                        j_item = mailitem_create('alice','範例右鍵標題','2013-6-17 10:24');
                        j_maillist.append(j_item);
                    }
                });
            }
        };
        com.vus_root.child_set(mail_node);
    };
};
