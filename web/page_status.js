var status_judgestat;
var status_tab;

function status_init(){
    var j_tab;
    var j_div;
    var as;

    status_judgestat = new Array();
    status_judgestat[0] = 'AC';
    status_judgestat[1] = 'WA';
    status_judgestat[2] = 'TLE';
    status_judgestat[3] = 'MLE';
    status_judgestat[4] = 'RF';
    status_judgestat[5] = 'RE';
    status_judgestat[6] = 'CE';
    status_judgestat[7] = 'ERR';
    status_judgestat[100] = 'WAIT';

    j_tab = $('#status_allsubmit');
    j_tab.data('tabo',{
	'useronly':false,
	'submitid':2147483647,
	'submitoff':0,
	'submitcount':0,
	'callback':$.Callbacks()
    });
    data_callback.add(function(j_tab){return function(res){
	status_submit_callback(j_tab,res);
    }}(j_tab));

    j_tab = $('#status_usersubmit');
    j_tab.data('tabo',{
	'useronly':true,
	'submitid':2147483647,
	'submitoff':0,
	'submitcount':0,
	'callback':$.Callbacks()
    });
    user_logincallback.add(function(){
	var j_tab;

	j_tab = $('#status_usersubmit');
	if(user_usero != null){
	    $('#index_headtab_status > [tab="usersubmit"]').show();
	}
    });
    data_callback.add(function(j_tab){return function(res){
	status_submit_callback(j_tab,res);
    }}(j_tab));
    status_submit_update(j_tab);

    $('#index_headtab_status > div.button').on('click',function(e){
	status_tabswitch($(this).attr('tab'));
	return false;
    });
}
function status_pageswitch(on){
    var param;
    var j_tab;
    var tabo;

    if(on){
	param = nor_getparam();
	if(param.tab != undefined){
	    status_tab = param.tab;
	}
	if(status_tab != 'usersubmit' && status_tab != 'allsubmit'){
	    status_tab = 'allsubmit';
	}

	$('#index_head_title').text('ExpOJ-Status');

	$('#index_headtab_status > div.button').removeClass('button_s');
	$('#index_headtab_status > [tab="' + status_tab + '"]').addClass('button_s');
	$('#index_headtab_status').show();

	$('#status_allsubmit').hide();
	$('#status_usersubmit').hide();

	switch(status_tab){
	    case 'allsubmit':
		j_tab = $('#status_allsubmit');
		tabo = j_tab.data('tabo');

		if(param.submitid != undefined){
		    tabo.submitid = param.submitid;
		}
		if(param.submitoff != undefined){
		    tabo.submitoff = param.submitoff;	
		}

		tabo.callback.add(function(){
		    j_tab.show();
		    window.history.replaceState('status',document.title,status_geturl());
		    tabo.callback.remove(arguments.callee);
		});

		status_submit_update(j_tab);
		break;
	    case 'usersubmit':
		j_tab = $('#status_usersubmit');
		tabo = j_tab.data('tabo');

		if(param.submitid != undefined){
		    tabo.submitid = param.submitid;
		}
		if(param.submitoff != undefined){
		    tabo.submitoff = param.submitoff;	
		}

		tabo.callback.add(function(){
		    j_tab.show();
		    window.history.replaceState('status',document.title,status_geturl());
		    tabo.callback.remove(arguments.callee);
		});

		status_submit_update(j_tab);
		break;
	}

	$('#page_status').fadeIn('slow');
    }else{
	delete data_paramo.status_submit_userlist;
	delete data_paramo.status_submit_list;
    }
}
function status_tabswitch(tabname){
    var j_tab;
    var tabo;
    var show = function(){
	status_tab = tabname;

	j_tab = $('#status_' + status_tab);
	switch(status_tab){
	    case 'allsubmit':
		tabo = j_tab.data('tabo')
		tabo.callback.add(function(){
		    j_tab.fadeIn('fast');
		    window.history.pushState('status',document.title,status_geturl());
		    tabo.callback.remove(arguments.callee);
		});

		status_submit_update(j_tab);
		break;
	    case 'usersubmit':
		tabo = j_tab.data('tabo')
		tabo.callback.add(function(){
		    j_tab.fadeIn('fast');
		    window.history.pushState('status',document.title,status_geturl());
		    tabo.callback.remove(arguments.callee);
		});

		status_submit_update(j_tab);
		break;
	}
    }

    if(status_tab == tabname){
	return -1;
    }

    delete data_paramo.status_submit_userlist;
    delete data_paramo.status_submit_list;

    $('#index_headtab_status > [tab="' + status_tab + '"]').removeClass('button_s');
    $('#status_' + status_tab).fadeOut('fast',show);

    $('#index_headtab_status > [tab="' + tabname + '"]').addClass('button_s');
}
function status_geturl(){
    var url;
    var tabo;

    switch(status_tab){
	case 'allsubmit':
	    tabo = $('#status_allsubmit').data('tabo');
	    if(tabo.submitid == null){
		url = '/expoj/index.html?page=status&tab=allsubmit&submitoff=' + tabo.submitoff;
	    }else{
		url = '/expoj/index.html?page=status&tab=allsubmit&submitoff=' + tabo.submitoff + '&submitid=' + tabo.submitid;
	    }
	    break;
	case 'usersubmit':
	    tabo = $('#status_usersubmit').data('tabo');
	    if(tabo.submitid == null){
		url = '/expoj/index.html?page=status&tab=usersubmit&submitoff=' + tabo.submitoff;
	    }else{
		url = '/expoj/index.html?page=status&tab=usersubmit&submitoff=' + tabo.submitoff + '&submitid=' + tabo.submitid;
	    }
	    break;
    }

    return url;
}

function status_submit_listadd(e_table,idx,submitid,proid,userid,nickname,time,result,runtime,score,light){
    var j_tr;
    var j_td;
    var j_a;

    if((e_table.rows.length - 2) <= idx){
	j_tr = $($(e_table).find('tr.ori')[0]).clone(true);
	j_tr.removeClass('ori');
	$(e_table).append(j_tr);
    }else{
	j_tr = $(e_table.rows[idx + 2]);
    }

    $(j_tr.find('td.id')[0]).text(submitid);
    $(j_tr.find('td.time')[0]).text(time.match(/(.*)\./)[1]);
    $(j_tr.find('td.result')[0]).text(result);
    $(j_tr.find('td.runtime')[0]).text(Math.round(parseInt(runtime) / 1000));
    j_td = $(j_tr.find('td.score')[0]);
    j_td.text(score);
    switch(light){
	case 1:
	    j_td.css('color','#FF0000'); 
	    break;
	case 2:
	    j_td.css('color','#00FF00'); 
	    break;
	case 3:
	    j_td.css('color','#FFFF00'); 
	    break;
	case 4:
	    j_td.css('color','#FFFFFF'); 
	    break;
    }
    
    j_a = $(j_tr.find('td.proid > a.link')[0]);
    j_a.attr('href','/expoj/index.html?page=problem_' + proid);
    j_a.text(proid);
    j_a.off('click').on('click',function(e){
	page_switch('problem_' + proid);
	return false;
    });
    
    j_a = $(j_tr.find('td.nickname > a.link')[0]);
    j_a.attr('href','/expoj/index.html?page=user_' + userid);
    j_a.text(nickname);
    j_a.off('click').on('click',function(e){
	page_switch('user_' + userid);
	return false;
    });

    j_tr.off('click').on('click',function(e){
	var j_tab;
	var tabo;

	if(e.target.tagName == 'A'){
	    return;
	}

	j_tab = $(this).data('j_tab');
	tabo = j_tab.data('tabo');
	tabo.submitid = $(this).data('submitid');
	
	tabo.callback.add(function(){
	    window.history.pushState('status',document.title,status_geturl());
	    tabo.callback.remove(arguments.callee);
	});
	status_submit_update(j_tab);
    });

    j_tr.show();
    return j_tr;
}
function status_submit_listchpg(j_tab,submitoff){
    var tabo;
    
    tabo = j_tab.data('tabo');
    if(submitoff >= 0 && submitoff < tabo.submitcount){
	tabo.submitoff = submitoff;
	tabo.callback.add(function(){
	    window.history.pushState('status',document.title,status_geturl());
	    tabo.callback.remove(arguments.callee);
	});
	status_submit_update(j_tab);
    }
}
function status_submit_update(j_tab){
    var tabo;
    var paramo;

    tabo = j_tab.data('tabo');
    paramo = {
	'submitoff':parseInt(tabo.submitoff),
	'submitid':parseInt(tabo.submitid)
    };
    if(tabo.useronly){
	data_paramo.status_submit_userlist = paramo;
    }else{
	data_paramo.status_submit_list = paramo;
    }
     
    data_update(true);
}
function status_submit_callback(j_tab,res){
    var reto;
    var j_tab;
    var tabo;
    var submitlist;

    tabo = j_tab.data('tabo');
    if(tabo.useronly){
	reto = res.status_submit_userlist;
    }else{
	reto = res.status_submit_list;
    }
    if(reto === undefined){
	return;
    }

    if(reto == null){
	if(tabo.useronly){
	    delete data_paramo.status_submit_userlist;
	}else{
	    delete data_paramo.status_submit_list;
	}
    }else{
	tabo.submitcount = reto.submitcount;
	submitlist = reto.submitlist;

	if(tabo.submitoff != null){
	    var i;
	    var j;

	    var e_table;
	    var j_tr;
	    var j_div;
	    var j_a;
	    var submito;
	    var offs;
	    var offe;

	    e_table = j_tab.find('div.submitlist > table.list')[0];
	    for(i = e_table.rows.length - 1;i > 1;i--){
		$(e_table.rows[i]).hide();
	    }

	    for(i = 0;i < submitlist.length - 1;i++){
		submito = submitlist[i];
		j_tr = status_submit_listadd(
			e_table,
			i,
			submito.submitid,
			submito.proid,
			submito.userid,
			submito.nickname,
			submito.timestamp,
			status_judgestat[submito.result],
			submito.sumruntime,
			submito.sumscore,
			nor_scoretolight(submito.sumscore,submito.summaxscore));
		j_tr.data('j_tab',j_tab);
		j_tr.data('submitid',submito.submitid);
	    }

	    j_div = $(j_tab.find('div.nor_chpg')[0]);
	    j_div.empty();

	    j_a = nor_new_chpgbutton('«',function(){
		status_submit_listchpg(j_tab,0);
	    });
	    j_div.append(j_a);

	    j_a = nor_new_chpgbutton('‹',function(){
		status_submit_listchpg(j_tab,(tabo.submitoff - 20));
	    });
	    j_div.append(j_a);

	    offs = Math.max(0,tabo.submitoff - 100);
	    if((offe = Math.min(tabo.submitcount,offs + 200)) == tabo.submitcount){
		offs = Math.max(0,(offe - offe % 20) - 180);
	    }
	    for(i = offs;i < offe;i += 20){
		j_a = nor_new_chpgbutton((i / 20 + 1),function(){
		    status_submit_listchpg(j_tab,$(this).data('submitoff'));
		});
		j_a.data('submitoff',i);

		if(i == tabo.submitoff){
		    j_a.addClass('nor_chpg_s');
		}

		j_div.append(j_a);
	    }

	    j_a = nor_new_chpgbutton('›',function(){
		status_submit_listchpg(j_tab,(tabo.submitoff + 20));
	    });
	    j_div.append(j_a);

	    j_a = nor_new_chpgbutton('»',function(){
		status_submit_listchpg(j_tab,(tabo.submitcount - tabo.submitcount % 20));
	    });
	    j_div.append(j_a);
	}
	if(tabo.submitid != null){
	    var i;

	    var e_table;
	    var tds;
	    var as;
	    var j_tr;
	    var j_td;
	    var submito;
	    var partstatus;
	    var partscore;
	    var partruntime;
	    var partpeakmem;

	    if(submitlist.length == 0){
		e_table = j_tab.find('div.submitinfo > table.info')[0];

		tds = $(e_table).find('td');
		$(tds[1]).text('');
		$(tds[7]).text('');

		as = $(e_table).find('a');
		$(as[0]).attr('href','');
		$(as[0]).text('');
		$(as[0]).off('click');
		$(as[1]).attr('href','');
		$(as[1]).text('');
		$(as[1]).off('click');
	    }else{
		submito = submitlist[submitlist.length - 1];
		tabo.submitid = submito.submitid;
		partstatus = submito.status.split(',');
		partscore = submito.score.split(',');
		partruntime = submito.runtime.split(',');
		partpeakmem = submito.peakmem.split(',');

		e_table = j_tab.find('div.submitinfo > table.list')[0];
		for(i = e_table.rows.length - 1;i > 0;i--){
		    e_table.deleteRow(i);
		}

		for(i = 0;i < partstatus.length;i++){
		    j_tr = $('<tr></tr>');

		    j_td = $('<td></td>');
		    j_td.text(i + 1);
		    j_tr.append(j_td);
		    j_td = $('<td></td>');
		    j_td.text(status_judgestat[parseInt(partstatus[i])]);
		    j_tr.append(j_td);
		    j_td = $('<td></td>');
		    j_td.text(partscore[i]);
		    j_tr.append(j_td);
		    j_td = $('<td></td>');
		    j_td.text(Math.round(parseInt(partruntime[i]) / 1000));
		    j_tr.append(j_td);
		    j_td = $('<td></td>');
		    j_td.text(Math.round(parseInt(partpeakmem[i]) / 1024));
		    j_tr.append(j_td);

		    $(e_table).append(j_tr);
		}

		e_table = j_tab.find('div.submitinfo > table.info')[0];

		tds = $(e_table).find('td');
		$(tds[1]).text(submito.submitid);
		$(tds[7]).text(submito.sumscore);

		as = $(e_table).find('a');
		$(as[0]).attr('href','/expoj/index.html?page=problem_' + submito.proid);
		$(as[0]).text(submito.proid);
		$(as[0]).off('click').on('click',function(proid){return function(e){
		    page_switch('problem_' + proid);
		    return false;
		}}(submito.proid));
		$(as[1]).attr('href','/expoj/index.html?page=user_' + submito.userid);
		$(as[1]).text(submito.nickname);
		$(as[1]).off('click').on('click',function(userid){return function(e){
		    page_switch('user_' + userid);
		    return false;
		}}(submito.userid));

		if(user_usero != null && submito.userid == user_usero.userid){
		    $(j_tab.find('div.submitinfo > div > div.nor_button')[0]).show();
		}else{
		    $(j_tab.find('div.submitinfo > div > div.nor_button')[0]).hide();
		}
	    }
	}

	tabo.callback.fire();
    }
}

function status_viewcode(submitid){
    window.open('/expoj/viewcode.html?submitid=' + submitid);
}
