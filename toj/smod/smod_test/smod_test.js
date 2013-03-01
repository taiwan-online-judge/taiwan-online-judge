var smod_test = {
    init:function(that,j_mbox){
	that.export_switchchange = function(direct){
	    if(direct == 'in'){
		that.fadein(j_mbox);
		$.post('/toj/smod/smod_test/smod_test.php',{'subid':JSON.stringify(that.subid)},function(res){
		    var i;
		    var result;
		    var reso;
		    var j_table;
		    var j_item;


		    if(res[0] == 'E'){
			if(res == 'Enull'){
			    j_mbox.find('h1.msg').show();
			}
		    }else{
			result = JSON.parse(res).result;

			j_table = j_mbox.find('table.subinfolist');
			for(i = 0;i < result.length;i++){
			    reso = result[i];
			    j_item = $('<tr class="item"><td class="runtime"></td><td class="memory"></td><td class="status"></td><td class="score"></td><td class="errmsg"></td></tr>')
			    j_item.find('td.runtime').text(reso.runtime);
			    j_item.find('td.memory').text(reso.memory);
			    j_item.find('td.status').text(RESULTMAP[reso.status]);
			    j_item.find('td.score').text(reso.score);
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
	};
    }
};
