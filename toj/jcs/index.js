var index = {
    init:function(){
	$('body').on('mouseover',function(e){
	    var j_panel;

	    if(e.target == null || e.target.id == 'index_panel' || $(e.target).parents('#index_panel').length > 0){
		return;
	    }

	    j_panel = $('#index_head_panel');
	    if(e.target.id == 'index_head_panel'){
		$('#index_head_notice').removeClass('notice_s');
		$('#notice_list').stop().animate({opacity:0},'fast','easeOutQuad',
		    function(){
			$('#notice_list_box').css('width','0px');
			$('#notice_list').css('right','-256px');
			$('#notice_list a.item').css('left','50%');
		    }
		);

		j_panel.addClass('panel_m');
		$('#index_panel_box').stop().animate({width:256},'slow','easeOutExpo');
		$('#index_panel').css('opacity','1').stop().animate({right:0},'slow','easeOutExpo');
		$('#index_panel a.button').stop().animate({left:0},'slow','easeOutQuart');
	    }else{
		$('#index_head_panel').removeClass('panel_m');
		$('#index_panel').stop().animate({opacity:0},'fast','easeOutQuad',
		    function(){
			$('#index_panel_box').css('width','0px');
			$('#index_panel').css('right','-256px');
			$('#index_panel a.button').css('left','50%');
		    }
		);
	    }
	});
	$('#index_head_panel').on('mousedown',function(e){
	    return false;
	});

	$('#index_panel > li').on('mousedown',function(e){
	    return false;
	});

	$('#index_panel > [page="square"] > a.button').off('click').on('click',function(e){
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
	    if((e.target == this || $(e.target).parents('div.common_mask_box').length == 0) && !$(e.target).hasClass('common_mask_box') && common.mbox_curr != null){
		common.hidembox(false);
	    }
	});
    },

    showpanel:function(pagename){
	$('#index_panel > [page="' + pagename + '"]').show();
    },
    hidepanel:function(pagename){
	$('#index_panel > [page="' + pagename + '"]').hide();
    },
    setpanel:function(pagename,panellink,paneltext){
	var j_a;
	
	j_a = $('#index_panel > [page="' + pagename + '"] > a.button');
	j_a.attr('href',panellink);
	j_a.text(paneltext);
    },

    settitle:function(titletext){
	$('#index_head > div.title').text(titletext);
    },

    addtab:function(tabname,tablink,tabtext){
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
    },
    settab:function(tabname,tablink,tabtext){
	var j_a;

	j_a = $('#index_head > div.tab_box [tab="' + tabname + '"] > a.button');
	j_a.attr('href',tablink);
	j_a.text(tabtext);
    },
    emptytab:function(){
	$('#index_head > div.tab_box').empty();
    },
    hltab:function(tabname){
	$('#index_head > div.tab_box > [tab="' + tabname + '"]').addClass('button_s');
    },
    lltab:function(tabname){
	$('#index_head > div.tab_box > [tab="' + tabname + '"]').removeClass('button_s');
    },

    setcontent:function(j_content){
	$('#index_head > div.content_box').append(j_content);
    },
    emptycontent:function(){
	$('#index_head > div.content_box').empty();
    },

    showmask:function(){
	$('#index_mask').stop().fadeIn('fast');
    },
    hidemask:function(){
	$('#index_mask').stop().hide();
    }
};
