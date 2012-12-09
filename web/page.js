var page_name_select;
var page_name_previous;

function page_init(){
    page_name_select = 'home';
    page_name_previous = 'home';
}
function page_switch(page_name){
    var j_bar_button;
    var show = function(){
	page_name_previous = page_name_select;
	page_name_select = page_name;

	document.title = page_name + '-ExpOJ';

	if(page_name_previous == 'status'){
	    status_pageswitch(false);
	}else if(page_name_previous.match(/^square_.+/) != null){
	    square_pageswitch(page_name_previous,false);
	}else if(page_name_previous.match(/^problem_.+/) != null){
	    problem_pageswitch(page_name_previous,false);
	}else if(page_name.match(/^user_.+/) != null){
	    user_pageswitch(page_name,false);
	}

	if(page_name == 'home'){
	    $('#index_head_title').text('Experiment OnlineJudge');
	    $('#page_home').fadeIn('fast');
	}else if(page_name == 'status'){
	    status_pageswitch(true);
	}else if(page_name == 'squaremg'){
	    squaremg_pageswitch(true);
	}else if(page_name.match(/^square_.+/) != null){
	    square_pageswitch(page_name,true);
	}else if(page_name.match(/^problem_.+/) != null){
	    problem_pageswitch(page_name,true);
	}else if(page_name.match(/^user_.+/) != null){
	    user_pageswitch(page_name,true);
	}else if(page_name == 'login'){
	    user_login_pageswitch();
	}else if(page_name == 'register'){
	    user_register_pageswitch();
	}else{
	    page_name = 'home';
	    page_name_select = page_name_previous;
	    window.history.replaceState(page_name,document.title,'/expoj/index.html?page=home');

	    show();
	}
    }

    if(page_name == null){
	page_name = nor_getparam().page;
	if(page_name == undefined){
	    page_name = 'home';
	    window.history.replaceState(page_name,document.title,'/expoj/index.html?page=home');
	}
    }else{
	if(page_name == page_name_select){
	    return -1;
	}
	window.history.pushState(page_name,document.title,'/expoj/index.html?page=' + page_name);
    }

    $('#index_head_tab').find('div.nor_tab').hide();
    $('#index_head_content').empty();

    if(page_name_select != null){
	$('#page_' + page_name_select).fadeOut('fast',show);
    }else{
	show();
    }

    return 0;
}
function page_maskswitch(j_div,on){
    var i;

    var j_mask;

    j_mask = $('#index_mask');
    j_mask.children('div').hide();

    if(on == true){
	j_div.show();
	j_mask.fadeIn('fast');
    }else{
	j_div.hide();
	j_mask.fadeOut('fast');
    }
}
