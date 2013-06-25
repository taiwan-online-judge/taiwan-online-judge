var notice = new function(){
    var that = this;
    var j_noticetag;
    var j_noticelist;

    that.ready = function(){
        function _set_unseen_count(count){
            if(count == 0){
                j_noticetag.removeClass('notice_hl');
            }else{
                j_noticetag.addClass('notice_hl');
            }
            j_noticetag.text('[' + count + ']');
        }

        j_noticetag = $('#index_paneltag > div.notice');
        j_noticelist = $('#index_panel > div.notice > ul.nav');

        j_noticetag.on('click',function(e){
            j_noticelist.empty();

            com.call_backend('core/notice/','list_notice',function(result){
                var i;
                var data = result.data;
                var notice;
                var j_item;

                if(com.is_callerr(result)){
                    index.add_alert('','警告','通知發生錯誤');
                }else{       
                    for(i = 0;i < data.length;i++){
                        notice = data[i];

                        j_item = $('<li><a><h5></h5><p></p></a></li>'); 
                        j_item.find('h5').text(notice.title);
                        j_item.find('p').text(notice.content);

                        if(notice.noticemodid == null){
                            j_item.find('a').attr('href','/toj' + notice.metadata); 
                        }

                        j_noticelist.append(j_item);
                    }
                }
            });
        });
        
        user.login_callback.add(function(){
            imc.Proxy.instance.register_call('core/notice/','update_notice',function(callback,unseen_count){
                _set_unseen_count(unseen_count);
                callback('Success');
            });

            com.call_backend('core/notice/','get_unseen_count',function(result){
                var data = result.data;

                if(com.is_callerr(result)){
                    index.add_alert('','警告','通知發生錯誤');
                }else{
                    _set_unseen_count(data.unseen_count);
                }         
            });

            j_noticetag.show();
        });
    };
};
