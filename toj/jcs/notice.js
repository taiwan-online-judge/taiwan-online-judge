var notice = new function(){
    var that = this;
    var j_ajax = null;
    var enid = null;

    var listnew = function(noticeo){
	j_item = $('<li class="item"><a class="item"><div class="head"></div><div class="content"></div></a></li>')
	j_a = j_item.find('a.item');
	j_a.on('click',function(e){
	    that.hide();
	});

	j_head = j_item.find('div.head');
	j_content = j_item.find('div.content');

	switch(noticeo.type){
	    case 'result':
		j_a.attr('href','/toj/m/sub/' + noticeo.subid + '/res/');
		if(noticeo.rejudge_flag == false){
		    j_head.text('Submit ' + noticeo.subid);
		}else{
		    j_head.text('Rejudge ' + noticeo.subid);
		}
		j_content.html('ProID ' + noticeo.proid + ' 結果: ' + RESULTMAP[noticeo.result] + ' 分數: ' + noticeo.score + '<br>' +
			noticeo.runtime+ 'ms / ' + noticeo.memory + 'KB');
		break;
	}

	return j_item;
    };
    var updatenew = function(){
	var j_list;

	if(j_ajax != null){
	    j_ajax.abort();
	}

	j_list = $('#notice_list');
	j_ajax = $.post('/toj/php/notice.php',{'action':'get','data':JSON.stringify({'nid':0,'count':10})},
	    function(res){
		var i;

		var reto;
		var noticeo;
		var j_item;
		var j_a;

		if(res[0] != 'E'){
		    reto = JSON.parse(res);
		    for(i = 0;i < reto.length;i++){
			noticeo = JSON.parse(reto[i].txt);
			j_item = listnew(noticeo);
			j_list.prepend(j_item);
			j_a = j_item.find('a.item');
			j_a.addClass('item_h');
			j_a.stop().animate({left:0},'slow','easeOutQuart');
		    }

		    if(enid == null){
			if(reto.length == 0){
			    enid = 2147483647;
			}else{
			    enid = reto[0].nid;
			}
			updateprev(); 
		    }
		}

		j_ajax = null;
	    }
	);
    };
    var updateprev = function(){
	var j_list;

	j_list = $('#notice_list');
	$.post('/toj/php/notice.php',{'action':'get','data':JSON.stringify({'nid':enid,'count':10})},
	    function(res){
		var i;

		var reto;
		var noticeo;
		var j_item;

		if(res[0] != 'E'){
		    reto = JSON.parse(res);
		    for(i = reto.length - 1;i >= 0;i--){
			noticeo = JSON.parse(reto[i].txt);
			j_item = listnew(noticeo);
			j_list.append(j_item);
			j_item.find('a.item').stop().animate({left:0},'slow','easeOutQuart');
		    }

		    enid = 0;
		}
	    }
	);
    };
    var refresh = function(){
	$.post('/toj/php/notice.php',{'action':'count','data':JSON.stringify({})},
	    function(res){
		var count;
		var j_notice;

		if(res[0] != 'E'){
		    count = JSON.parse(res);
		    j_notice = $('#index_head_notice');
		    if(count == 0){
			j_notice.removeClass('notice_h');
			j_notice.text('[' + count + ']');
		    }else{
			if($('#notice_list_box').css('opacity') == 1){
			    updatenew();
			}else{
			    j_notice.addClass('notice_h');
			    j_notice.text('[' + count + ']');
			}
		    }
		    
		    setTimeout(refresh,2000);
		}
	    }
	);
    };

    that.init = function(){
	$(window).on('click',function(e){
	    var j_notice;

	    if(e.target == null || ($(e.target).parents('a.item').length == 0 && $(e.target).parents('#notice_list_box').length > 0)){
		return;
	    }

	    j_notice = $('#index_head_notice');
	    if(e.target.id == 'index_head_notice' && !j_notice.hasClass('notice_s')){
		that.show();
	    }else if(j_notice.hasClass('notice_s')){
		that.hide();
	    }
	});
	$('#index_head_notice').on('click',function(e){
	    var j_list;

	    j_list = $('#notice_list');
	    if($('#notice_list_box').css('opacity') == 0){
		j_list.empty();
		enid = null;
		updatenew(); 
	    }
	}).on('mousedown',function(e){
	    return false;
	});

	refresh();
    };
    that.show = function(){
	index.page_scroll_lock();

	$('#index_head_notice').addClass('notice_s');
	$('#notice_list_box').stop().css('opacity','1').animate({width:322},'slow','easeOutExpo');
	$('#notice_list a.item').stop().animate({left:0},'slow','easeOutQuart');
    };
    that.hide = function(){
	$('#index_head_notice').removeClass('notice_s');
	$('#notice_list_box').stop().animate({opacity:0},'fast','easeOutQuad',
	    function(){
		$('#notice_list_box').css('width','0px');
		$('#notice_list a.item').css('left','50%');

		index.page_scroll_unlock();
	    }
	);
    };
};
