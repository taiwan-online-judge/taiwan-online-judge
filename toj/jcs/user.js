/*
square state
0 => wait
1 => run
2 => past
*/

var user = {
    uid:null,
    level:null,
    username:null,
    nickname:null,
    avatar:null,
    aboutme:null,
    email:null,
    sq_inlist:null,
    loginchange:$.Callbacks(),
    datachange:$.Callbacks(),

    init:function(){
	user.user_page = new class_user_page;
	user.login_page = new class_login_page;
	user.register_page = new class_register_page;

	$('#index_panel > [page="logout"] > a.button').off('click').on('click',function(e){
	    var cookie;
	    var key;
    
	    cookie = common.getcookie();
	    for(key in cookie){
		document.cookie = key + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/toj/';
	    }

	    location.href = '/toj/home/';
	    return false;
	});
	user.loginchange.add(function(login){
	    var j_notice;
	    var j_nickname;

	    j_notice = $('#index_head_notice');
	    j_nickname = $('#index_head_nickname > a.nickname')
	    
	    if(login){
		j_notice.show();
		j_nickname.attr('href','/toj/user/' + user.uid + '/');
		j_nickname.text(user.nickname);

		index.showpanel('logout');
		index.setpanel('user','/toj/user/' + user.uid + '/','個人');
		index.showpanel('user');
	    }else{
		j_notice.hide();
		j_nickname.attr('href','');
		j_nickname.text('');

		index.hidepanel('logout');
		index.hidepanel('user');
		index.setpanel('user',null,'個人');
	    }
	});
	user.datachange.add(function(){
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

	    j_ul = $('#index_panel > ul.square_box');
	    j_ul.find('li.button').hide();
	    for(i = 0;i < user.sq_inlist.length;i++){
		sqo = user.sq_inlist[i];
		if(sqo.relationship != 1){
		    panelsq_listadd(j_ul,i,sqo.sqid,sqo.sqname);
		}
	    }
	});

	user.updatedata(true);
    },

    updatedata:function(sync){
	$.ajax({'url':'/toj/php/user.php',
	    'type':'POST',
	    'data':{'action':'view','data':JSON.stringify({'uid':null})},
	    'async':!sync,
	    'success':function(res){
		var reto;
		var old_uid;

		old_uid = user.uid;
		if(res[0] == 'E'){
		    user.uid = null;
		    user.level = null;
		    user.username = null;
		    user.nickname = null;
		    user.avatar = null;
		    user.aboutme = null;
		    user.email = null;
		    user.sq_inlist = null;
		    
		    user.loginchange.fire(false);
		}else{
		    reto = JSON.parse(res);    
		    user.uid = reto.uid;
		    user.level = reto.level;
		    user.username = reto.username;
		    user.nickname = reto.nickname;
		    user.avatar = reto.avatar;
		    user.aboutme = reto.aboutme;
		    user.email = reto.email;

		    if(old_uid != user.uid){
			user.loginchange.fire(true);
		    }

		    $.post('/toj/php/square.php',{'action':'get_entered_sq','data':JSON.stringify({'uid':user.uid})},function(res){
			var i;
			var reto;
			var ts;
			var sqlist;
			var sqo;

			if(res[0] == 'E'){
			    return;
			}

			reto = JSON.parse(res);
			ts = common.getdate(reto.timestamp);
			sqlist = reto.list;
			for(i = 0;i < sqlist.length;i++){
			    sqo = sqlist[i];
			    sqo.state = 1;
			    if(sqo.start_time != null){
				sqo.start_time =  common.getdate(sqo.start_time);
				if(ts < sqo.start_time){
				    sqo.state = 0;
				}
			    }
			    if(sqo.end_time != null){
				sqo.end_time =  common.getdate(sqo.end_time);
				if(sqo.end_time < ts){
				    sqo.state = 2;
				}
			    }
			}
			user.sq_inlist = sqlist;

			user.datachange.fire(true);
		    });
		}
	    }
	});
    }
};

var class_user_page = function(){
    var that = this;
    var j_page = $('#index_page > [page="user"]');
    var main_tab = new class_user_main_tab(that);
    var edit_tab = new class_user_edit_tab(that);
    var mgsq_tab = new class_user_mgsq_tab(that);
    var mg_tab = new class_user_mg_tab(that);

    that.__super();

    that.editsq_mbox = new class_user_editsq_mbox(that);

    that.uid = null;
    that.nickname = null;
    that.avatar = null;
    that.aboutme = null;

    that.urlchange = function(direct){
	var uid;
	var _check = function(){
	    uid = common.geturlpart()[1];
	    if(uid == ''){
		if(user.uid == null){
		    common.pushurl('/toj/none/');
		    return false;
		}
		uid = user.uid;
		common.replaceurl('/toj/user/' + uid + '/main/');
	    }
	    return true;
	};
	var _in = function(){
	    $.post('/toj/php/user.php',{'action':'view','data':JSON.stringify({'uid':uid})},function(res){
		var reto;

		if(res[0] == 'E'){
		    common.pushurl('/toj/none/');
		}else{
		    reto = JSON.parse(res);
		    that.uid = reto.uid;
		    that.nickname = reto.nickname;
		    that.avatar = reto.avatar;
		    that.aboutme = reto.aboutme;

		    that.fadein(j_page);

		    index.settitle('TOJ-使用者');

		    that.addtab('main',main_tab);
		    index.addtab('main','/toj/user/' + that.uid + '/main/',that.nickname);

		    if(uid == user.uid){
			that.addtab('mgsq',mgsq_tab);
			index.addtab('mgsq','/toj/user/' + that.uid + '/mgsq/','你的方塊');
			that.addtab('edit',edit_tab);
			index.addtab('edit','/toj/user/' + that.uid + '/edit/','更改資料');

			if((user.level & USER_LEVEL_SUPERADMIN) == USER_LEVEL_SUPERADMIN){
			    that.addtab('mg',mg_tab);
			    index.addtab('mg','/toj/user/' + that.uid + '/mg/','管理');
			}
		    }
		    
		    _change();
		}
	    });
	};
	var _out = function(){
	    index.emptytab();
	    that.fadeout(j_page);
	    that.tab_urlchange(null);
	    that.uid = null;
	};
	var _change = function(){
	    var tabname;

	    tabname = common.geturlpart()[2];
	    if(!(tabname in that.tab_list)){
		tabname = 'main';
		common.replaceurl('/toj/user/' + that.uid + '/main/');
	    }
	    that.tab_urlchange(tabname);
	};

	if(direct == 'in'){
	    if(_check()){
		_in();
	    }
	}else if(direct == 'out'){
	    _out();
	}else if(direct = 'same'){
	    if(_check()){
		if(uid != that.uid || that.forceupdate){
		    that.forceupdate = false;
		    _out();
		    _in();
		}else{
		    _change();
		}
	    }
	}
    };

    common.addpage('user',that);
}; __extend(class_user_page,class_common_page);

var class_user_main_tab = function(paobj){
    var that = this;
    var j_tab = $('#index_page > [page="user"] > [tab="main"]');

    that.__super(paobj);

    that.urlchange = function(direct){
	if(direct == 'in'){
	    that.fadein(j_tab);

	    if(user.user_page.avatar == ''){
		j_tab.find('div.info_box > img.avatar').attr('src','http://i.imgur.com/ykkQD.png');
	    }else{
		j_tab.find('div.info_box > img.avatar').attr('src',that.paobj.avatar);
	    }
	    j_tab.find('div.info_box > div.aboutme').text(that.paobj.aboutme);
	}else if(direct == 'out'){
	    that.fadeout(j_tab);
	}
    };
}; __extend(class_user_main_tab,class_common_tab);

var class_user_edit_tab = function(paobj){
    var that = this;
    var j_tab = $('#index_page > [page="user"] > [tab="edit"]');

    that.__super(paobj);

    that.urlchange = function(direct){
	if(direct == 'in'){
	    that.fadein(j_tab);

	    j_tab.find('div.edit_box > [name="nickname"]').val(user.nickname);
	    j_tab.find('div.edit_box > [name="avatar"]').val(user.avatar);
	    if(user.avatar == ''){
		j_tab.find('div.edit_box > img.avatar').attr('src','http://i.imgur.com/ykkQD.png');
	    }else{
		j_tab.find('div.edit_box > img.avatar').attr('src',user.avatar);
	    }
	    j_tab.find('div.edit_box > [name="aboutme"]').val(user.aboutme);
	    j_tab.find('div.edit_box > [name="email"]').val(user.email);
	}else if(direct == 'out'){
	    that.fadeout(j_tab);
	    j_tab.find('div.edit_box > input').val('');
	    j_tab.find('div.edit_box > img.avatar').attr('src',null);
	    j_tab.find('div.edit_box > div.error').text('');
	}
    };

    j_tab.find('div.edit_box > [name="avatar"]').change(function(e){
	var avatar;

	avatar = $(this).val();
	if(avatar == ''){
	    j_tab.find('div.edit_box > img.avatar').attr('src','http://i.imgur.com/ykkQD.png');
	}else{
	    j_tab.find('div.edit_box > img.avatar').attr('src',avatar);
	}('test')
    });
    j_tab.find('div.edit_box > button.submit').click(function(e){
	var j_error;
	var nickname;
	var avatar;
	var aboutme;
	var email;
	var password_old;
	var password_new;
	var password_repeat;
	var data;
	
	j_error = j_tab.find('div.edit_box > div.error');
	nickname = j_tab.find('div.edit_box > [name="nickname"]').val();
	avatar = j_tab.find('div.edit_box > [name="avatar"]').val();
	aboutme = j_tab.find('div.edit_box > [name="aboutme"]').val();
	email = j_tab.find('div.edit_box > [name="email"]').val();
	password_old = j_tab.find('div.edit_box > [name="password_old"]').val();
	password_new = j_tab.find('div.edit_box > [name="password_new"]').val();
	password_repeat = j_tab.find('div.edit_box > [name="password_repeat"]').val();

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
		user.updatedata(true);

		that.paobj.forceupdate = true;
		common.pushurl('/toj/user/' + user.uid + '/main/');
	    }
	});
    });
    j_tab.find('div.edit_box > button.cancel').click(function(e){
	common.pushurl('/toj/user/' + user.uid + '/main/');
    });
}; __extend(class_user_edit_tab,class_common_tab);

var class_user_mgsq_tab = function(paobj){
    var that = this;
    var j_tab = $('#index_page > [page="user"] > [tab="mgsq"]');

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
	var j_a;
	var j_button;

	j_info = j_item.find('div.info');
	j_data = j_item.find('div.data');
	j_data.empty();

	j_item.attr('sqid',sqo.sqid);

	j_a = j_info.find('span.name > a');
	j_a.attr('href','/toj/sq/' + sqo.sqid + '/pro/');
	j_a.text(sqo.sqname);
	
	if(sqo.end_time == null){
	    j_info.find('span.time').text('');
	}else{
	    j_info.find('span.time').text(common.getdatestring(sqo.start_time,false) + ' > ' + common.getdatestring(sqo.end_time,false));
	}

	if(sqo.relationship == 3 || (user.level & USER_LEVEL_SUPERADMIN) == USER_LEVEL_SUPERADMIN){
	    j_button = $('<button style="margin:0px 6px 0px 0px;">管理</button>');
	    j_button.on('click',function(e){
		that.paobj.editsq_mbox.init('edit',sqo);
		common.showmbox(that.paobj.editsq_mbox).done(sq_update);
		return false;
	    });
	    j_data.append(j_button);
	}

	j_button = $('<button></button>');
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
	    if(sqo.relationship == 1 && (user.level & USER_LEVEL_SUPERADMIN) != USER_LEVEL_SUPERADMIN){
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
	j_info = $('<div class="info"><span class="name"><a></a></span><span class="time"></span></div>');
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

	user.datachange.add(function(){
	    var i;
	    var sqo;
	    var sqwait;
	    var sqrun;
	    var sqpast;

	    var j_wait;
	    var j_run;
	    var j_past;

	    user.datachange.remove(arguments.callee);

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

	    j_wait = j_tab.find('div.in_box > div.wait');
	    j_run = j_tab.find('div.in_box > div.run');
	    j_past = j_tab.find('div.in_box > div.past');

	    _updatelist(j_wait,sqwait);
	    _updatelist(j_run,sqrun);
	    _updatelist(j_past,sqpast);
	});
	user.updatedata(false);

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
	    ts = common.getdate(reto.timestamp);
	    sqlist = reto.list;
	    sqwait = new Array();
	    sqrun = new Array();
	    sqpast = new Array();
	    for(i = 0;i < sqlist.length;i++){
		sqo = sqlist[i];
		sqo.relationship = 0;
		sqo.state = 1;
		if(sqo.start_time != null){
		    sqo.start_time = common.getdate(sqo.start_time);
		    if(ts < sqo.start_time){
			sqo.state = 0;
		    }
		}
		if(sqo.end_time != null){
		    sqo.end_time = common.getdate(sqo.end_time);
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

	    j_wait = j_tab.find('div.out_box > div.wait');
	    j_run = j_tab.find('div.out_box > div.run');
	    j_past = j_tab.find('div.out_box > div.past');

	    _updatelist(j_wait,sqwait);
	    _updatelist(j_run,sqrun);
	    _updatelist(j_past,sqpast);
	});
    }

    that.__super(paobj);

    that.urlchange = function(direct){
	if(direct == 'in'){
	    that.fadein(j_tab);
	    sq_update();
	}else if(direct == 'out'){
	    that.fadeout(j_tab);
	    j_tab.find('div.in_box > div > div').remove();
	    j_tab.find('div.out_box > div > div').remove();
	}
    };
}; __extend(class_user_mgsq_tab,class_common_tab);

var class_user_mg_tab = function(paobj){
    var that = this;
    var j_tab = $('#index_page > [page="user"] > [tab="mg"]');

    that.__super(paobj);

    that.urlchange = function(direct){
	if(direct == 'in'){
	    that.fadein(j_tab);
	}else if(direct == 'out'){
	    that.fadeout(j_tab);
	}
    };

    j_tab.find('button.newsq').on('click',function(e){
	that.paobj.editsq_mbox.init('new');
	common.showmbox(that.paobj.editsq_mbox);
    });
}; __extend(class_user_mg_tab,class_common_tab);

var class_user_editsq_mbox = function(paobj){
    var that = this;
    var j_mbox = $('#index_mask > div.user_mask > div.editsq_mbox');
    var action = null;
    var sqid;

    that.__super(paobj);

    that.init = function(act,sqo){
	action = act;
	if(action == 'edit'){
	    sqid = sqo.sqid;

	    console.log(sqo);
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
    };
    that.switchchange = function(direct){
	if(direct == 'in'){
	    that.fadein(j_mbox);
	}else if(direct == 'out'){
	    that.fadeout(j_mbox);
	    j_mbox.find('input').val('');
	    j_mbox.find('[name="publicity"]').val(3);
	    j_mbox.find('[name="infinite"]').val(1);
	    j_mbox.find('div.time').hide();
	    j_mbox.find('button.delete').hide();
	    j_mbox.find('div.error').text('');
	}
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
		    common.hidembox(true);
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
		    common.hidembox(true);
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
		    user.updatedata(false);
		    common.hidembox(true); 
		}
	    });
	}
    });
    j_mbox.find('button.cancel').on('click',function(e){
	common.hidembox(false); 
    });
}; __extend(class_user_editsq_mbox,class_common_mbox);

var class_login_page = function(){
    var that = this;
    var j_page = $('#index_page > [page="login"]');

    that.__super();

    that.urlchange = function(direct){
	if(direct == 'in'){
	    that.fadein(j_page);
	    index.settitle('TOJ-登入');
	    j_page.find('div.login_box [name="username"]').focus();
	}else if(direct == 'out'){
	    that.fadeout(j_page);
	    j_page.find('div.login_box > div.error').text('');
	    j_page.find('div.login_box > input').val('');
	}
    };

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
		user.updatedata(true);
		common.prevurl('register');
	    }
	});
    });

    user.loginchange.add(function(login){
	if(login){
	    that.urlchange('out');
	    common.removepage('login');
	    index.hidepanel('login');
	}else{
	    common.addpage('login',that);
	    index.showpanel('login');
	}
    });
}; __extend(class_login_page,class_common_page);

var class_register_page = function(){
    var that = this;
    var j_page = $('#index_page > [page="register"]');

    that.__super();

    that.urlchange = function(direct){
	if(direct == 'in'){
	    that.fadein(j_page);
	    index.settitle('TOJ-註冊');
	    j_page.find('div.register_box [name="username"]').focus();
	}else if(direct == 'out'){
	    that.fadeout(j_page);
	    j_page.find('div.register_box > div.error').text('');
	    j_page.find('div.register_box > div.register_box > input').val('');
	    j_page.find('div.register_box > div.register_box > div.cover').show();
	}
    };

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
		user.updatedata(true);
		common.prevurl('login');
	    }
	});
    });

    user.loginchange.add(function(login){
	if(login){
	    that.urlchange('out');
	    common.removepage('register');
	    index.hidepanel('register');
	}else{
	    common.addpage('register',that);
	    index.showpanel('register');
	}
    });
}; __extend(class_register_page,class_common_page);
