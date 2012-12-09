var square_page;
var square_pageo_list;
var suqare_pageo;
var square_update_callback;

function square_init(){
    square_page = $('#page_square');
    square_pageo_list = new Array();
    square_pageo = null;
    square_update_callback = $.Callbacks();

    user_logincallback.add(square_update);

    $('#index_headtab_square a.button').on('click',function(e){
	square_tabswitch($(this.parentNode).attr('tab'));
	return false;
    });

    $('div.squaremg_square > div.squarelist > table.list tr.item').hover(
	function(e){
	    $(this).find('div.nor_button').show();
	},
	function(e){
	    $(this).find('div.nor_button').hide();
	}
    );

    $('#squaremg_inside > div.squarelist > table.list tr.item div.nor_button').on('click',function(e){
	$.post('user_set.php',
	    {
		'type':'squareremove',
		'squareid':$(this).parents('tr.item').data('squareid')
	    },
	    function(res){
		square_update();
	    }
	);
    });
    $('#squaremg_outside > div.squarelist > table.list tr.item div.nor_button').on('click',function(e){
	$.post('user_set.php',
	    {
		'type':'squareadd',
		'squareid':$(this).parents('tr.item').data('squareid')
	    },
	    function(res){
		square_update();
	    }
	);
    });
    data_callback.add(square_callback);
    data_callback.add(square_rank_callback);
    data_callback.add(square_problem_callback);
    data_callback.add(square_scoreboard_callback);

    square_update();
}
function square_update(){
    data_paramo.square_list = new Object();
    data_update(true);
}
function square_callback(res){
    var i;

    var reto;
    var inlist;
    var outlist;
    var squareo;

    var divs;
    var j_oributton;
    var j_button;
    var j_a;
    
    var e_u_table;
    var e_a_table;
    var e_i_table;
    var uidx;
    var aidx;
    var iidx;

    if(res.square_list === undefined){
	return;
    }
    if(res.square_list != null){
	reto = res.square_list;
	inlist = reto.inlist;
	outlist = reto.outlist;

	j_oributton = $('#index_panel_squarelist > div.ori');
	divs = $('#index_panel_squarelist').children('div.button');
	for(i = 1;i < divs.length;i++){
	    $(divs[i]).hide();
	}
	for(i = 0;i < inlist.length;i++){
	    squareo = inlist[i];
	    if(squareo.status != 'active'){
		continue;
	    }

	    if((divs.length - 2) <= i){
		j_button = j_oributton.clone(true);
		j_button.removeClass('ori');
		j_oributton.before(j_button);
	    }else{
		j_button = $(divs[i + 1]);
	    }

	    j_button.attr('page','square_' + squareo.squareid);
	    j_a = $(j_button.find('a.button')[0]);
	    j_a.attr('href','/expoj/index.html?page=square_' + squareo.squareid);
	    j_a.text(squareo.squarename);

	    j_button.show();

	    if(squareo.squareid in square_pageo_list){
		square_pageo_list[squareo.squareid].squarename = squareo.squarename;
	    }else{
		square_pageo_list[squareo.squareid] = {
		    'squareid':squareo.squareid,
		    'squarename':squareo.squarename,
		    'flag':squareo.flag,
		    'tab':'problem',
		    'tabo_rank':{
			'rankcount':0,
			'rankoff':0,
			'callback':$.Callbacks()
		    },
		    'tabo_problem':{
			'procount':0,
			'prooff':0,
			'callback':$.Callbacks()
		    },
		    'tabo_scoreboard':{
			'callback':$.Callbacks()
		    }
		}
	    }
	}

	e_u_table = $('#squaremg_inside > div.upcoming > table.list')[0];
	e_a_table = $('#squaremg_inside > div.active > table.list')[0];
	e_i_table = $('#squaremg_inside > div.inactive > table.list')[0];
	for(i = e_u_table.rows.length - 1;i > 0;i--){
	    $(e_u_table.rows[i]).hide();
	}
	for(i = e_a_table.rows.length - 1;i > 0;i--){
	    $(e_a_table.rows[i]).hide();
	}
	for(i = e_i_table.rows.length - 1;i > 0;i--){
	    $(e_i_table.rows[i]).hide();
	}

	uidx = 0;
	aidx = 0;
	iidx = 0;
	for(i = 0;i < inlist.length;i++){
	    squareo = inlist[i];
	    
	    switch(squareo.status){
		case 'upcoming':
		    squaremg_square_listadd(
			e_u_table,
			uidx,
			squareo.squareid,
			squareo.squarename,
			squareo.starttime,
			squareo.endtime);

		    uidx++;
		    break;
		case 'active':
		    squaremg_square_listadd(
			e_a_table,
			aidx,
			squareo.squareid,
			squareo.squarename,
			squareo.starttime,
			squareo.endtime);

		    aidx++;
		    break;
		case 'inactive':
		    squaremg_square_listadd(
			e_i_table,
			iidx,
			squareo.squareid,
			squareo.squarename,
			squareo.starttime,
			squareo.endtime);

		    iidx++;
		    break;
	    }
	}

	e_u_table = $('#squaremg_outside > div.upcoming > table.list')[0];
	e_a_table = $('#squaremg_outside > div.active > table.list')[0];
	e_i_table = $('#squaremg_outside > div.inactive > table.list')[0];
	for(i = e_u_table.rows.length - 1;i > 0;i--){
	    $(e_u_table.rows[i]).hide();
	}
	for(i = e_a_table.rows.length - 1;i > 0;i--){
	    $(e_a_table.rows[i]).hide();
	}
	for(i = e_i_table.rows.length - 1;i > 0;i--){
	    $(e_i_table.rows[i]).hide();
	}

	uidx = 0;
	aidx = 0;
	iidx = 0;
	for(i = 0;i < outlist.length;i++){
	    squareo = outlist[i];

	    switch(squareo.status){
		case 'upcoming':
		    squaremg_square_listadd(
			e_u_table,
			uidx,
			squareo.squareid,
			squareo.squarename,
			squareo.starttime,
			squareo.endtime);

		    uidx++;
		    break;
		case 'active':
		    squaremg_square_listadd(
			e_a_table,
			aidx,
			squareo.squareid,
			squareo.squarename,
			squareo.starttime,
			squareo.endtime);

		    aidx++;
		    break;
		case 'inactive':
		    squaremg_square_listadd(
			e_i_table,
			iidx,
			squareo.squareid,
			squareo.squarename,
			squareo.starttime,
			squareo.endtime);

		    iidx++;
		    break;
	    }	}

	square_update_callback.fire();
    }
}

function square_pageswitch(pagename,on){
    var squareid;
    var param;
    var as;
    var tabo;
    var show = function(){
	squareid = pagename.match(/^square_(.+)/)[1];
	square_pageo = square_pageo_list[squareid];

	param = nor_getparam();
	if(param.tab != undefined){
	    square_pageo.tab = param.tab;
	}

	if(square_pageo.tab != 'rank' && square_pageo.tab != 'problem' && square_pageo.tab != 'scoreboard'){
	    square_pageo.tab = 'problem';
	}
	if(square_pageo.tab == 'scoreboard' && !('1' in square_pageo.flag)){
	    square_pageo.tab = 'problem';
	}

	$('#index_head_title').text('ExpOJ-' + square_pageo.squarename);

	square_page.attr('id','page_square_' + square_pageo.squareid);

	as = $('#index_headtab_square > div.button > a.button');
	$(as[0]).attr('href','/expoj/index.html?page=square_' + square_pageo.squareid + '&tab=problem');
	$(as[1]).attr('href','/expoj/index.html?page=square_' + square_pageo.squareid + '&tab=rank');
	$(as[2]).attr('href','/expoj/index.html?page=square_' + square_pageo.squareid + '&tab=scoreboard');

	if('1' in square_pageo.flag){
	    $('#index_headtab_square > [tab="scoreboard"]').show();
	}else{
	    $('#index_headtab_square > [tab="scoreboard"]').hide();
	}

	$('#index_headtab_square > div.button').removeClass('button_s');
	$('#index_headtab_square > [tab="' + square_pageo.tab + '"]').addClass('button_s');
	$('#index_headtab_square').show();

	$(square_page.find('div.square_rank')[0]).hide();
	$(square_page.find('div.square_problem')[0]).hide();
	$(square_page.find('div.square_scoreboard')[0]).hide();

	switch(square_pageo.tab){
	    case 'rank':
		tabo = square_pageo.tabo_rank;
		if(param.rankoff != undefined){
		    tabo.rankoff = param.rankoff;
		}

		tabo.callback.add(function(){
		    $(square_page.find('div.square_rank')[0]).show();
		    window.history.replaceState('square',document.title,square_geturl());
		    tabo.callback.remove(arguments.callee);
		});

		square_rank_update();
		break;
	    case 'problem':
		tabo = square_pageo.tabo_problem;
		if(param.prooff != undefined){
		    tabo.prooff = param.prooff;
		}
		
		tabo.callback.add(function(){
		    $(square_page.find('div.square_problem')[0]).show();
		    window.history.replaceState('square',document.title,square_geturl());
		    tabo.callback.remove(arguments.callee);
		});

		square_problem_update();
		break;
	    case 'scoreboard':
		tabo = square_pageo.tabo_scoreboard;
		tabo.callback.add(function(){
		    $(square_page.find('div.square_scoreboard')[0]).show();
		    window.history.replaceState('square',document.title,square_geturl());
		    tabo.callback.remove(arguments.callee);
		});

		square_scoreboard_update();
		break;
	}

	square_page.fadeIn('slow');
    }

    if(on){
	square_update_callback.add(function(){
	    show();   
	    square_update_callback.remove(arguments.callee);
	});
	square_update();
    }else{
	delete data_paramo.square_rank_list;
	delete data_paramo.square_problem_list;
	delete data_paramo.square_scoreboard_list;
    }
}
function square_tabswitch(tabname){
    var j_tab;
    var tabo;
    var j_div;
    var show = function(){
	square_pageo.tab = tabname;

	j_tab = $(square_page.find('div.square_' + square_pageo.tab)[0]);
	switch(square_pageo.tab){
	    case 'rank':
		tabo = square_pageo.tabo_rank;
		tabo.callback.add(function(){
		    j_tab.fadeIn('fast');
		    window.history.pushState('square',document.title,square_geturl());
		    tabo.callback.remove(arguments.callee);
		});

		square_rank_update();
		break;
	    case 'problem':
		tabo = square_pageo.tabo_problem;
		tabo.callback.add(function(){
		    j_tab.fadeIn('fast');
		    window.history.pushState('square',document.title,square_geturl());
		    tabo.callback.remove(arguments.callee);
		});

		square_problem_update();
		break;
	    case 'scoreboard':
		tabo = square_pageo.tabo_scoreboard;
		tabo.callback.add(function(){
		    j_tab.fadeIn('fast');
		    window.history.pushState('square',document.title,square_geturl());
		    tabo.callback.remove(arguments.callee);
		})
		
		square_scoreboard_update();
		break;
	}
    }

    if(square_pageo.tab == tabname){
	return -1;
    }

    delete data_paramo.square_rank_list;
    delete data_paramo.square_problem_list;
    delete data_paramo.square_scoreboard_list;

    $('#index_headtab_square > div.button').removeClass('button_s');
    $(square_page.find('div.square_' + square_pageo.tab)[0]).fadeOut('fast',show);
    $('#index_headtab_square > [tab="' + tabname + '"]').addClass('button_s');
}
function square_geturl(){
    var url;
    var pageo;
    var j_tab;
    var tabo;

    url = '/expoj/index.html?page=square_' + square_pageo.squareid + '&tab=' + square_pageo.tab;

    switch(square_pageo.tab){
	case 'rank':
	    url = url + '&rankoff=' + square_pageo.tabo_rank.rankoff;
	    break;
	case 'problem':
	    url = url + '&prooff=' + square_pageo.tabo_problem.prooff;
	    break;
	case 'scoreboard':
	    break;
    }

    return url;
}

function square_rank_listadd(e_table,rank,userid,nickname,acceptcount,submitcount,score){
    var j_tr;
    var j_a;

    j_tr = $($(e_table).find('tr.ori')[0]).clone(true);
    j_tr.removeClass('ori');
    $(j_tr.find('td.rank')[0]).text(rank);
    j_a = $(j_tr.find('td.name > a.link')[0]);
    j_a.attr('href','/expoj/index.html?page=user_' + userid);
    j_a.text(nickname);
    j_a.off('click').on('click',function(userid){return function(e){
	page_switch('user_' + userid);
	return false;
    }}(userid));
    $(j_tr.find('td.rate')[0]).text(acceptcount + '/' + submitcount);
    $(j_tr.find('td.score')[0]).text(score);
    
    j_tr.show();
    $(e_table).append(j_tr);
}
function square_rank_chpg(rankoff){
    var tabo;

    tabo = square_pageo.tabo_rank;
    if(rankoff >=0 && rankoff < tabo.rankcount){
	tabo.rankoff = rankoff;
	tabo.callback.add(function(){
	    window.history.pushState('square',document.title,square_geturl());
	    tabo.callback.remove(arguments.callee);
	});

	square_rank_update();
    }
}
function square_rank_update(){
    data_paramo.square_rank_list = {
	'squareid':parseInt(square_pageo.squareid),
	'rankoff':parseInt(square_pageo.tabo_rank.rankoff)
    }

    data_update(true);
}
function square_rank_callback(res){
    var i;	

    var reto;
    var ranklist;
    var tabo;
    var e_table;
    var j_div;
    var j_a;

    if((reto = res.square_rank_list) === undefined){
	return;
    }

    if(reto == null){
	delete data_paramo.square_rank_list;
    }else{
	tabo = square_pageo.tabo_rank;
	tabo.rankcount = reto.rankcount;
	ranklist = reto.ranklist;

	j_tab = $(square_page.find('div.square_rank')[0]);

	e_table = j_tab.find('table.list')[0];
	for(i = e_table.rows.length - 1;i > 1;i--){
	    e_table.deleteRow(i);
	}

	for(i = 0;i < ranklist.length;i++){
	    square_rank_listadd(
		e_table,
		ranklist[i].rank,
		ranklist[i].userid,
		ranklist[i].nickname,
		ranklist[i].acceptcount,
		ranklist[i].submitcount,
		ranklist[i].score);
	}

	j_div = $(j_tab.find('div.nor_chpg')[0]);
	j_div.empty();

	j_a = nor_new_chpgbutton('«',function(){
	    square_rank_chpg(0);
	});
	j_div.append(j_a);

	j_a = nor_new_chpgbutton('‹',function(){
	    square_rank_chpg(tabo.rankoff - 20);
	});
	j_div.append(j_a);

	offs = Math.max(0,tabo.rankoff - 100);
	if((offe = Math.min(tabo.rankcount,offs + 200)) == tabo.rankcount){
	    offs = Math.max(0,(offe - offe % 20) - 180);
	}
	for(i = offs;i < offe;i += 20){
	    j_a = nor_new_chpgbutton((i / 20 + 1),function(rankoff){return function(){
		square_rank_chpg(rankoff);
	    }}(i));

	    if(i == tabo.rankoff){
		j_a.addClass('nor_chpg_s');
	    }

	    j_div.append(j_a);
	}

	j_a = nor_new_chpgbutton('›',function(){
	    square_rank_chpg(tabo.rankoff + 20);
	});
	j_div.append(j_a);

	j_a = nor_new_chpgbutton('»',function(){
	    square_rank_chpg(tabo.rankcount - tabo.rankcount % 20);
	});
	j_div.append(j_a);

	tabo.callback.fire();
    }
}

function square_problem_listadd(e_table,idx,proid,proname,acceptcount,submitcount,light){
    var j_tr;
    var j_a;

    if((e_table.rows.length - 2) <= idx){
	j_tr = $($(e_table).find('tr.ori')[0]).clone(true);
	j_tr.removeClass('ori');
	$(e_table).append(j_tr);
    }else{
	j_tr = $(e_table.rows[idx + 2]);
    }

    switch(light){
	case 0:
	    j_tr.css('border-left','#333333 5px solid'); 
	    break;
	case 1:
	    j_tr.css('border-left','#FF0000 5px solid'); 
	    break;
	case 2:
	    j_tr.css('border-left','#00FF00 5px solid'); 
	    break;
	case 3:
	    j_tr.css('border-left','#FFFF00 5px solid'); 
	    break;
	case 4:
	    j_tr.css('border-left','#FFFFFF 5px solid'); 
	    break;
    }

    $(j_tr.find('td.id')[0]).text(proid);
    $(j_tr.find('td.rate')[0]).text(acceptcount + '/' + submitcount);
    j_a = $(j_tr.find('td.name > a.link')[0]);
    j_a.attr('href','/expoj/index.html?page=problem_' + proid);
    j_a.text(proname);

    j_tr.off('click').on('click',function(e){	
	page_switch('problem_' + proid);
	return false;
    });

    j_tr.show();
    return j_tr;
}
function square_problem_chpg(prooff){
    var tabo;

    tabo = square_pageo.tabo_problem;
    if(prooff >=0 && prooff < tabo.procount){
	tabo.prooff = prooff;
	tabo.callback.add(function(){
	    window.history.pushState('square',document.title,square_geturl());
	    tabo.callback.remove(arguments.callee);
	});

	square_problem_update();
    }
}
function square_problem_update(){
    var tabo;

    tabo = square_pageo.tabo_problem;
    data_paramo.square_problem_list = {
	'squareid':parseInt(square_pageo.squareid),
	'prooff':parseInt(tabo.prooff)
    };

    data_update(true);
}
function square_problem_callback(res){
    var i;
    var j;

    var reto;
    var tabo;
    var prolist;
    var proo;
    var e_table;
    var j_tr;
    var j_div;

    if((reto = res.square_problem_list) === undefined){
	return;
    }

    if(reto == null){
	delete data_paramo.square_problem_list;
    }else{
	tabo = square_pageo.tabo_problem;
	tabo.procount = reto.procount;
	prolist = reto.prolist;

	j_tab = $(square_page.find('div.square_problem')[0]);

	e_table = j_tab.find('table.list')[0];
	for(i = e_table.rows.length - 1;i > 1;i--){
	    $(e_table.rows[i]).hide();
	}

	for(i = 0;i < prolist.length;i++){
	    proo = prolist[i];
	    square_problem_listadd(
		    e_table,
		    i,
		    proo.proid,
		    proo.proname,
		    proo.acceptcount,
		    proo.submitcount,
		    nor_scoretolight(proo.sumscore,proo.summaxscore));
	}

	j_div = $(j_tab.find('div.nor_chpg')[0]);
	j_div.empty();

	j_a = nor_new_chpgbutton('«',function(){
	    square_problem_chpg(0);
	});
	j_div.append(j_a);

	j_a = nor_new_chpgbutton('‹',function(){
	    square_problem_chpg(tabo.prooff - 20);
	});
	j_div.append(j_a);

	offs = Math.max(0,tabo.prooff - 100);
	if((offe = Math.min(tabo.procount,offs + 200)) == tabo.procount){
	    offs = Math.max(0,(offe - offe % 20) - 180);
	}
	for(i = offs;i < offe;i += 20){
	    j_a = nor_new_chpgbutton((i / 20 + 1),function(prooff){return function(){
		square_problem_chpg(prooff);
	    }}(i));

	    if(i == tabo.prooff){
		j_a.addClass('nor_chpg_s');
	    }

	    j_div.append(j_a);
	}

	j_a = nor_new_chpgbutton('›',function(){
	    square_problem_chpg(tabo.prooff + 20);
	});
	j_div.append(j_a);

	j_a = nor_new_chpgbutton('»',function(){
	    square_problem_chpg(tabo.procount - tabo.procount % 20);
	});
	j_div.append(j_a);

	tabo.callback.fire();
    }
}

function square_scoreboard_listadd(e_table,rank,userid,nickname,proidlist,prolist){
    var i;
    
    var proo;
    var j_tr;
    var j_td;
    var j_a;

    j_tr = $('<tr class="item"></tr>');
    j_td = $('<td class="rank"></td>');
    j_td.text(rank);
    j_tr.append(j_td);
    j_td = $('<td class="name"></td>');
    j_a = $('<a class="link"></a>');
    j_a.attr('href','/expoj/index.html?page=user_' + userid);
    j_a.text(nickname);
    j_a.off('click').on('click',function(userid){return function(e){
	page_switch('user_' + userid);
	return false;
    }}(userid));
    j_td.append(j_a);
    j_tr.append(j_td);

    for(i = 0;i < proidlist.length;i++){
	j_td = $('<td class="problem"></td>');
	if(proidlist[i] in prolist){
	    proo = prolist[proidlist[i]];
	    if(proo.accepttime == null){
		j_td.text('-/' + proo.submitcount);
	    }else{
		j_td.text(Math.round(proo.accepttime / 14400) + '/' + proo.submitcount);
		j_td.css('background-color','#222222');
	    }
	}
	j_tr.append(j_td);
    }

    $(e_table).append(j_tr);
}
function square_scoreboard_update(){
    data_paramo.square_scoreboard_list = {
	'squareid':parseInt(square_pageo.squareid),
    }

    data_update(true);
}
function square_scoreboard_callback(res){
    var i;

    var reto;
    var tabo;
    var proidlist;
    var scoreboardlist;
    var scoreboardo;
    var e_table;
    var j_tr;
    var j_th;
    var j_a;

    if((reto = res.square_scoreboard_list) === undefined){
	return;
    }

    if(reto == null){
	delete data_paramo.square_scoreboard_list;
    }else{
	tabo = square_pageo.tabo_scoreboard;
	proidlist = reto.proidlist;
	scoreboardlist = reto.scoreboardlist;

	j_tab = $(square_page.find('div.square_scoreboard')[0]);
	j_tab.css('width',(192 + 64 + proidlist.length * 104) + 'px');

	e_table = j_tab.find('table.list')[0];

	j_tr = $(e_table.rows[0]);
	j_tr.empty();
	j_tr.append('<th class="rank">#</th>');
	j_tr.append('<th class="name">Name</th>');
	for(i = 0;i < proidlist.length;i++){
	    j_th = $('<th class="problem"></th>');
	    j_a = $('<a class="link"></a>');
	    j_a.attr('href','/expoj/index.html?page=problem_' + proidlist[i]);
	    j_a.text(proidlist[i]);
	    j_a.off('click').on('click',function(proid){return function(e){
		page_switch('problem_' + proid);
		return false;
	    }}(proidlist[i]));
	    j_th.append(j_a);
	    j_tr.append(j_th);
	}

	for(i = e_table.rows.length - 1;i > 0;i--){
	    e_table.deleteRow(i);
	}

	for(i = 0;i < scoreboardlist.length;i++){
	    scoreboardo = scoreboardlist[i]; 
	    square_scoreboard_listadd(
		    e_table,
		    scoreboardo.rank,
		    scoreboardo.userid,
		    scoreboardo.nickname,
		    proidlist,
		    scoreboardo.prolist);
	}

	tabo.callback.fire();
    }
}

function squaremg_pageswitch(on){
    square_update();
    $('#page_squaremg').fadeIn('slow');
}
function squaremg_square_listadd(e_table,idx,squareid,squarename,starttime,endtime){
    var j_tr; 

    if((e_table.rows.length - 1) <= idx){
	j_tr = $($(e_table).find('tr.ori')[0]).clone(true);
	j_tr.removeClass('ori');
	$(e_table).append(j_tr);
    }else{
	j_tr = $(e_table.rows[idx + 1]);
    }

    $(j_tr.find('td.name')).text(squarename);
    $(j_tr.find('td.time')).html(starttime.match(/(.*)[\.,\+]/)[1] + '<br/>' + endtime.match(/(.*)[\.,\+]/)[1]);
    j_tr.data('squareid',squareid);

    j_tr.show();
}
