var index = new function(){
    var that = this;
    var page_scroll_ref = 0;
    var page_scroll_top = 0;

    that.init = function(){
	$(window).on('mouseover',function(e){
	    var j_panel;

	    if(e.target == null || e.target.id == 'index_panel_box' || $(e.target).parents('#index_panel_box').length > 0){
		return;
	    }

	    j_panel = $('#index_head_panel');
	    if(e.target.id == 'index_head_panel'){

		if($('#index_head_notice').hasClass('notice_s')){
		    notice.hide();
		}

		if(!j_panel.hasClass('panel_m')){
		    that.page_scroll_lock();

		    j_panel.addClass('panel_m');
		    $('#index_panel_box').stop().css('opacity','1').animate({width:240},'slow','easeOutExpo');
		    $('#index_panel a.button').stop().animate({left:0},'slow','easeOutQuart');
		}
	    }else{
		if(j_panel.hasClass('panel_m')){
		    j_panel.removeClass('panel_m');
		    $('#index_panel_box').stop().animate({opacity:0},'fast','easeOutQuad',
			function(){
			    $('#index_panel_box').css('width','0px');
			    $('#index_panel a.button').css('left','50%');

			    that.page_scroll_unlock();
			}
		    );
		}
	    }
	});
	$('#index_head_panel').on('mousedown',function(e){
	    return false;
	});

	$('#index_panel > li').on('mousedown',function(e){
	    return false;
	});

	$('#index_panel > li.square > a.button').off('click').on('click',function(e){
	    var j_ul;
	
	    j_ul = $('#index_panel > ul.square_box');
	    if(j_ul.is(':visible')){
		j_ul.stop().slideUp('slow','easeOutExpo');
	    }else{
		j_ul.stop().slideDown('slow','easeOutExpo');
	    }

	    return false;
	});

	$('#index_mask').on('click',function(e){
	    if((e.target == this || e.target.parentNode == this) && $(this).hasClass('index_mask')){
		com.url_pull();
	    }
	});
	$('#index_mask > button.close').on('click',function(e){
	    com.url_pull();
	});
    };

    that.panel_show = function(name){
	$('#index_panel > .' + name).show();
    };
    that.panel_hide = function(name){
	$('#index_panel > .' + name).hide();
    };
    that.panel_set = function(name,panellink,paneltext){
	var j_a;
	
	j_a = $('#index_panel > .' + name + ' > a.button');
	j_a.attr('href',panellink);
	j_a.text(paneltext);
    };

    that.title_set = function(titletext){
	$('#index_head > div.title').text(titletext);
    };

    that.tab_add = function(tabname,tablink,tabtext){
	var j_div;
	var j_a;

	j_div = $('<div class="button"></div>');	
	j_div.attr('tab',tabname);

	j_a = $('<a class="button"></a>');
	j_a.attr('href',tablink);
	j_a.text(tabtext);

	j_div.append(j_a);
	$('#index_head > div.tab_box').append(j_div);

	return j_div;
    };
    that.tab_set = function(tabname,tablink,tabtext){
	var j_a;

	j_a = $('#index_head > div.tab_box [tab="' + tabname + '"] > a.button');
	j_a.attr('href',tablink);
	j_a.text(tabtext);
    };
    that.tab_empty = function(){
	$('#index_head > div.tab_box').empty();
    };
    that.tab_hl = function(tabname){
	$('#index_head > div.tab_box > [tab="' + tabname + '"]').addClass('button_s');
    };
    that.tab_ll = function(tabname){
	$('#index_head > div.tab_box > [tab="' + tabname + '"]').removeClass('button_s');
    };

    that.content_set = function(j_content){
	$('#index_head > div.content_box').append(j_content);
    };
    that.content_empty = function(){
	$('#index_head > div.content_box').empty();
    };

    that.page_scroll_lock = function(){
	var j_index;

	console.log('lock');
	if(page_scroll_ref == 0){
	    j_index = $('#index_page');

	    page_scroll_top = $(window).scrollTop();
	    off = -page_scroll_top + 32;
	    j_index.css('position','fixed');
	    j_index.css('top',off + 'px');
	}
	page_scroll_ref++;
    };
    that.page_scroll_unlock = function(){
	var j_index;

	console.log('unlock');
	page_scroll_ref--;
	if(page_scroll_ref == 0){
	    j_index = $('#index_page');

	    j_index.css('position','absolute');
	    j_index.css('top','32px');
	    $(window).scrollTop(page_scroll_top);
	}
    };
    that.page_scroll_reset = function(){
	var j_index;

	console.log('reset');
	if(page_scroll_ref > 0){
	    j_index = $('#index_page');
	    if(j_index.css('position') == 'fixed'){
		page_scroll_top = 0;
		j_index.css('top','32px');
	    }
	}
    };

    that.mask_show = function(){
	var j_mask;
	var off;

	j_mask = $('#index_mask');
	j_mask.stop().fadeIn('fast');
	if(j_mask.hasClass('index_mask')){
	    that.page_scroll_lock();	
	}
    };
    that.mask_hide = function(){
	var j_mask;
	var j_index;

	j_mask = $('#index_mask');
	j_mask.stop().hide();
	if(j_mask.hasClass('index_mask')){
	    that.page_scroll_unlock();	
	}
    };
};
