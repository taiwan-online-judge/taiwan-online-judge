var pmod_multisub = function(that,j_pbox){
    var probox_add = function(proo){
	var i;

	var j_probox;
	var j_table;
	var j_item;
    
	j_probox = j_pbox.find('table.ori_probox').clone();
	j_probox.removeClass('ori_probox');

	j_probox.find('td.info > h2.partname').text(proo.partname + ' (' + proo.score + '%)');
	j_probox.find('td.content').html(proo.content);

	$.post('/toj/php/problem.php',{'action':'get_pro_stat','data':JSON.stringify({'proid':proo.proid})},function(res){
	    var reto

	    if(res[0] != 'E'){
		reto = JSON.parse(res);
		j_probox.find('td.info > table.statlist td.bscore').text(reto.score);
		if(reto.tried == false){
		    j_probox.find('td.info > table.statlist td.bscore').css('color','#1C1C1C');
		    j_probox.find('td.info > table.statlist td.stat').text('未嘗試');
		}else{
		    if(reto.score < 60){
			j_probox.find('td.info > table.statlist td.bscore').css('color','#FF0000');
		    }else if(reto.score < 80){
			j_probox.find('td.info > table.statlist td.bscore').css('color','#00FF00');
		    }else if(reto.score < 100){
			j_probox.find('td.info > table.statlist td.bscore').css('color','#FFFF00');
		    }else{

			j_probox.find('td.info > table.statlist td.bscore').css('color','#FFFFFF');
		    }

		    if(reto.is_ac == true){
			j_probox.find('td.info > table.statlist td.stat').text('已通過');
		    }else{
			j_probox.find('td.info > table.statlist td.stat').text('已嘗試');
		    }
		}
	    }
	});
	
	j_probox.find('td.info > table.limitlist td.timelimit').text(proo.timelimit + ' ms');
	j_probox.find('td.info > table.limitlist td.memlimit').text(proo.memlimit + ' KB');

	j_table = j_probox.find('table.scorelist');
	j_table.find('tr.item').remove();
	for(i = 0;i < proo.partition.count;i++){
	    j_item = $('<tr class="item"><td class="no"></td><td class="score"></td></tr>');
	    j_item.find('td.no').text(i + 1);
	    j_item.find('td.score').text(proo.partition.score[i]);
	    j_table.append(j_item); 
	}

	j_probox.find('td.info > button.submit').on('click',function(e){
	    that.submit(proo.proid);
	});

	j_probox.show();
	j_pbox.append(j_probox);
    }

    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    that.fadein(j_pbox);
	    
	    $.post('/toj/pmod/pmod_multisub/pmod_multisub.php',{'proid':JSON.stringify(that.proid)},function(res){
		var i;
		var reto;

		reto = JSON.parse(res);
		if(reto.redirect != undefined){
		    com.url_push('/toj/pro/' + reto.redirect + '/');
		}else{
		    j_pbox.find('div.main_content').html(reto.main_content);
		    index.content_set($('<span>' + reto.proname + '</span>'));
		    
		    for(i = 0;i < reto.pro.length;i++){
			probox_add(reto.pro[i]);
		    }

		    MathJax.Hub.Queue(["Typeset",MathJax.Hub,j_pbox[0]]);
		}
	    });
	}else if(direct == 'out'){
	    that.fadeout(j_pbox);
	}
    };


};
