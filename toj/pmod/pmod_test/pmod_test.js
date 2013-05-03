var pmod_test = function(that,j_page){
    var j_pro_pbox = j_page.find('div.pro_pbox');
    var j_edit_pbox = j_page.find('div.edit_pbox');
    var edit_pbox = new vus.node('edit');

    var contentbox = CodeMirror(j_edit_pbox.find('div.contentbox')[0],{
	mode:'text/html',
	theme:'lesser-dark',
	lineNumbers:true,
	matchBrackets:true,
	indentUnit:4
    });

    var testdata_update = function(count,scorelist){
	var i;
	var count;
	var trs;
	var j_table;
	var _testdata_listnew = function(idx,score){
	    var j_item = $('<tr class="item"><td class="no"></td><td class="score"><input name="score" type="textbox"></td><td class="file ans"><input name="infile" type="file"></td><td class="file ans"><input name="ansfile" type="file"></td></tr>');

	    j_item.find('td.no').text(idx + 1);
	    j_item.find('[name="score"]').val(score);

	    return j_item;
	};

	trs = j_edit_pbox.find('div.testdata_box > table.table tr.item');
	j_table = j_edit_pbox.find('div.testdata_box > table.table');
	for(i = count;i < trs.length;i++){
	    $(trs[i]).remove();
	}
	if(scorelist != null){
	    for(i = trs.length;i < count;i++){
		j_table.append(_testdata_listnew(i,scorelist[i]));    
	    }
	}else{
	    for(i = trs.length;i < count;i++){
		j_table.append(_testdata_listnew(i,'0'));    
	    }
	}
    };

    that.node.url_chg = function(direct,url_upart,url_dpart,param){
	var _out = function(){
	    index.tab_ll('pro');
	    that.fadeout(j_pro_pbox);
	    index.content_empty();
	};

	if(direct == 'in' || direct == 'same'){
	    if(direct == 'in' && user.level == -1){
		index.tab_add('pro','/toj/pro/' + that.proid + '/','題目');
		index.tab_add('edit','/toj/pro/' + that.proid + '/edit/','設定');
	    }

	    if(url_dpart.length > 0){
		_out();
		return 'cont';
	    }

	    index.tab_hl('pro');
	    that.fadein(j_pro_pbox);

	    j_pro_pbox.find('div.info > h2.proid').text('ProID:' + that.proid);
	    $.post('/toj/pmod/pmod_test/pmod_test.php',{'action':'get_pro_data','data':JSON.stringify({'proid':that.proid})},function(res){
		var i;
		var reto;
		var seto;
		var j_table;
		var j_item;

		if(res[0] != 'E'){
		    reto = JSON.parse(res);
		    seto = reto.set;
		    index.content_set($('<span>' + that.proname + '</span>'));

		    if(seto == null){
			j_pro_pbox.find('div.content').html('<h2>題目未設定</h2>');
			return;
		    }

		    j_pro_pbox.find('div.content').html(reto.content);

		    $.post('/toj/php/problem.php',{'action':'get_pro_stat','data':JSON.stringify({'proid':that.proid})},function(res){
			var reto

			if(res[0] != 'E'){
			    reto = JSON.parse(res);
			    j_pro_pbox.find('div.info > table.statlist td.bscore').text(reto.score);
			    if(reto.tried == false){
				j_pro_pbox.find('div.info > table.statlist td.bscore').css('color','#1C1C1C');
				j_pro_pbox.find('div.info > table.statlist td.stat').text('未嘗試');
			    }else{
				if(reto.score < 60){
				    j_pro_pbox.find('div.info > table.statlist td.bscore').css('color','#FF0000');
				}else if(reto.score < 80){
				    j_pro_pbox.find('div.info > table.statlist td.bscore').css('color','#00FF00');
				}else if(reto.score < 100){
				    j_pro_pbox.find('div.info > table.statlist td.bscore').css('color','#FFFF00');
				}else{

				    j_pro_pbox.find('div.info > table.statlist td.bscore').css('color','#FFFFFF');
				}

				if(reto.is_ac == true){
				    j_pro_pbox.find('div.info > table.statlist td.stat').text('已通過');
				}else{
				    j_pro_pbox.find('div.info > table.statlist td.stat').text('已嘗試');
				}
			    }
			}
		    });

		    j_pro_pbox.find('div.info > table.limitlist td.timelimit').text(seto.timelimit + ' ms');
		    j_pro_pbox.find('div.info > table.limitlist td.memlimit').text(seto.memlimit + ' KB');

		    j_table = j_pro_pbox.find('table.scorelist');
		    j_table.find('tr.item').remove();
		    for(i = 0;i < seto.count;i++){
			j_item = $('<tr class="item"><td class="no"></td><td class="score"></td></tr>');
			j_item.find('td.no').text(i + 1);
			j_item.find('td.score').text(seto.score[i]);
			j_table.append(j_item); 
		    }

		    MathJax.Hub.Queue(["Typeset",MathJax.Hub,j_pro_pbox[0]]);
		}
	    });
	}else if(direct == 'out'){
	    _out();
	}

	return 'cont';
    };

    j_pro_pbox.find('div.info > button.submit').on('click',function(e){
	that.submit();
    });
    j_edit_pbox.find('div.edit_box > button.submit').on('click',function(e){
	timelimit = parseInt(j_edit_pbox.find('div.edit_box > [name="timelimit"]').val());
	memlimit = parseInt(j_edit_pbox.find('div.edit_box > [name="memlimit"]').val());
	content = contentbox.getValue();

	$.post('/toj/pmod/pmod_test/pmod_test.php',{'action':'set_pro_data','data':JSON.stringify({'proid':that.proid,'timelimit':timelimit,'memlimit':memlimit,'content':content})},function(res){
	    com.url_push_back();
	});
    });
    j_edit_pbox.find('div.edit_box > button.cancel').on('click',function(e){
	com.url_push_back();
    });

    j_edit_pbox.find('div.testdata_box > [name="count"]').on('change',function(e){
	testdata_update(parseInt($(this).val()),null);
    });
    j_edit_pbox.find('div.testdata_box > button.submit').on('click',function(e){
	var i;

	var count;
	var score;
	var inputs

	var formdata;
	var inputs;
	var file;

	var j_progbox;
	var j_total;
	var j_prog;

	count = parseInt(j_edit_pbox.find('div.testdata_box > [name="count"]').val());

	inputs = j_edit_pbox.find('div.testdata_box > table.table [name="score"]');
	score = Array();
	for(i = 0;i < count;i++){
	    score[i] = parseInt($(inputs[i]).val());
	}

	formdata = new FormData();
	formdata.append('action','update_pro_testdata');
	formdata.append('data',JSON.stringify({'proid':that.proid,'count':count,'score':score}));

	inputs = j_edit_pbox.find('div.testdata_box > table.table [name="infile"]');
	for(i = 0;i < inputs.length;i++){
	    if((file = inputs[i].files[0]) != undefined){
		formdata.append('infile_' + i,file);
	    }
	}
	inputs = j_edit_pbox.find('div.testdata_box > table.table [name="ansfile"]');
	for(i = 0;i < inputs.length;i++){
	    if((file = inputs[i].files[0]) != undefined){
		formdata.append('ansfile_' + i,file);
	    }
	}

	j_progbox = j_edit_pbox.find('div.testdata_box > div.testdata_prog');
	j_total = j_progbox.find('div.total');
	j_prog = j_progbox.find('div.prog');

	j_total.css('width','100%');
	j_total.text('上傳中...');
	j_prog.css('width','0%');
	j_prog.text('0%');

	j_progbox.show();

	$.ajax({
	    url:'/toj/pmod/pmod_test/pmod_test.php',
	    type:'POST',
	    xhr:function(){
		req = $.ajaxSettings.xhr();

		req.upload.addEventListener('progress',function(e){
		    console.log();
		    j_prog.css('width',(e.loaded * 100 / e.total) + '%');
		    j_prog.text(Math.round(e.loaded * 100 / e.total) + ' %');
		},false);

		return req;
	    },
	    data:formdata,
	    contentType:false,
	    processData:false,
	    success:function(){
		com.url_push_back();
	    }
	});
    });
    j_edit_pbox.find('div.testdata_box > button.cancel').on('click',function(e){
	com.url_push_back();
    });

    if(user.level == -1){
	edit_pbox.url_chg = function(direct,url_upart,url_dpart,param){
	    if(direct == 'in'){
		index.tab_hl('edit');
		that.fadein(j_edit_pbox);

		contentbox.refresh();

		$.post('/toj/pmod/pmod_test/pmod_test.php',{'action':'get_pro_data','data':JSON.stringify({'proid':that.proid})},function(res){
		    var reto;
			
		    if(res[0] != 'E'){
			reto = JSON.parse(res);
			set = reto.set;

			j_edit_pbox.find('div.edit_box > [name="timelimit"]').val(set.timelimit);
			j_edit_pbox.find('div.edit_box > [name="memlimit"]').val(set.memlimit);

			if(reto.content != false){
			    contentbox.setValue(reto.content);
			}

			j_edit_pbox.find('div.testdata_box > [name="count"]').val(set.count);
			testdata_update(set.count,set.score);
		    }
		});
	    }else if(direct == 'out'){
		index.tab_ll('edit');
		that.fadeout(j_edit_pbox);

		j_edit_pbox.find('div.testdata_box > div.testdata_prog').hide();
	    }

	    return 'cont';
	};
	that.node.child_set(edit_pbox);

	contentbox.getWrapperElement().style.width = '100%';
	contentbox.getWrapperElement().style.height = '100%';
	contentbox.getScrollerElement().style.width = '100%';
	contentbox.getScrollerElement().style.height = '100%';
    }
};
