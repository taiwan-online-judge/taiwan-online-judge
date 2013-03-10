var smod_test = function(that,j_mbox){
    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    that.fadein(j_mbox);
	    $.post('/toj/smod/smod_test/smod_test.php',{'subid':JSON.stringify(that.subid)},function(res){
		var i;
		var reto;
		var result;
		var pro_set;
		var reso;
		var j_table;
		var j_item;
		var j_a;

		if(res[0] == 'E'){
		    if(res == 'Enull'){
			j_mbox.find('h1.msg').show();
		    }
		}else{
		    reto = JSON.parse(res);
		    result = reto.result;
		    pro_set = reto.pro_setting;

		    j_table = j_mbox.find('table.subinfo');
		    j_a = j_table.find('td.proid > a');
		    j_a.attr('href','/toj/pro/' + that.subo.proid + '/');
		    j_a.text(that.subo.proid);

		    j_a = j_table.find('td.nickname > a');
		    j_a.attr('href','/toj/user/' + that.subo.uid+ '/');
		    j_a.text(that.subo.nickname);
		    
		    j_table.find('td.runtime').text(that.subo.runtime);
		    j_table.find('td.memory').text(that.subo.memory);
		    j_table.find('td.result').text(RESULTMAP[that.subo.result]);
		    j_table.find('td.score').text(that.subo.score);
		    j_table.find('td.time').text(com.get_datestring(that.subo.submit_time,true));
		    j_table.find('td.lang').text(com.get_lang(that.subo.lang)[0]);

		    j_table.show();

		    j_table = j_mbox.find('table.subinfolist');
		    for(i = 0;i < result.length;i++){
			reso = result[i];
			j_item = $('<tr class="item"><td class="runtime"></td><td class="memory"></td><td class="status"></td><td class="score"></td><td class="errmsg"></td></tr>')
			j_item.find('td.runtime').text(reso.runtime);
			j_item.find('td.memory').text(reso.memory);
			j_item.find('td.status').text(RESULTMAP[reso.status]);
			j_item.find('td.score').text(reso.score + ' / ' + pro_set.score[i]);
			if(reso.errmsg != undefined){
			    j_item.find('td.errmsg').text(reso.errmsg);
			}

			j_table.append(j_item);
		    }
		    j_table.show();
		}
	    });
	}else if(direct == 'out'){
	    that.fadeout(j_mbox);
	}

	return 'cont';
    };
};
