var user_usero;
var user_logincallback;

function user_init(){
    user_logincallback = $.Callbacks();

    $('#login_username').on('keypress',function(e){
	if(e.which == 13){
	    user_login_submit();
	}
    });
    $('#login_password').on('keypress',function(e){
	if(e.which == 13){
	    user_login_submit();
	}
    });
    
    $('#register_username').on('keypress',function(e){
	if(e.which == 13){
	    user_register_submit();
	}
    });
    $('#register_password').on('keypress',function(e){
	if(e.which == 13){
	    user_register_submit();
	}
    });
    $('#register_nickname').on('keypress',function(e){
	if(e.which == 13){
	    user_register_submit();
	}
    });

    $('#index_panel > [page="logout"]').off('click').on('click',user_logout);
}
function user_loginchange(){
    var cookie;
    var j_div;

    cookie = nor_getcookie();
    if(cookie['userid'] != undefined){
	user_update(cookie['userid'],true);
    }else{
	user_usero = null;
	user_panelswitch(false);
	user_logincallback.fire();
    }
}
function user_update(userid,login){
    $.ajax({
	url:'user_get.php',
	type:'POST',
	data:{'userid':parseInt(userid)},
	async:false,
	success:function(res){
	    var i;

	    var reto;
	    var usero;
	    var prolist;
	    var tds;

	    var j_div;
	    var proo;
	    var j_span;
	    var j_a;
	    var color;

	    if(res[0] != 'E'){
		reto = JSON.parse(res);
		usero = reto.userinfo;
		prolist = reto.prolist;

		$('#user_info > div.head > input.name').val(usero.nickname);
		$('#user_info > div.head > input.aboutme').val(usero.aboutme);
		$('#user_info > div.head > input.headimg').val(usero.headimg);
		$('#user_info > div.head > img.headimg').attr('src',usero.headimg);

		tds = $('#user_info > table.info td.info');
		$(tds[1]).text(usero.acceptcount);
		$(tds[3]).text(usero.submitcount);
		$(tds[5]).text(usero.trycount);

		j_div = $($('#user_data > div.prolist')[0]);
		j_div.empty();
		for(i = 0;i < prolist.length;i++){
		    proo = prolist[i];

		    j_span = $('<span class="item"></span');
		    j_span.on('click',function(proid){return function(e){	
			page_switch('problem_' + proid);
			return false;
		    }}(proo.proid));

		    j_a = $('<a class="item"></a>');
		    j_a.attr('href','/expoj/index.html?page=problem_' + proo.proid);
		    j_a.text(proo.proid);

		    switch(nor_scoretolight(parseInt(proo.rate),100)){
			case 0:
			    color = '#333333';
			case 1:
			    color = '#FF0000'; 
			    break;
			case 2:
			    color = '#00FF00'; 
			    break;
			case 3:
			    color = '#FFFF00'; 
			    break;
			case 4:
			    color = '#FFFFFF';
			    break;
		    }
		    j_a.css('color',color);

		    j_span.append(j_a);
		    j_div.append(j_span);
		}

		if(login){
		    user_usero = usero;
		    user_panelswitch(true);
		    user_logincallback.fire();
		}
	    }else if(login){
		user_usero = null;
		user_panelswitch(false);
		user_logincallback.fire();
	    }
	}
    });
}

function user_panelswitch(on){
    var j_div;

    if(on){
	j_div = $('#index_panel > [page="user"]');
	j_div.attr('page','user_' + user_usero.userid);
	$(j_div.find('a.button')[0]).attr('href','/expoj/index.html?page=user_' + user_usero.userid);
	j_div.show();
	$('#index_panel > [page="login"]').hide();
	$('#index_panel > [page="register"]').hide();
	$('#index_panel > [page="logout"]').show();
    }else{
	j_div = $('#index_panel > [page^="user"]');
	j_div.attr('page','user');
	$(j_div.find('a.button')[0]).attr('href',null);
	j_div.hide();
	$('#index_panel > [page="login"]').show();
	$('#index_panel > [page="register"]').show();
	$('#index_panel > [page="logout"]').hide();
    }
}
function user_pageswitch(pagename,on){
    var userid;
    var j_page;

    if(on){
	userid = pagename.match(/^user_(.+)/)[1];

	$('#index_head_title').text('ExpOJ-UID:' + userid);

	user_update(userid,false);

	if(user_usero != null && userid == user_usero.userid){
	    $('#user_info > div.head > div.setting').show();
	}else{
	    $('#user_info > div.head > div.setting').hide();
	}

	j_page = $('[id^="page_user"]');
	j_page.attr('id','page_user_' + userid);
	j_page.fadeIn('slow');
    }else{
	$('[id^="page_user"]').attr('id','page_user');
    }
}
function user_infoedit(on){
    var divs;
    var inputs;

    divs = $('#user_info > div.head > div.setting > div.nor_button');
    inputs = $('#user_info > div.head > input');
    if(on){
	$(divs[0]).hide();
	$(divs[1]).show();
	$(divs[2]).show();
	$('#user_info > div.head > input.headimg').show();
	inputs.attr('readonly',null);
	inputs.css('background-color','#333333');
    }else{
	$(divs[0]).show();
	$(divs[1]).hide();
	$(divs[2]).hide();
	$('#user_info > div.head > input.headimg').hide();
	inputs.attr('readonly','readonly');
	inputs.css('background-color','transparent');

	user_update(user_usero.userid,false);
    }
}
function user_infosubmit(){
    var inputs;
    inputs = $('#user_info > div.head > input');
    $.post('user_set.php',
	    {
		'type':'userinfo',
		'nickname':$('#user_info > div.head > input.name').val(),
		'aboutme':$('#user_info > div.head > input.aboutme').val(),
		'headimg':$('#user_info > div.head > input.headimg').val()
	    },
	    function(res){
		user_infoedit(false);
	    }
    );
}

function user_login_pageswitch(){
    $('#index_head_title').text('ExpOJ-Login');

    user_login_reset();
    $('#page_login').fadeIn('fast',function(){
	$('#login_username').focus();
    });
}
function user_login_reset(){
    $('#login_error').html('');
    $('#login_username').val('');
    $('#login_password').val('');
}
function user_login_submit(){
    $.post('user_login.php',
	    {'username':$('#login_username').val(),'password':$('#login_password').val()},
	    function(res){
		if(res[0] == 'S'){
		    user_login_reset();
		    user_loginchange();
		    if(page_name_previous == 'login' || page_name_previous == 'register'){
			page_switch('home');
		    }else{
			page_switch(page_name_previous);
		    }
		}else if(res == 'Eerror'){
		    $('#login_error').html('使用者名稱或密碼錯誤');
		}else{
		    $('#login_error').html('Oops');
		}
	    }
    );
}

function user_register_pageswitch(){
    $('#index_head_title').text('ExpOJ-Register');

    user_register_reset();
    $('#page_register').fadeIn('fast',function(){
	$('#register_username').focus();
    });
}
function user_register_reset(){
    $('#register_error').html('');
    $('#register_username').val('');
    $('#register_password').val('');
    $('#register_nickname').val('');
}
function user_register_submit(){
    $.post('user_register.php',
	    {'username':$('#register_username').val(),'password':$('#register_password').val(),'nickname':$('#register_nickname').val()},
	    function(res){
		if(res[0] == 'S'){
		    user_register_reset();
		    user_loginchange();
		    if(page_name_previous == 'login' || page_name_previous == 'register'){
			page_switch('home');
		    }else{
			page_switch(page_name_previous);
		    }
		}else if(res == 'Eusername'){
		    $('#register_error').html('使用者名稱不可為空或有非法字元<br/>最長16 Bytes');
		}else if(res == 'Epassword'){
		    $('#register_error').html('<br/>密碼不可為空,最長128 Bytes');
		}else if(res == 'Enickname'){
		    $('#register_error').html('暱稱不可為空或有非法字元<br/>最長16 Bytes');
		}else if(res == 'Eexist'){
		    $('#register_error').html('使用者名稱已存在');
		}else{
		    $('#register_error').html('Oops');
		}
	    }
    ); 
}

function user_logout(){
    var cookie;
    var key;
    
    cookie = nor_getcookie();
    for(key in cookie){
	document.cookie = key + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }

    location.href = '/expoj/index.html?page=home';
}
