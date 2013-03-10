var pmod_test = function(that,j_pbox){
    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    that.fadein(j_pbox);

	    j_pbox.find('div.info > h2.proid').text('ProID:' + that.proid);
	    $.post('/toj/pmod/pmod_test/pmod_test.php',{'proid':JSON.stringify(that.proid)},function(res){
		var i;
		var reto;
		var seto;
		var j_table;
		var j_item;

		if(res[0] != 'E'){
		    reto = JSON.parse(res);
		    seto = reto.set;
		    index.content_set($('<span>' + that.proname + '</span>'));
		    j_pbox.find('div.content').html(reto.content);

		    $.post('/toj/php/problem.php',{'action':'get_pro_stat','data':JSON.stringify({'proid':that.proid})},function(res){
			var reto

			if(res[0] != 'E'){
			    reto = JSON.parse(res);
			    j_pbox.find('div.info > table.statlist td.bscore').text(reto.score);
			    if(reto.tried == false){
				j_pbox.find('div.info > table.statlist td.bscore').css('color','#1C1C1C');
				j_pbox.find('div.info > table.statlist td.stat').text('未嘗試');
			    }else{
				if(reto.score < 60){
				    j_pbox.find('div.info > table.statlist td.bscore').css('color','#FF0000');
				}else if(reto.score < 80){
				    j_pbox.find('div.info > table.statlist td.bscore').css('color','#00FF00');
				}else if(reto.score < 100){
				    j_pbox.find('div.info > table.statlist td.bscore').css('color','#FFFF00');
				}else{

				    j_pbox.find('div.info > table.statlist td.bscore').css('color','#FFFFFF');
				}

				if(reto.is_ac == true){
				    j_pbox.find('div.info > table.statlist td.stat').text('已通過');
				}else{
				    j_pbox.find('div.info > table.statlist td.stat').text('已嘗試');
				}
			    }
			}
		    });

		    j_pbox.find('div.info > table.limitlist td.timelimit').text(seto.timelimit + ' ms');
		    j_pbox.find('div.info > table.limitlist td.memlimit').text(seto.memlimit + ' KB');

		    j_table = j_pbox.find('table.scorelist');
		    j_table.find('tr.item').remove();
		    for(i = 0;i < seto.count;i++){
			j_item = $('<tr class="item"><td class="no"></td><td class="score"></td></tr>');
			j_item.find('td.no').text(i + 1);
			j_item.find('td.score').text(seto.score[i]);
			j_table.append(j_item); 
		    }

		    MathJax.Hub.Queue(["Typeset",MathJax.Hub,j_pbox[0]]);
		}
	    });
	}else if(direct == 'out'){
	    that.fadeout(j_pbox);
	}

	return 'cont';
    };

    j_pbox.find('div.info > button.submit').on('click',function(e){
	that.submit();
    });
};
