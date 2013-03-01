var sqmod_test = {
    init:function(that,j_page){
	var pro_tab = new class_sqmod_test_pro_tab(that);

	that.export_urlchange = function(direct){
	    var _in = function(){
		that.fadein(j_page);

		that.addtab('pro',pro_tab);
		index.addtab('pro','/toj/sq/' + that.sqid + '/','題目');

		_change();
	    };
	    var _out = function(){
		that.fadeout(j_page);
		index.emptytab();
		that.tab_urlchange(null);
	    };
	    var _change = function(){
		var tabname;

		tabname = common.geturlpart()[2];
		if(!(tabname in that.tab_list)){
		    tabname = 'pro';
		    common.replaceurl('/toj/sq/' + that.sqid + '/pro/');
		}
		that.tab_urlchange(tabname);
	    }
	    
	    if(direct == 'in'){
		_in();
	    }else if(direct == 'out'){
		_out();
	    }else if(direct == 'same'){
		_change();
	    }
	}
    }
};

var class_sqmod_test_pro_tab = function(paobj){
    var that = this;
    var j_tab = $('#index_page > [page="sq"] > [tab="pro"]');
    var promap = null;

    var pro_listset = function(j_item,proo){
	var i;

	var bscore;
	var fscore;
	var ratio;
	var j_a;
	var j_team;

	if(proo != null){
	    j_item.attr('proid',proo.proid);

	    j_item.find('td.no').text(proo.prono);
	    j_a = j_item.find('td.name > a.link');
	    j_a.attr('href','/toj/pro/' + proo.proid + '/');
	    j_a.text(proo.proname);

	    bscore = proo.bscore;
	    fscore = proo.full_score;
	    j_item.find('td.bscore').text(bscore + ' / ' + fscore);

	    if(proo.tried == false){
		j_item.css('border-color','#1C1C1C');
	    }else{
		ratio = bscore / fscore;
	    
		if(ratio < 0.6){
		    j_item.css('border-color','#FF0000');
		}else if(ratio < 0.8){
		    j_item.css('border-color','#00FF00');
		}else if(ratio < 1){
		    j_item.css('border-color','#FFFF00');
		}else{
		    j_item.css('border-color','#FFFFFF');
		}
	    }

	    j_team = j_item.find('td.team');
	    j_team.hide();
	    for(i = 0;i < proo.tscore.length;i++){
		$(j_team[i]).text(proo.tscore[i]);
		$(j_team[i]).show();	
	    }
	}
    };
    var pro_listnew = function(proo){
	var j_item;	
	
	j_item = $('<tr class="item"><td class="no"></td><td class="name"><a class="link"></a></td><td class="bscore"></td><td class="team"></td><td class="team"></td><td class="team"></td><td class="team"></td></tr>');
	pro_listset(j_item,proo);

	return j_item;
    };
    var prog_set = function(j_progbox,baseline,totalscore){
	var off;
	var ratio;
	var j_prog;

	off = 0;
	ratio = baseline.pass_score * 100 / baseline.total_score;
	j_prog = j_progbox.find('div.pass');
	j_prog.css('width',ratio + '%');
	j_prog.html(baseline.pass_score + '&nbsp');
	off += ratio;
	ratio = (baseline.good_score - baseline.pass_score) * 100 / baseline.total_score;
	j_prog = j_progbox.find('div.good');
	j_prog.css('left',off + '%');
	j_prog.css('width',ratio + '%');
	j_prog.html(baseline.good_score + '&nbsp');
	off += ratio;
	ratio = 100 - off;
	j_prog = j_progbox.find('div.total');
	j_prog.css('left',off + '%');
	j_prog.css('width',ratio + '%');
	j_prog.html(baseline.total_score + '&nbsp');

	ratio = totalscore * 100 / baseline.total_score;
	j_prog = j_progbox.find('div.prog');
	j_prog.css('width',ratio + '%');
	j_prog.html(totalscore + '&nbsp');
	if(totalscore < baseline.pass_score){
	    ratio = totalscore / baseline.pass_score;
	    j_prog.css('background-color','rgba(255,' + Math.round(64 * ratio) + ',0,0.8)');
	}else if(totalscore < baseline.good_score){
	    ratio = (totalscore - baseline.pass_score) / (baseline.good_score - baseline.pass_score);
	    j_prog.css('background-color','rgba(' + Math.round(128 * ratio) + ',255,0,0.8)');
	}else if(totalscore < baseline.total_score){
	    ratio = (totalscore - baseline.good_score) / (baseline.total_score - baseline.good_score);
	    j_prog.css('background-color','rgba(255,255,' + Math.round(128 * ratio) + ',0.8)');
	}else{
	    j_prog.css('background-color','rgba(255,255,255,0.8)');
	}
    }
    var prostat_refresh = function(){
	if(refresh_flag == false){
	    return;
	}

	$.post('/toj/sqmod/sqmod_test/sqmod_test.php',{'action':'get_user_stat','data':JSON.stringify({'sqid':paobj.sqid,'display_team':true})},function(res){
	    var i;
	    var j;

	    var reto;
	    var team;
	    var teamo;
	    var prostat;
	    var prostato;
	    var proo;
	    var user_total;
	    var team_total;
	    var maxscore;
	    var j_list;
	    var j_team;
	    var j_a;
	    var j_item;

	    if(res[0] != 'E'){
		reto = JSON.parse(res);
		team = reto.team;
		prostat = reto.prostat;

		j_list = j_tab.find('table.prolist');
		if(team != undefined){
		    j_team = j_list.find('th.team');
		    for(i = 0;i < team.length;i++){
			teamo = team[i];

			j_a = j_team.find('a.link');
			$(j_a[i]).attr('href','/toj/user/' + teamo.uid + '/')
			$(j_a[i]).text(teamo.name);

			for(j = 0;j < teamo.prostat.length;j++){
			    if(teamo.prostat[j].tried == true){
				promap[teamo.prostat[j].proid].tscore[i] = teamo.prostat[j].best_score;
			    }else{
				promap[teamo.prostat[j].proid].tscore[i] = 0;
			    }
			}

			j_team.show();
		    }

		    j_tab.find('table.stat tr.team_prog').show();
		}

		user_total = 0;
		team_total = 0;
		for(i = 0;i < prostat.length;i++){
		    prostato = prostat[i];
		    proo = promap[prostato.proid];
		    proo.bscore = prostato.best_score;
		    proo.tried = prostato.tried;
		    user_total += prostato.best_score;
		    j_item = j_list.find('[proid = "' + prostato.proid + '"]');
		    if(j_item.length > 0){
			pro_listset(j_item,proo);
		    }

		    maxscore = proo.bscore;
		    for(j = 0;j < proo.tscore.length;j++){
			maxscore = Math.max(maxscore,proo.tscore[j]);
		    }
		    team_total += maxscore;
		}

		prog_set(j_tab.find('table.stat div.user_prog'),reto.base_line,user_total);	
		prog_set(j_tab.find('table.stat div.team_prog'),reto.team_base_line,team_total);	

		setTimeout(prostat_refresh,2000);
	    }
	});
    };

    that.__super(paobj);

    that.urlchange = function(direct){
	if(direct == 'in'){
	    that.fadein(j_tab);
	    refresh_flag = true;

	    $.post('/toj/sqmod/sqmod_test/sqmod_test.php',{'action':'get_prolist','data':JSON.stringify({'sqid':paobj.sqid})},function(res){
		var i;
		var reto; 
		var proo;
		var j_list;
		var j_item;

		if(res[0] != 'E'){
		    reto = JSON.parse(res);

		    promap = new Array;
		    j_list = j_tab.find('table.prolist');
		    for(i =  0;i < reto.length;i++){
			proo = reto[i];
			proo.bscore = 0;
			proo.tscore = new Array;
			proo.tried = false;
			if(proo.hidden == false){
			    promap[proo.proid] = proo;
			    j_item = pro_listnew(proo);
			    j_list.append(j_item);
			}
		    }	

		    prostat_refresh(); 
		}
	    });

	}else if(direct == 'out'){
	    that.fadeout(j_tab);
	    refresh_flag = false;
	}
    };
}; __extend(class_sqmod_test_pro_tab,class_common_tab);
