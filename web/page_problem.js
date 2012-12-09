var problem_page;
var problem_pageo;
var problem_log_tab;
var problem_submitcode;

function problem_init(){
    var j_tab;
    var j_div;

    problem_page = $('#page_problem');
    problem_pageo = {
	'proid':null
    };
    problem_log_tab = 'acceptsubmit';

    problem_submitcode = CodeMirror($('#mask_problem_code > div.nor_mask_box > div.code')[0],{
	mode:'text/x-c++src',
	theme:'lesser-dark',
	lineNumbers:true,
	matchBrackets:true,
	indentUnit:4
    });
    problem_submitcode.getWrapperElement().style.width = '100%';
    problem_submitcode.getWrapperElement().style.height = '100%';
    problem_submitcode.getScrollerElement().style.width = '100%';
    problem_submitcode.getScrollerElement().style.height = '100%';

    j_tab = $('#problem_log_acceptsubmit')
    j_tab.data('tabo',{
	'result':0,
	'submitid':2147483647,
	'submitoff':0,
	'submitcount':0,
	'callback':$.Callbacks()
    });
    data_callback.add(function(j_tab){return function(res){
	problem_log_submit_callback(j_tab,res);
    }}(j_tab));

    j_tab = $('#problem_log_allsubmit')
    j_tab.data('tabo',{
	'result':-100,
	'submitid':2147483647,
	'submitoff':0,
	'submitcount':0,
	'callback':$.Callbacks()
    });
    data_callback.add(function(j_tab){return function(res){
	problem_log_submit_callback(j_tab,res);
    }}(j_tab));

    $('#mask_problem_log > div.nor_mask_head > div.nor_tab > div.button').on('click',function(e){
	problem_log_tabswitch($(this).attr('tab'));
    });

    
    data_callback.add(function(res){
	var proid;
	var proo;
	var tds;
	var j_name;
	var j_content;

	if((proo = res.problem_view) === undefined){
	    return;
	}

	if((proid = problem_pageo.proid) == null){
	    return;
	}

	tds = problem_page.find('div.problem_info > table.info td.info');
	j_name = $('#index_head_content');
	j_content = $(problem_page.find('div.problem_view > div.content')[0]);
	
	if(data_paramo.problem_view.infoonly == true){
	    $($(tds[3]).find('a.info')[0]).text(proo.acceptcount + '/' + proo.submitcount);	
	}else{
	    if(proo == null){
		$(tds[1]).text(proid);	
		j_name.html('<span style="color:#FFA0A0">Page not found</span>');

		delete data_paramo.problem_view;
	    }else{
		$(tds[1]).text(proid);	
		$($(tds[3]).find('a.info')[0]).text(proo.acceptcount + '/' + proo.submitcount);	
		$(tds[5]).text(proo.timelimit);	
		$(tds[7]).text(proo.memlimit);	
		j_name.text(proo.proname);
		j_content.html(problem_textconvert(proo.protext));
		data_paramo.problem_view.infoonly = true;
	    }
	    $('#mask_problem_code > div.nor_mask_head > div.title').text('ProID:' + proid); 

	    problem_page.fadeIn('slow');
	    window.history.replaceState('problem',document.title,'/expoj/index.html?page=problem_' + proid);
	}
    });
}
function problem_pageswitch(pagename,on){
    var proid;

    if(on){
	proid = pagename.match(/^problem_(.+)/)[1];
	
	$('#index_head_title').text('ExpOJ-ProID:' + proid);

	problem_page.attr('id','page_problem_' + proid);
	problem_pageo.proid = proid;

	data_paramo.problem_view = {
	    'infoonly':false,
	    'proid':parseInt(proid)
	};
	data_update(true);
    }else{
	delete data_paramo.problem_view;
	delete data_paramo.problem_log_submit_acceptlist;
	delete data_paramo.problem_log_submit_alllist;

	problem_pageo.proid = null;
    }
}
function problem_logswitch(on){
    var j_tab;
    var tabo;

    if(on){
	problem_log_tab = 'acceptsubmit';
	$('#mask_problem_log > div.nor_mask_head > div.nor_tab > [tab="acceptsubmit"]').addClass('button_s');
	$('#mask_problem_log > div.nor_mask_head > div.nor_tab > [tab="allsubmit"]').removeClass('button_s');

	$('#mask_problem_log > div.nor_mask_head > div.title').text('ProID:' + problem_pageo.proid);

	j_tab = $('#problem_log_allsubmit');
	j_tab.hide();
	problem_log_submit_update(j_tab);

	j_tab = $('#problem_log_acceptsubmit');
	j_tab.hide();
	tabo = j_tab.data('tabo');

	tabo.callback.add(function(){
	    j_tab.show();
	    tabo.callback.remove(arguments.callee);
	});

	problem_log_submit_update(j_tab);

	page_maskswitch($('#mask_problem_log'),true);
    }else{
	delete data_paramo.problem_log_submit_acceptlist;
	delete data_paramo.problem_log_submit_alllist;

	page_maskswitch($('#mask_problem_log'),false);
    }
}
function problem_textconvert(text){
    var ret;
    var i;

    ret = '';
    for(i = 0;i < text.length;i++){
	if(text[i] != '\r' && text[i] != '\n'){
	    ret += text[i];
	}else if(text[i] == '\n'){
	    ret += '<br/>';
	}
    }

    return ret;
}

function problem_log_tabswitch(tabname){
    var j_tab;
    var tabo;
    var show = function(){
	problem_log_tab = tabname;

	j_tab = $('#problem_log_' + problem_log_tab);
	switch(problem_log_tab){
	    case 'acceptsubmit':
		tabo = j_tab.data('tabo');
		tabo.callback.add(function(){
		    j_tab.fadeIn('fast');
		    tabo.callback.remove(arguments.callee);
		});

		problem_log_submit_update(j_tab);
		break;
	    case 'allsubmit':
		tabo = j_tab.data('tabo');
		tabo.callback.add(function(){
		    j_tab.fadeIn('fast');
		    tabo.callback.remove(arguments.callee);
		});

		problem_log_submit_update(j_tab);
		break;
	}
    }

    if(problem_log_tab == tabname){
	return -1;
    }

    $('#mask_problem_log > div.nor_mask_head > div.nor_tab > [tab="' + problem_log_tab + '"]').removeClass('button_s');
    $('#problem_log_' + problem_log_tab).fadeOut('fast',show);

    $('#mask_problem_log > div.nor_mask_head > div.nor_tab > [tab="' + tabname + '"]').addClass('button_s');
}

function problem_log_submit_listadd(e_table,idx,submitid,userid,nickname,time,runtime,score,light){
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
    
    j_a = $(j_tr.find('td.nickname > a.link')[0]);
    j_a.attr('href','/expoj/index.html?page=user_' + userid);
    j_a.text(nickname);
    j_a.off('click').on('click',function(e){
	problem_logswitch(false);
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
	problem_log_submit_update(j_tab);
    });

    j_tr.show();
    return j_tr;
}
function problem_log_submit_listchpg(j_tab,submitoff){
    var tabo;
    
    tabo = j_tab.data('tabo');
    if(submitoff >= 0 && submitoff < tabo.submitcount){
	tabo.submitoff = submitoff;
	tabo.laststamp = '_';
	tabo.callback.add(function(){
	    tabo.callback.remove(arguments.callee);
	});
	problem_log_submit_update(j_tab);
    }
}
function problem_log_submit_update(j_tab){
    var tabo;
    var paramo;

    tabo = j_tab.data('tabo');
    paramo = {
	'proid':parseInt(problem_pageo.proid),
	'result':parseInt(tabo.result),
	'submitoff':parseInt(tabo.submitoff),
	'submitid':parseInt(tabo.submitid)
    };
    if(tabo.result == 0){
        data_paramo.problem_log_submit_acceptlist = paramo;
    }else if(tabo.result == -100){
        data_paramo.problem_log_submit_alllist = paramo;
    }

    data_update(true);
}
function problem_log_submit_callback(j_tab,res){
    var reto;
    var tabo;
    var submitlist;

    tabo = j_tab.data('tabo'); 
    if(tabo.result == 0){
	reto = res.problem_log_submit_acceptlist;
    }else if(tabo.result == -100){
	reto = res.problem_log_submit_alllist;
    }
    if(reto != null){
	tabo.submitcount = reto.submitcount;
	submitlist = reto.submitlist;

	if(tabo.result == 0){
	    $('#mask_problem_log > div.nor_mask_head > div.nor_tab > [tab="acceptsubmit"]').text('AC Submit [' + tabo.submitcount+ ']');
	}else if(tabo.result == -100){
	    $('#mask_problem_log > div.nor_mask_head > div.nor_tab > [tab="allsubmit"]').text('All Submit [' + tabo.submitcount+ ']');
	}

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
		j_tr = problem_log_submit_listadd(
			e_table,
			i,
			submito.submitid,
			submito.userid,
			submito.nickname,
			submito.timestamp,
			submito.sumruntime,
			submito.sumscore,
			nor_scoretolight(submito.sumscore,submito.summaxscore));
		j_tr.data('j_tab',j_tab);
		j_tr.data('submitid',submito.submitid);
	    }

	    j_div = $(j_tab.find('div.nor_chpg')[0]);
	    j_div.empty();

	    j_a = nor_new_chpgbutton('«',function(){
		problem_log_submit_listchpg(j_tab,0);
	    });
	    j_div.append(j_a);

	    j_a = nor_new_chpgbutton('‹',function(){
		problem_log_submit_listchpg(j_tab,(tabo.submitoff - 20));
	    });
	    j_div.append(j_a);

	    offs = Math.max(0,tabo.submitoff - 100);
	    if((offe = Math.min(tabo.submitcount,offs + 200)) == tabo.submitcount){
		offs = Math.max(0,(offe - offe % 20) - 180);
	    }
	    for(i = offs;i < offe;i += 20){
		j_a = nor_new_chpgbutton((i / 20 + 1),function(){
		    problem_log_submit_listchpg(j_tab,$(this).data('submitoff'));
		});
		j_a.data('submitoff',i);

		if(i == tabo.submitoff){
		    j_a.addClass('nor_chpg_s');
		}

		j_div.append(j_a);
	    }

	    j_a = nor_new_chpgbutton('›',function(){
		problem_log_submit_listchpg(j_tab,(tabo.submitoff + 20));
	    });
	    j_div.append(j_a);

	    j_a = nor_new_chpgbutton('»',function(){
		problem_log_submit_listchpg(j_tab,(tabo.submitcount - tabo.submitcount % 20));
	    });
	    j_div.append(j_a);
	}
	if(tabo.submitid != null){
	    var i;

	    var e_table;
	    var j_tr;
	    var j_td;
	    var tds;
	    var j_a;
	    var submito;
	    var partstatus;
	    var partscore;
	    var partruntime;
	    var partpeakmem;

	    if(submitlist.length == 0){
		e_table = j_tab.find('div.submitinfo > table.list')[0];
		for(i = e_table.rows.length - 1;i > 0;i--){
		    e_table.deleteRow(i);
		}
		
		e_table = j_tab.find('div.submitinfo > table.info')[0];
		tds = $(e_table).find('td');
		$(tds[1]).text('');
		$(tds[3]).text('');
		$(tds[7]).text('');
		j_a = $($(e_table).find('a')[0]);
		j_a.attr('href',null);
		j_a.text('');
		j_a.off('click');
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
		$(tds[3]).text(submito.proid);
		$(tds[7]).text(submito.sumscore);

		j_a = $($(e_table).find('a')[0]);
		j_a.attr('href','/expoj/index.html?page=user_' + submito.userid);
		j_a.text(submito.nickname);
		j_a.off('click').on('click',function(userid){return function(e){
		    problem_logswitch(false);
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

function problem_codeswitch(on){
    if(user_usero == null){
	page_switch('login');
	return;
    }

    if(on){
	$($('#mask_problem_code > div.nor_mask_head > div.error')[0]).empty();

	page_maskswitch($('#mask_problem_code'),true);
	problem_submitcode.setValue('');
    }else{
	problem_submitcode.setValue('');
	page_maskswitch($('#mask_problem_code'),false);
    }
}
function problem_code_submit(){
    $.post('problem_code_submit.php',
	    {'proid':problem_pageo.proid,'code':problem_submitcode.getValue()},
	    function(res){
		var j_div;

		j_div = $($('#mask_problem_code > div.nor_mask_head > div.error')[0]);
		if(res[0] != 'E'){
		    problem_submitcode.setValue('');
		    page_maskswitch($('#mask_problem_code'),false);
		}else if(res == 'Euser'){
		    page_switch('login');
		}else if(res == 'Ecode'){
		    j_div.text('Ccde長度超過64KB');
		}else if(res == 'Elimit'){
		    j_div.text('Submit間隔必須大於10s');
		}
	    }
    );
}
