/*
square state
0 => wait
1 => run
2 => past
*/

var user = new function(){
    var that = this;
    var main_pbox = null;
    var edit_pbox = null;
    var mgsq_pbox = null;
    var mg_pbox = null;
    var uid_node = null;
    
    that.login_chg = $.Callbacks();
    that.data_chg = $.Callbacks();

    that.uid = null;
    that.level = null;
    that.username = null;
    that.nickname = null;
    that.avatar = null;
    that.aboutme = null;
    that.email = null;
    that.sq_inlist = null;

    that.view_uid = null;

    that.init = function(){
	that.login_pbox = new class_login_pbox;
	that.register_pbox = new class_register_pbox;

	main_pbox = new class_user_main_pbox;
	edit_pbox = new class_user_edit_pbox;
	mgsq_pbox = new class_user_mgsq_pbox;
	mg_pbox = new class_user_mg_pbox;
	that.editsq_mbox = new class_user_editsq_mbox;
	that.editpro_mbox = new class_user_editpro_mbox;

	that.user_node = new vus.node('user');

	uid_node = new vus.node('');
	uid_node.child_set(main_pbox.node);
	uid_node.child_set(edit_pbox.node);
	uid_node.child_set(mgsq_pbox.node);
	uid_node.child_set(mg_pbox.node);

	that.user_node.url_chg = function(direct,url_upart,url_dpart){
	    var uid;

	    if(direct == 'in' || direct == 'same'){
		index.title_set('TOJ-使用者');

		if((uid = url_dpart[0]) == ''){
		    com.url_update('/toj/none/');
		    return 'stop';
		}
		uid = parseInt(uid);
		if(uid == that.view_uid){
		    return 'cont';
		}

		if(uid != null){
		    that.user_node.child_del(uid_node);	
		    index.tab_empty();
		}

		uid_node.name = uid.toString();
		that.user_node.child_set(uid_node);	

		if(url_dpart[1] == undefined){
		    com.url_update('/toj/user/' + uid + '/main/');	
		    return 'stop';
		}

		that.view_uid = uid;
		
		index.tab_add('main','/toj/user/' + that.view_uid + '/main/','個人');
		if(that.view_uid == that.uid){
		    index.tab_add('edit','/toj/user/' + that.uid + '/edit/','設定');
		    index.tab_add('mgsq','/toj/user/' + that.uid + '/mgsq/','方塊');
		    if((user.level & USER_LEVEL_SUPERADMIN) == USER_LEVEL_SUPERADMIN){
			index.tab_add('mg','/toj/user/' + that.uid + '/mg/','管理');
		    }
		}
	    }else if(direct == 'out'){
		if(that.view_uid != null){
		    that.user_node.child_del(uid_node);	
		}
		that.view_uid = null;
		
		index.tab_empty();
	    }

	    return 'cont';
	};
	com.vus_root.child_set(that.user_node);	

	$('#index_panel > li.logout > a.button').off('click').on('click',function(e){
	    var cookie;
	    var key;
    
	    cookie = com.get_cookie();
	    for(key in cookie){
		document.cookie = key + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/toj/';
	    }

	    location.href = '/toj/home/';
	    return false;
	});
	that.login_chg.add(function(login){
	    var j_notice;
	    var j_nickname;

	    j_notice = $('#index_head_notice');
	    j_nickname = $('#index_head_nickname > a.nickname');
	    
	    if(login){
		j_notice.show();
		j_nickname.attr('href','/toj/user/' + that.uid + '/main/');
		j_nickname.text(that.nickname);

		index.panel_hide('login');
		index.panel_hide('register');
		index.panel_show('logout');
		index.panel_set('user','/toj/user/' + that.uid + '/main/','個人');
		index.panel_show('user');
	    }else{
		j_notice.hide();
		j_nickname.attr('href','');
		j_nickname.text('');

		index.panel_show('login');
		index.panel_show('register');
		index.panel_hide('logout');
		index.panel_set('user',null,'個人');
		index.panel_hide('user');
	    }
	});
	that.data_chg.add(function(){
	    var i;
	    var j_ul;
	    var j_li;
	    var sqo;
	    var panelsq_listadd = function(j_ul,idx,sqid,sqname){
		var j_li;
		var j_a;

		j_li = $(j_ul.find('li.button')[idx]);
		if(j_li.length == 0){
		    j_li = $('<li class="button"><a class="button"></a></li>');
		    j_li.hide();
		    j_ul.append(j_li);
		}

		j_a = j_li.find('a.button');
		j_a.attr('href','/toj/sq/' + sqid + '/pro/');
		j_a.text(sqname);

		j_li.show();
	    };

	    $('#index_head_nickname > a.nickname').text(that.nickname);

	    j_ul = $('#index_panel > ul.square_box');
	    j_ul.find('li.button').hide();
	    for(i = 0;i < user.sq_inlist.length;i++){
		sqo = user.sq_inlist[i];
		if(sqo.relationship != 1){
		    panelsq_listadd(j_ul,i,sqo.sqid,sqo.sqname);
		}
	    }
	});

	user.update(true);
    };
    that.update = function(sync){
	$.ajax({'url':'/toj/php/user.php',
	    'type':'POST',
	    'data':{'action':'view','data':JSON.stringify({'uid':null})},
	    'async':!sync,
	    'success':function(res){
		var reto;
		var old_uid;

		old_uid = that.uid;
		if(res[0] == 'E'){
		    that.uid = null;
		    that.level = null;
		    that.username = null;
		    that.nickname = null;
		    that.avatar = null;
		    that.aboutme = null;
		    that.email = null;
		    that.sq_inlist = null;
		    
		    that.login_chg.fire(false);
		}else{
		    reto = JSON.parse(res);    
		    that.uid = reto.uid;
		    that.level = reto.level;
		    that.username = reto.username;
		    that.nickname = reto.nickname;
		    that.avatar = reto.avatar;
		    that.aboutme = reto.aboutme;
		    that.email = reto.email;

		    if(old_uid != that.uid){
			that.login_chg.fire(true);
		    }

		    $.post('/toj/php/square.php',{'action':'get_entered_sq','data':JSON.stringify({'uid':that.uid})},function(res){
			var i;
			var reto;
			var ts;
			var sqlist;
			var sqo;

			if(res[0] == 'E'){
			    return;
			}

			reto = JSON.parse(res);
			ts = com.get_date(reto.timestamp);
			sqlist = reto.list;
			for(i = 0;i < sqlist.length;i++){
			    sqo = sqlist[i];
			    sqo.state = 1;
			    if(sqo.start_time != null){
				sqo.start_time = com.get_date(sqo.start_time);
				if(ts < sqo.start_time){
				    sqo.state = 0;
				}
			    }
			    if(sqo.end_time != null){
				sqo.end_time = com.get_date(sqo.end_time);
				if(sqo.end_time < ts){
				    sqo.state = 2;
				}
			    }
			}
			user.sq_inlist = sqlist;

			user.data_chg.fire(true);
		    });
		}
	    }
	});
    };
};

var class_user_main_pbox = function(){
    var that = this;
    var j_pbox = $('#index_page > div.user_page > div.main_pbox');

    that.node = new vus.node('main');

    that.__super();

    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    index.tab_hl('main');
	    that.fadein(j_pbox);

	    $.post('/toj/php/user.php',{'action':'view','data':JSON.stringify({'uid':user.view_uid})},function(res){
		var reto;

		if(res[0] == 'E'){
		    com.url_update('/toj/none/');
		}else{
		    reto = JSON.parse(res);
		    if(reto.avatar == ''){
			j_pbox.find('div.info_box > img.avatar').attr('src','http://i.imgur.com/ykkQD.png');
		    }else{
			j_pbox.find('div.info_box > img.avatar').attr('src',reto.avatar);
		    }
		    j_pbox.find('div.info_box > div.aboutme').text(reto.aboutme);

		}
	    });
	}else if(direct == 'out'){
	    index.tab_ll('main');
	    that.fadeout(j_pbox);
	}
    };
}; __extend(class_user_main_pbox,class_com_pbox);

var class_user_edit_pbox = function(){
    var that = this;
    var j_pbox = $('#index_page > div.user_page > div.edit_pbox');

    that.node = new vus.node('edit');

    that.__super();

    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    index.tab_hl('edit');
	    that.fadein(j_pbox);

	    j_pbox.find('div.edit_box > [name="nickname"]').val(user.nickname);
	    j_pbox.find('div.edit_box > [name="avatar"]').val(user.avatar);
	    if(user.avatar == ''){
		j_pbox.find('div.edit_box > img.avatar').attr('src','http://i.imgur.com/ykkQD.png');
	    }else{
		j_pbox.find('div.edit_box > img.avatar').attr('src',user.avatar);
	    }
	    j_pbox.find('div.edit_box > [name="aboutme"]').val(user.aboutme);
	    j_pbox.find('div.edit_box > [name="email"]').val(user.email);
	}else if(direct == 'out'){
	    index.tab_ll('edit');
	    that.fadeout(j_pbox);

	    j_pbox.find('div.edit_box > input').val('');
	    j_pbox.find('div.edit_box > img.avatar').attr('src',null);
	    j_pbox.find('div.edit_box > div.error').text('');
	}
    };

    j_pbox.find('div.edit_box > [name="avatar"]').change(function(e){
	var avatar;

	avatar = $(this).val();
	if(avatar == ''){
	    j_pbox.find('div.edit_box > img.avatar').attr('src','http://i.imgur.com/ykkQD.png');
	}else{
	    j_pbox.find('div.edit_box > img.avatar').attr('src',avatar);
	}('test')
    });
    j_pbox.find('div.edit_box > button.submit').click(function(e){
	var j_error;
	var nickname;
	var avatar;
	var aboutme;
	var email;
	var password_old;
	var password_new;
	var password_repeat;
	var data;
	
	j_error = j_pbox.find('div.edit_box > div.error');
	nickname = j_pbox.find('div.edit_box > [name="nickname"]').val();
	avatar = j_pbox.find('div.edit_box > [name="avatar"]').val();
	aboutme = j_pbox.find('div.edit_box > [name="aboutme"]').val();
	email = j_pbox.find('div.edit_box > [name="email"]').val();
	password_old = j_pbox.find('div.edit_box > [name="password_old"]').val();
	password_new = j_pbox.find('div.edit_box > [name="password_new"]').val();
	password_repeat = j_pbox.find('div.edit_box > [name="password_repeat"]').val();

	data = {'nickname':nickname,'avatar':avatar,'aboutme':aboutme,'email':email};
	if(password_old != '' || password_new != '' || password_repeat != ''){
	    if(password_new != password_repeat){
		j_error.text('使用者密碼不相同');
		return;
	    }
	    data.oldpw = password_old;
	    data.password = password_new;
	}

	$.post('/toj/php/user.php',{'action':'update','data':JSON.stringify(data)},function(res){
	    if(res[0] == 'E'){
		switch(res){
		    case 'Epassword_too_short':
			j_error.text('使用者密碼太短');
			break;
		    case 'Epassword_too_long':
			j_error.text('使用者密碼太長');
			break;
		    case 'Enickname_too_short':
			j_error.text('暱稱太短');
			break;
		    case 'Enickname_too_long':
			j_error.text('暱稱太長');
			break;
		    case 'Eold_password_not_match':
			j_error.text('舊使用者密碼錯誤');
			break;
		    case 'Eempty_email':
			j_error.text('電子郵件不能爲空');
			break;
		    case 'Eemail_too_long':
			j_error.text('電子郵件太長');
			break;
		    default:
			j_error.text('更新錯誤');
			break;
		}
	    }else{
		user.update(true);
		com.url_push('/toj/user/' + user.uid + '/main/');
	    }
	});
    });
    j_pbox.find('div.edit_box > button.cancel').click(function(e){
	com.url_push('/toj/user/' + user.uid + '/main/');
    });
}; __extend(class_user_edit_pbox,class_com_pbox);

var class_user_mgsq_pbox = function(){
    var that = this;
    var j_pbox = $('#index_page > div.user_page > div.mgsq_pbox');

    var sq_join = function(sqid){
	$.post('/toj/php/square.php',{'action':'add_user','data':JSON.stringify({'uid':user.uid,'sqid':sqid})},function(res){
	    if(res[0] != 'E'){
		sq_update();	
	    }
	});
    };
    var sq_quit = function(sqid){
	$.post('/toj/php/square.php',{'action':'delete_user','data':JSON.stringify({'uid':user.uid,'sqid':sqid})},function(res){
	    if(res[0] != 'E'){
		sq_update();	
	    }
	});
    };
    var sq_listset = function(j_item,sqo){
	var j_info;
	var j_data;
	var j_button;

	j_info = j_item.find('div.info');
	j_data = j_item.find('div.data');
	j_data.empty();

	j_item.attr('sqid',sqo.sqid);

	j_info.find('span.name').text(sqo.sqname);
	
	if(sqo.end_time == null){
	    j_info.find('span.time').text('');
	}else{
	    j_info.find('span.time').text(com.get_datestring(sqo.start_time,false) + ' > ' + com.get_datestring(sqo.end_time,false));
	}

	if(sqo.relationship == 3 || (user.level & USER_LEVEL_SUPERADMIN) == USER_LEVEL_SUPERADMIN){
	    j_button = $('<button style="margin:0px 6px 0px 0px;">管理</button>');
	    j_button.on('click',function(e){
		user.editsq_mbox.init('edit',sqo).done(sq_update);
		com.url_push('/toj/m/user_editsq/');
		return false;
	    });
	    j_data.append(j_button);
	}

	j_button = $('<button style="margin:0px 6px 0px 0px;"></button>');
	if(sqo.relationship == 0){
	    if(sqo.publicity == 2 && (user.level & USER_LEVEL_SUPERADMIN) != USER_LEVEL_SUPERADMIN){
		j_button.text('申請');
	    }else{
		j_button.text('加入');
	    }
	    j_button.off('click').on('click',function(e){
		sq_join(sqo.sqid);	
		return false;
	    });
	}else{
	    if(sqo.relationship == 1){
		j_button.text('取消申請');
	    }else{
		j_button.text('退出');
	    }
	    j_button.on('click',function(e){
		sq_quit(sqo.sqid);
		return false;
	    });
	}
	j_data.append(j_button);

	if(sqo.relationship >= 2){
	    j_button = $('<button>開啟</button>');
	    j_button.on('click',function(e){
		com.url_push('/toj/sq/' + sqo.sqid + '/pro/');
		return false;
	    });
	    j_data.append(j_button);
	}

	j_item.off('click').on('click',function(e){
	    if(j_data.is(':visible')){
		j_item.removeClass('item_s');
		j_data.stop().fadeTo(100,0).slideUp('fast');
	    }else{
		j_item.addClass('item_s');
		j_data.stop().css('opacity',1).slideDown('fast');
	    }
	});
    };
    var sq_listnew = function(sqo){
	var j_item;
	var j_info;
	var j_data;
	
	j_item = $('<div class="item"></div>');
	j_info = $('<div class="info"><span class="name"></span><span class="time"></span></div>');
	j_item.append(j_info);
	j_data = $('<div class="data"></div>');
	j_item.append(j_data);

	sq_listset(j_item,sqo);

	return j_item;
    };
    var sq_update = function(){
	var _updatelist = function(j_list,sqlist){
	    var i;
	    var j;

	    var j_divs;
	    var j_last;
	    var j_item;
	    var oldhash;

	    j_divs = j_list.children('div.item');
	    oldhash = new Array();
	    for(i = 0;i < j_divs.length;i++){
		oldhash[$(j_divs[i]).attr('sqid')] = i;
	    }

	    j = 0;
	    j_last = null;
	    for(i = 0;i < sqlist.length;i++){
		sqo = sqlist[i];
		if(sqo.sqid in oldhash){
		    for(;j < oldhash[sqo.sqid];j++){
			j_item = $(j_divs[j]);
			j_item.stop().fadeTo(100,0).slideUp('fast',function(){$(this).remove();});
		    }
		    j_item = $(j_divs[j]);
		    j++;

		    sq_listset(j_item,sqo);
		    j_last = j_item;
		}else{
		    j_item = sq_listnew(sqo);
		    j_item.hide();
		    if(j_last == null){
			j_list.prepend(j_item);
			j_item.css('opacity',0).slideDown('fast').fadeTo(100,1);
		    }else{
			j_item.insertAfter(j_last);
			j_item.css('opacity',0).slideDown('fast').fadeTo(100,1);
		    }
		    j_last = j_item;
		}
	    }
	    for(;j < j_divs.length;j++){
		j_item = $(j_divs[j]);
		j_item.stop().fadeTo(100,0).slideUp('fast',function(){$(this).remove();});
	    }
	};

	user.data_chg.add(function(){
	    var i;
	    var sqo;
	    var sqwait;
	    var sqrun;
	    var sqpast;

	    var j_wait;
	    var j_run;
	    var j_past;

	    user.data_chg.remove(arguments.callee);

	    sqwait = new Array();
	    sqrun = new Array();
	    sqpast = new Array();
	    for(i = 0;i < user.sq_inlist.length;i++){
		sqo = user.sq_inlist[i];
		switch(sqo.state){
		    case 0:
			sqwait.push(sqo);
			break;
		    case 1:
			sqrun.push(sqo);
			break;
		    case 2:
			sqpast.push(sqo);
			break;
		};
	    }

	    j_wait = j_pbox.find('div.in_box > div.wait');
	    j_run = j_pbox.find('div.in_box > div.run');
	    j_past = j_pbox.find('div.in_box > div.past');

	    _updatelist(j_wait,sqwait);
	    _updatelist(j_run,sqrun);
	    _updatelist(j_past,sqpast);
	});
	user.update(false);

	$.post('/toj/php/square.php',{'action':'get_available_sq','data':null},function(res){
	    var i;
	    var reto;
	    var ts;
	    var sqlist;
	    var sqo;
	    var sqwait;
	    var sqrun;
	    var sqpast;

	    var j_wait;
	    var j_run;
	    var j_past;

	    if(res[0] == 'E'){
		return;
	    }

	    reto = JSON.parse(res);
	    ts = com.get_date(reto.timestamp);
	    sqlist = reto.list;
	    sqwait = new Array();
	    sqrun = new Array();
	    sqpast = new Array();
	    for(i = 0;i < sqlist.length;i++){
		sqo = sqlist[i];
		sqo.relationship = 0;
		sqo.state = 1;
		if(sqo.start_time != null){
		    sqo.start_time = com.get_date(sqo.start_time);
		    if(ts < sqo.start_time){
			sqo.state = 0;
		    }
		}
		if(sqo.end_time != null){
		    sqo.end_time = com.get_date(sqo.end_time);
		    if(sqo.end_time < ts){
			sqo.state = 2;
		    }
		}

		switch(sqo.state){
		    case 0:
			sqwait.push(sqo);
			break;
		    case 1:
			sqrun.push(sqo);
			break;
		    case 2:
			sqpast.push(sqo);
			break;
		}
	    }

	    j_wait = j_pbox.find('div.out_box > div.wait');
	    j_run = j_pbox.find('div.out_box > div.run');
	    j_past = j_pbox.find('div.out_box > div.past');

	    _updatelist(j_wait,sqwait);
	    _updatelist(j_run,sqrun);
	    _updatelist(j_past,sqpast);
	});
    }

    that.node = new vus.node('mgsq');

    that.__super();

    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    index.tab_hl('mgsq');
	    that.fadein(j_pbox);
	    sq_update();
	}else if(direct == 'out'){
	    index.tab_ll('mgsq');
	    that.fadeout(j_pbox);
	    j_pbox.find('div.in_box > div > div').remove();
	    j_pbox.find('div.out_box > div > div').remove();
	}

	return 'cont';
    };
}; __extend(class_user_mgsq_pbox,class_com_pbox);

var class_user_mg_pbox = function(){
    var that = this;
    var j_pbox = $('#index_page > div.user_page > div.mg_pbox');

    var pro_listset = function(j_item,proo){
	j_item.find('td.proid').text(proo.proid);
	j_item.find('td.name').text(proo.proname);
	j_item.find('td.cacheid').text(proo.cacheid);
    };
    var pro_listnew = function(proo){
	var j_item;

	j_item = $('<tr class="item"><td class="proid"></td><td class="name"></td><td class="cacheid"></td><td><button class="setting" style="display:none;">設置</button></td></tr>');
	j_item.hover(
	    function(){
		$(this).find('button.setting').show();
	    },
	    function(){
		$(this).find('button.setting').hide();
	    }
	);
	j_item.find('button.setting').on('click',function(e){
	    user.editpro_mbox.init('edit',proo).done(function(){
		pro_update();	
	    });
	    com.url_push('/toj/m/user_editpro/');
	});

	pro_listset(j_item,proo);

	return j_item;
    };
    var pro_update = function(){
	$.post('/toj/php/problem.php',{'action':'get_pro_list','data':null},function(res){
	    var i;

	    var reto;
	    var j_table;
	    var j_item;

	    if(res[0] == 'E'){
		return;
	    }

	    reto = JSON.parse(res); 
	    j_table = j_pbox.find('table.prolist');
	    j_table.find('tr.item').remove();
	    for(i = 0;i < reto.length;i++){
		j_item = pro_listnew(reto[i]);
		j_table.append(j_item);
	    }
	});
    };

    that.node = new vus.node('mg');

    that.__super();

    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    index.tab_hl('mg');
	    that.fadein(j_pbox);

	    pro_update();
	}else if(direct == 'out'){
	    index.tab_ll('mg');
	    that.fadeout(j_pbox);
	}

	return 'cont';
    };

    j_pbox.find('button.newsq').on('click',function(e){
	user.editsq_mbox.init('new');
	com.url_push('/toj/m/user_editsq/');
    });
    j_pbox.find('button.newpro').on('click',function(e){
	user.editpro_mbox.init('new').done(function(){
	    pro_update();	
	});
	com.url_push('/toj/m/user_editpro/');
    });
}; __extend(class_user_mg_pbox,class_com_pbox);

var class_user_editsq_mbox = function(){
    var that = this;
    var j_mbox = $('#index_mask > div.user_mask > div.editsq_mbox');
    var action = null;
    var sqid = null;
    var defer = null;

    that.node = new vus.node('user_editsq');

    that.__super();

    that.init = function(act,sqo){
	action = act;
	if(action == 'edit'){
	    sqid = sqo.sqid;

	    j_mbox.find('[name="sqname"]').val(sqo.sqname);
	    j_mbox.find('[name="sqmodname"]').val(sqo.sqmodname);
	    j_mbox.find('[name="publicity"]').val(sqo.publicity);
	    if(sqo.end_time == null){
		j_mbox.find('[name="infinite"]').val(1);
	    }else{
		j_mbox.find('[name="infinite"]').val(2);
		j_mbox.find('div.time').show();
		j_mbox.find('[name="s_year"]').val(sqo.start_time.getFullYear());
		j_mbox.find('[name="s_month"]').val(sqo.start_time.getMonth() + 1);
		j_mbox.find('[name="s_day"]').val(sqo.start_time.getDate());
		j_mbox.find('[name="s_hr"]').val(sqo.start_time.getHours());
		j_mbox.find('[name="s_min"]').val(sqo.start_time.getMinutes());
		j_mbox.find('[name="e_year"]').val(sqo.end_time.getFullYear());
		j_mbox.find('[name="e_month"]').val(sqo.end_time.getMonth() + 1);
		j_mbox.find('[name="e_day"]').val(sqo.end_time.getDate());
		j_mbox.find('[name="e_hr"]').val(sqo.end_time.getHours());
		j_mbox.find('[name="e_min"]').val(sqo.end_time.getMinutes());
	    }
	    j_mbox.find('button.delete').show();
	}

	com.vus_mbox.child_set(that.node);

	defer = $.Deferred();
	return defer.promise();
    };
    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    that.fadein(j_mbox);
	}else if(direct == 'out'){
	    that.fadeout(j_mbox);

	    sqid = null;

	    j_mbox.find('input').val('');
	    j_mbox.find('[name="publicity"]').val(3);
	    j_mbox.find('[name="infinite"]').val(1);
	    j_mbox.find('div.time').hide();
	    j_mbox.find('button.delete').hide();
	    j_mbox.find('div.error').text('');

	    if(defer.state() == 'pending'){
		defer.reject();
	    }

	    com.vus_mbox.child_del(that.node);
	}

	return 'cont';
    };

    j_mbox.find('[name="infinite"]').on('change',function(e){
	if($(this).val() == 1){
	    j_mbox.find('div.time').hide();
	}else{
	    j_mbox.find('div.time').show();
	}
    });
    j_mbox.find('button.delete').on('click',function(e){
	if(confirm('確定刪除方塊?')){
	    $.post('/toj/php/square.php',{'action':'delete_sq','data':JSON.stringify({'sqid':sqid})},function(res){
		var j_error;

		if(res[0] == 'E'){
		    j_error = j_mbox.find('div.error');
		    switch(res){
			case 'Eno_login':
			    j_error.text('未登入');
			case 'Epermission_denied':
			    j_error.text('權限不足');
			    break;
			default:
			    j_error.text('其他錯誤');
			    break;
		    }
		}else{
		    defer.resolve();
		    com.url_pull();
		}
	    });
	}
    });
    j_mbox.find('button.submit').on('click',function(e){
	var sqname;
	var sqmodname;
	var publicity;
	var start_time;
	var end_time;
	var j_error;

	sqname = j_mbox.find('[name="sqname"]').val();
	sqmodname = j_mbox.find('[name="sqmodname"]').val();
	publicity = parseInt(j_mbox.find('[name="publicity"]').val());
	if(j_mbox.find('[name="infinite"]').val() == 1){
	    start_time = null;
	    end_time = null;
	}else{
	    start_time = j_mbox.find('[name="s_year"]').val() + '-' +
			j_mbox.find('[name="s_month"]').val() + '-' +
			j_mbox.find('[name="s_day"]').val() + ' ' +
			j_mbox.find('[name="s_hr"]').val() + ':' +
			j_mbox.find('[name="s_min"]').val();
	    end_time = j_mbox.find('[name="e_year"]').val() + '-' +
			j_mbox.find('[name="e_month"]').val() + '-' +
			j_mbox.find('[name="e_day"]').val() + ' ' +
			j_mbox.find('[name="e_hr"]').val() + ':' +
			j_mbox.find('[name="e_min"]').val();
	}
	
	j_error = j_mbox.find('div.error');
	if(action == 'new'){
	    $.post('/toj/php/square.php',{'action':'add_sq','data':JSON.stringify({'sqname':sqname,'sqmodname':sqmodname,'publicity':publicity,'start_time':start_time,'end_time':end_time})},function(res){
		if(res[0] == 'E'){
		    switch(res){
			case 'Eno_login':
			    j_error.text('未登入');
			case 'Epermission_denied':
			    j_error.text('權限不足');
			    break;
			case 'Esqname_too_short':
			    j_error.text('方塊名稱太短');
			    break;
			case 'Esqname_too_long':
			    j_error.text('方塊名稱太長');
			    break;
			case 'Esqmodname_empty':
			    j_error.text('模組名稱不能爲空');
			    break;
			default:
			    j_error.text('其他錯誤');
			    break;
		    }
		}else{
		    defer.resolve();
		    com.url_pull();
		}
	    });
	}else if(action == 'edit'){
	    $.post('/toj/php/square.php',{'action':'edit_sq','data':JSON.stringify({'sqid':sqid,'sqname':sqname,'sqmodname':sqmodname,'publicity':publicity,'start_time':start_time,'end_time':end_time})},function(res){
		if(res[0] == 'E'){
		    switch(res){
			case 'Eno_login':
			    j_error.text('未登入');
			case 'Epermission_denied':
			    j_error.text('權限不足');
			    break;
			case 'Esqname_too_short':
			    j_error.text('方塊名稱太短');
			    break;
			case 'Esqname_too_long':
			    j_error.text('方塊名稱太長');
			    break;
			default:
			    j_error.text('其他錯誤');
			    break;
		    }
		}else{
		    user.update(false);
		    defer.resolve();
		    com.url_pull();
		}
	    });
	}
    });
    j_mbox.find('button.cancel').on('click',function(e){
	com.url_pull();
    });
}; __extend(class_user_editsq_mbox,class_com_mbox);
var class_user_editpro_mbox = function(){
    var that = this;
    var j_mbox = $('#index_mask > div.user_mask > div.editpro_mbox');
    var action;
    var proid;
    var defer;

    that.node = new vus.node('user_editpro');

    that.__super();

    that.init = function(act,proo){
	action = act;
	if(action == 'edit'){
	    proid = proo.proid;

	    j_mbox.find('[name="proid"]').val(proo.proid);
	    j_mbox.find('[name="name"]').val(proo.proname);
	    j_mbox.find('[name="modid"]').val(proo.modid);
	    j_mbox.find('span.cacheid').text('當前CacheID:' + proo.cacheid);
	    if(proo.hidden == true){
		j_mbox.find('[name="hidden"]').val(2);
	    }else{
		j_mbox.find('[name="hidden"]').val(1);
	    }
	    j_mbox.find('div.update').show();
	    j_mbox.find('button.delete').show();
	}

	com.vus_mbox.child_set(that.node);

	defer = $.Deferred();
	return defer.promise();
    };
    that.node.url_chg = function(direct,url_dpart,url_upart){
	if(direct == 'in'){
	    that.fadein(j_mbox); 
	}else if(direct == 'out'){
	    that.fadeout(j_mbox); 

	    j_mbox.find('input').val('');
	    j_mbox.find('[name="hidden"]').val(1);
	    j_mbox.find('div.update').hide();
	    j_mbox.find('button.delete').hide();
	    j_mbox.find('div.error').text('');

	    if(defer.state() == 'pending'){
		defer.reject();
	    }

	    com.vus_mbox.child_del(that.node);
	}
    };

    j_mbox.find('button.update').on('click',function(e){
	$.post('/toj/php/problem.php',{'action':'update_pro_cache','data':JSON.stringify({'proid':proid})},function(res){

	    defer.resolve();
	    com.url_pull();
	});
    });
    j_mbox.find('button.submit').on('click',function(e){
	var proname;
	var modid; 
	var hidden;
	var j_error;

	proname = j_mbox.find('[name="name"]').val(); 
	modid = j_mbox.find('[name="modid"]').val();
	if(parseInt(j_mbox.find('[name="hidden"]').val()) == 1){
	    hidden = false;
	}else{
	    hidden = true;
	}

	j_error = j_mbox.find('div.error');
	if(action == 'new'){
	    $.post('/toj/php/problem.php',{'action':'add_pro','data':JSON.stringify({'proname':proname,'modid':modid,'hidden':hidden})},function(res){
		if(res[0] == 'E'){
		    switch(res){
			case 'Eno_login':
			    j_error.text('未登入');
			case 'Epermission_denied':
			    j_error.text('權限不足');
			    break;
			case 'Eproname_too_short':
			    j_error.text('題目名稱太短');
			    break;
			case 'Eproname_too_long':
			    j_error.text('題目名稱太長');
			    break;
			case 'Ewrong_modid':
			    j_error.text('模組ID錯誤');
			    break;
			default:
			    j_error.text('其他錯誤');
			    break;
		    }
		}else{
		    defer.resolve();
		    com.url_pull();
		}
	    });
	}else if(action == 'edit'){
	    $.post('/toj/php/problem.php',{'action':'edit_pro','data':JSON.stringify({'proid':proid,'proname':proname,'modid':modid,'hidden':hidden})},function(res){
		if(res[0] == 'E'){
		    switch(res){
			case 'Eno_login':
			    j_error.text('未登入');
			case 'Epermission_denied':
			    j_error.text('權限不足');
			    break;
			case 'Eproname_too_short':
			    j_error.text('題目名稱太短');
			    break;
			case 'Eproname_too_long':
			    j_error.text('題目名稱太長');
			    break;
			case 'Ewrong_modid':
			    j_error.text('模組ID錯誤');
			    break;
			default:
			    j_error.text('其他錯誤');
			    break;
		    }
		}else{
		    defer.resolve();
		    com.url_pull();
		}
	    });
	}
    });
    j_mbox.find('button.cancel').on('click',function(e){
	com.url_pull();
    });
}; __extend(class_user_editpro_mbox,class_com_mbox);

var class_login_pbox = function(){
    var that = this;
    var j_page = $('#index_page > div.login_pbox');

    that.node = new vus.node('login');

    that.__super();

    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    that.fadein(j_page);
	    index.title_set('TOJ-登入');
	    j_page.find('div.login_box [name="username"]').focus();
	}else if(direct == 'out'){
	    that.fadeout(j_page);
	    j_page.find('div.login_box > div.error').text('');
	    j_page.find('div.login_box > input').val('');
	}

	return 'cont';
    };
    com.vus_root.child_set(that.node);

    j_page.find('div.login_box > input').keypress(function(e){
	if(e.which == 13){
	    j_page.find('div.login_box > button').click();
	}
    });

    j_page.find('div.login_box > button').click(function(e){
	var j_error;
	var username;
	var password;
	var data;
	
	j_error = j_page.find('div.login_box > div.error');
	username = j_page.find('div.login_box [name="username"]').val();
	password = j_page.find('div.login_box [name="password"]').val();

	if(username == '' || password == ''){
	    j_error.text('欄位不可為空');
	    return;
	}

	data = {'username':username,'password':password};
	$.post('/toj/php/user.php',{'action':'login','data':JSON.stringify(data)},function(res){
	    if(res[0] == 'E'){
		j_error.text('登入錯誤');
	    }else{
		user.update(true);
		com.url_push_back('/toj\/register/');
	    }
	});
    });
}; __extend(class_login_pbox,class_com_pbox);

var class_register_pbox = function(){
    var that = this;
    var j_page = $('#index_page > div.register_pbox');

    that.node = new vus.node('register');

    that.__super();

    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    that.fadein(j_page);
	    index.title_set('TOJ-註冊');
	    j_page.find('div.register_box [name="username"]').focus();
	}else if(direct == 'out'){
	    that.fadeout(j_page);
	    j_page.find('div.register_box > div.error').text('');
	    j_page.find('div.register_box > div.register_box > input').val('');
	    j_page.find('div.register_box > div.register_box > div.cover').show();
	}

	return 'cont';
    };
    com.vus_root.child_set(that.node);

    j_page.find('div.register_box > input').keypress(function(e){
	if(e.which == 13){
	    j_page.find('div.register_box > button').click();
	}
    });

    j_page.find('div.register_box > button').click(function(e){
	var j_error;
	var username;
	var password;
	var password_repeat;
	var nickname;
	var email;
	var data;
	
	j_error = j_page.find('div.register_box > div.error');
	username = j_page.find('div.register_box [name="username"]').val();
	password = j_page.find('div.register_box [name="password"]').val();
	password_repeat = j_page.find('div.register_box [name="password_repeat"]').val();
	nickname = j_page.find('div.register_box [name="nickname"]').val();
	email = j_page.find('div.register_box [name="email"]').val();

	if(username == '' || password == '' || password_repeat == '' || nickname == '' || email == ''){
	    j_error.text('欄位不可為空');
	    return;
	}
	if(password != password_repeat){
	    j_error.text('使用者密碼不相同');
	    return;
	}

	data = {'username':username,'password':password,'nickname':nickname,'email':email};
	$.post('/toj/php/user.php',{'action':'register','data':JSON.stringify(data)},function(res){
	    if(res[0] == 'E'){
		switch(res){
		    case 'Eusername_too_short':
			j_error.text('使用者名稱太短');
			break;
		    case 'Eusername_too_long':
			j_error.text('使用者名稱太長');
			break;
		    case 'Epassword_too_short':
			j_error.text('使用者密碼太短');
			break;
		    case 'Epassword_too_long':
			j_error.text('使用者密碼太長');
			break;
		    case 'Enickname_too_short':
			j_error.text('暱稱太短');
			break;
		    case 'Enickname_too_long':
			j_error.text('暱稱太長');
			break;
		    case 'Eusername_exists':
			j_error.text('使用者名稱已存在');
			break;
		    case 'Eempty_email':
			j_error.text('電子郵件不能爲空');
			break;
		    case 'Eemail_too_long':
			j_error.text('電子郵件太長');
			break;
		    default:
			j_error.text('註冊錯誤');
			break;
		}
	    }else{
		user.update(true);
		com.url_push_back('/toj\/login/');
	    }
	});
    });
}; __extend(class_register_pbox,class_com_pbox);
