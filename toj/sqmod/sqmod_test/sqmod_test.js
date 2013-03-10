var sqmod_test = function(that,j_page){
    var pro_pbox = new class_sqmod_test_pro_pbox(that.sqid,j_page);

    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    index.title_set('TOJ-' + that.sqname);

	    index.tab_add('pro','/toj/sq/' + that.sqid + '/','題目');

	    if(url_dpart[0] == ''){
		com.url_update('/toj/sq/' + that.sqid + '/pro/');
		return 'stop';
	    }
	}else if(direct == 'out'){
	    index.tab_empty();
	}

	return 'cont';
    };
    that.node.child_set(pro_pbox.node);
};

var class_sqmod_test_pro_pbox = function(sqid,j_page){
    var that = this;
    var j_pbox = j_page.find('div.pro_pbox');
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
	    j_a = j_item.find('td.name > a');
	    j_a.attr('href','/toj/pro/' + proo.proid + '/');
	    j_a.text(proo.proname);

	    bscore = proo.bscore;
	    fscore = proo.full_score;
	    j_item.find('td.bscore').text(Math.floor(bscore) + ' / ' + Math.floor(fscore));

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

	    j_item.find('td.team').remove();
	    for(i = 0;i < proo.tscore.length;i++){
		j_team = $('<td class="team"></td>');
		j_team.text(Math.floor(proo.tscore[i]));
		j_item.append(j_team);
	    }
	}
    };
    var pro_listnew = function(proo){
	var j_item;	
	
	j_item = $('<tr class="item"><td class="no"></td><td class="name"><a></a></td><td class="bscore"></td></tr>');
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
	j_prog.html(Math.floor(baseline.pass_score) + '&nbsp');
	off += ratio;
	ratio = (baseline.good_score - baseline.pass_score) * 100 / baseline.total_score;
	j_prog = j_progbox.find('div.good');
	j_prog.css('left',off + '%');
	j_prog.css('width',ratio + '%');
	j_prog.html(Math.floor(baseline.good_score) + '&nbsp');
	off += ratio;
	ratio = 100 - off;
	j_prog = j_progbox.find('div.total');
	j_prog.css('left',off + '%');
	j_prog.css('width',ratio + '%');
	j_prog.html(Math.floor(baseline.total_score) + '&nbsp');

	ratio = totalscore * 100 / baseline.total_score;
	j_prog = j_progbox.find('div.prog');
	j_prog.css('width',ratio + '%');
	j_prog.html(Math.floor(totalscore) + '&nbsp');
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

	$.post('/toj/sqmod/sqmod_test/sqmod_test.php',{'action':'get_user_stat','data':JSON.stringify({'sqid':sqid,'display_team':true})},function(res){
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
	    var j_head;
	    var j_team;
	    var j_a;
	    var j_item;

	    if(res[0] != 'E'){
		reto = JSON.parse(res);
		team = reto.team;
		prostat = reto.prostat;

		j_list = j_pbox.find('table.prolist');
		if(team != undefined){
		    j_head = j_list.find('tr.head');
		    j_head.find('th.team').remove();
		    for(i = 0;i < team.length;i++){
			teamo = team[i];

			j_team = $('<th class="team"><a></a></th>');
			j_a = j_team.find('a');
			j_a.attr('href','/toj/user/' + teamo.uid + '/')
			j_a.text(teamo.name);

			for(j = 0;j < teamo.prostat.length;j++){
			    if(teamo.prostat[j].tried == true){
				promap[teamo.prostat[j].proid].tscore[i] = teamo.prostat[j].best_score;
			    }else{
				promap[teamo.prostat[j].proid].tscore[i] = 0;
			    }
			}

			j_head.append(j_team);
		    }

		    j_pbox.find('table.stat tr.team_prog').show();
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

		prog_set(j_pbox.find('table.stat div.user_prog'),reto.base_line,user_total);	
		prog_set(j_pbox.find('table.stat div.team_prog'),reto.team_base_line,team_total);	

		setTimeout(prostat_refresh,2000);
	    }
	});
    };

    that.node = new vus.node('pro');

    that.__super();

    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    index.tab_hl('pro');
	    that.fadein(j_pbox);
	    refresh_flag = true;

	    $.post('/toj/sqmod/sqmod_test/sqmod_test.php',{'action':'get_prolist','data':JSON.stringify({'sqid':sqid})},function(res){
		var i;
		var reto; 
		var proo;
		var j_list;
		var j_item;

		if(res[0] != 'E'){
		    reto = JSON.parse(res);

		    promap = new Array;
		    j_list = j_pbox.find('table.prolist');
		    console.log(j_pbox.length);
		    for(i =  0;i < reto.length;i++){
			proo = reto[i];
			proo.bscore = 0;
			proo.tscore = new Array;
			proo.tried = false;
			if(proo.hidden == false || user.level == -1){
			    promap[proo.proid] = proo;
			    j_item = pro_listnew(proo);
			    j_list.append(j_item);
			}
		    }	

		    prostat_refresh(); 
		}
	    });
	}else if(direct == 'out'){
	    index.tab_ll('pro');
	    that.fadeout(j_pbox);
	    refresh_flag = false;
	}

	return 'cont';
    };
}; __extend(class_sqmod_test_pro_pbox,class_com_pbox);
