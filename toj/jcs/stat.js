var stat = new function(){
    var that = this;
    var stat_sub_pbox = null;


    var sub_node = null;
    var subid_node = null;


    var j_subres_mbox = null;
    var subres_mbox = null;
    var subfile_mbox = null;


    that.sub_subid = null;

    that.init = function(){
	stat_sub_pbox = new class_stat_sub_pbox('sub');
	subfile_mbox = new class_stat_subfile_mbox;
	j_subres_mbox = $('#index_mask > div.stat_mask > div.subres_mbox');

	that.stat_node = new vus.node('stat');
	that.stat_node.url_chg = function(direct,url_upart,url_dpart){
	    if(direct == 'in'){
		index.title_set('TOJ-狀態');

		index.tab_add('sub','/toj/stat/sub/','全部動態');
		if(url_dpart[0] != 'sub'){
		    com.url_update('/toj/stat/sub/');	
		    return 'stop';
		}
	    }else if(direct == 'out'){
		index.tab_empty();
	    }

	    return 'cont';
	};
	that.stat_node.child_set(stat_sub_pbox.node);
	com.vus_root.child_set(that.stat_node);	




	sub_node = new vus.node('sub');
	subid_node = new vus.node('');

	sub_node.url_chg = function(direct,url_upart,url_dpart){
	    var subid;

	    if(direct == 'in' || direct == 'same'){
		if((subid = url_dpart[0]) == ''){
		    com.url_update('/toj/none/');
		    return 'stop';
		}
		subid = parseInt(url_dpart[0]);
		if(subid == that.sub_subid){
		    return 'cont';
		}

		if(that.sub_subid != null){
		    sub_node.child_del(subid_node);
		}
		that.sub_subid = subid;

		subid_node.name = that.sub_subid.toString();
		sub_node.child_set(subid_node);
	    }else if(direct == 'out'){
		if(that.sub_subid != null){
		    sub_node.child_del(subid_node);
		}
		that.sub_subid = null;
	    }

	    return 'cont';
	};
	com.vus_mbox.child_set(sub_node);




	subid_node.mbox_name = null;
	subid_node.smodname = null;
	subid_node.url_chg = function(direct,url_upart,url_dpart){
	    var mbox_name;

	    var _clean = function(){
		if(subres_mbox != null){
		    subid_node.child_del(subres_mbox.node);

		    j_subres_mbox.empty();
		    j_subres_mbox.removeClass(subid_node.smodname);

		    subres_mbox = null;
		    subid_node.smodname = null;
		}
	    };

	    if(direct == 'in' || direct == 'same'){
		mbox_name = url_dpart[0];
		if(mbox_name == subid_node.mbox_name){
		    return 'cont';
		}

		_clean();

		subid_node.mbox_name = mbox_name;
		if(mbox_name == 'res'){
		    subid_node.child_delayset('res');
		    
		    $.post('/toj/php/status.php',{'action':'get_by_subid','data':JSON.stringify({'subid':that.sub_subid})},function(res){
			var reto;

			if(res[0] == 'E'){
			    com.url_update('/toj/none/');
			}else{
			    reto = JSON.parse(res);
			    subid_node.smodname = reto.smodname;
			    reto.submit_time = com.get_date(reto.submit_time);
			    delete reto.smodname;

			    css = $('<link rel="stylesheet" type="text/css" href="/toj/smod/' + subid_node.smodname + '/' + subid_node.smodname + '.css">');
			    $('head').append(css);
			    css.ready(function(){
				j_subres_mbox.addClass(subid_node.smodname);

				$.get('/toj/smod/' + subid_node.smodname + '/' + subid_node.smodname + '.html',{},function(res){
				    var j_h;
				    var j_button;

				    j_subres_mbox.html(res);

				    j_h = $('<h2 style="padding:6px 0px 0px 82px;"></h2>');
				    j_h.text('SubID: ' + that.sub_subid);
				    j_subres_mbox.prepend(j_h);

				    if(reto.uid == user.uid || user.level == -1){
					j_button = $('<button style="margin:6px 0px 0px 0px; float:right;">檔案</button>');
					j_button.on('click',function(e){
					    com.url_update('/toj/m/sub/' + that.sub_subid + '/file/');
					});
					j_subres_mbox.prepend(j_button);
				    }
				    if(user.level == -1){
					j_button = $('<button style="margin:6px 0px 0px 6px; float:right;">重測</button>');
					j_button.on('click',function(e){
					    $.post('/toj/php/status.php',{'action':'rejudge_submit','data':JSON.stringify({'subid':that.sub_subid})});
					    com.url_pull_pbox();
					});
					j_subres_mbox.prepend(j_button);
				    }
				    
				    $.getScript('/toj/smod/' + subid_node.smodname + '/' + subid_node.smodname + '.js',function(script,stat,res){
					subres_mbox = new class_stat_subres_mbox(that.sub_subid,reto);
					eval('new ' + subid_node.smodname + '(subres_mbox,j_subres_mbox)');
					subid_node.child_set(subres_mbox.node);
				    });
				});
			    });
			}
		    });
		}   
	    }else if(direct == 'out'){
		_clean();
		subid_node.mbox_name = null;
	    }

	    return 'cont';
	};
	subid_node.child_set(subfile_mbox.node);
    };
};

var class_stat_sub_pbox = function(pbox_name){
    var that = this;
    var j_pbox = $('#index_page > div.stat_page > div.' + pbox_name + '_pbox');
    var j_filter = j_pbox.find('div.subset > table.filter');
    var j_table = j_pbox.find('table.sublist');
    
    var refresh_flag = false;
    var j_ajax = null;
    var ssubid = 0;
    var esubid = 2147483647;
    var last_update = null;
    var top_flag = true;
    var top_queue = new Array;
    var down_block = false;

    var filter = new Object;

    var sub_listset = function(j_item,subo){
	var j_a;

	j_item.attr('subid',subo.subid);

	j_item.find('td.subid').text(subo.subid);
	
	j_a = j_item.find('td.proid > a');
	j_a.attr('href','/toj/pro/' + subo.proid+ '/');
	j_a.text(subo.proid);

	j_a = j_item.find('td.nickname > a');
	j_a.attr('href','/toj/user/' + subo.uid+ '/');
	j_a.text(subo.nickname);
	
	j_item.find('td.runtime').text(subo.runtime);
	j_item.find('td.memory').text(subo.memory);
	j_item.find('td.result').text(RESULTMAP[subo.result]);
	j_item.find('td.score').text(subo.score);
	j_item.find('td.time').text(com.get_datestring(subo.submit_time,true));
	j_item.find('td.lang').text(com.get_lang(subo.lang)[0]);

	j_item.off('click').on('click',function(e){
	    if(e.target.tagName != 'A'){
		com.url_push('/toj/m/sub/' + subo.subid + '/res/');
	    }
	});
    };
    var sub_listnew = function(subo){
	var j_item;

	j_item = $('<tr class="item"><td class="subid"></td><td class="proid"><a></a></td><td class="nickname"><a></a></td><td class="runtime"></td><td class="memory"></td><td class="result"></td><td class="score"></td><td class="time"></td><td class="lang"></td></tr>');
	sub_listset(j_item,subo);

	return j_item;
    };
    var sub_refresh = function(){
	if(refresh_flag == false){
	    return;
	}
	if(j_ajax != null){
	    j_ajax.abort();
	}
	j_ajax = $.post('/toj/php/status.php',{'action':'get_submit',
	    'data':JSON.stringify({
		'filter':{'uid':filter.uid,'result':filter.result,'proid':filter.proid,'lang':null},
		'sort':{'score':null,'runtime':null,'memory':null,'subid':[1,0]},
		'wait':10,
		'count':100,
		'last_update':last_update
	    })}
	    ,function(res){
		var i;

		var reto;
		var j_item;
		var masubid;

		if(res[0] != 'E'){
		    reto = JSON.parse(res);

		    masubid = ssubid;
		    for(i = 0;i < reto.length;i++){
			reto[i].submit_time = com.get_date(reto[i].submit_time);

			j_item = j_table.find('[subid="' + reto[i].subid + '"]')
			if(j_item.length > 0){
			    sub_listset(j_item,reto[i]);
			}else if(reto[i].subid > ssubid){
			    if(top_flag == true){
				j_item = sub_listnew(reto[i]);
				j_item.insertAfter(j_table.find('tr.head')); 
				j_item.css('opacity',0).slideDown('fast').fadeTo(100,1);
			    }else{
				j_item = sub_listnew(reto[i]);
				j_item.insertAfter(j_table.find('tr.head')); 
				topqueue.push(reto[i].subid);
			    }
			}

			if(reto[i].subid > masubid){
			    masubid = reto[i].subid;
			}
			if(reto[i].last_update > last_update){
			    last_update = reto[i].last_update;
			}
		    }
		    ssubid = masubid;
		}

		j_ajax = null;
		sub_refresh();
	    }
	);
    };
    var sub_update = function(type){
	if(type == 0){
	    while(top_queue.length > 0){
		j_table.find('[subid="' + top_queue.pop() + '"]').css('opacity',0).slideDown('fast').fadeTo(100,1);
	    }
	}else if(type == 1 && down_block == false){
	    down_block = true;
	    $.post('/toj/php/status.php',{'action':'get_submit',
		'data':JSON.stringify({
		    'filter':{'uid':filter.uid,'result':filter.result,'proid':filter.proid,'lang':null},
		    'sort':{'score':null,'runtime':null,'memory':null,'subid':[0,esubid]},
		    'wait':0,
		    'count':50,
		    'last_update':null
		})}
		,function(res){
		    var i;
		    var reto;

		    if(res[0] == 'E'){
			if(res != 'Eno_result'){
			    down_block = false;
			}
		    }else{
			reto = JSON.parse(res);
			for(i = 0;i < reto.length;i++){
			    reto[i].submit_time = com.get_date(reto[i].submit_time);

			    j_item = sub_listnew(reto[i]);
			    j_table.append(j_item); 
			    j_item.css('opacity',0).slideDown('fast').fadeTo(100,1);
			}

			if(last_update == null){
			    for(i = 0;i < reto.length;i++){
				if(ssubid < reto[i].subid){
				    ssubid = reto[i].subid;
				}
			    }

			    last_update = reto[0].last_update;
			    for(i = 1;i < reto.length;i++){
				if(last_update < reto[i].last_update){
				    last_update = reto[i].last_update;
				}
			    }

			    sub_refresh();

			    $(window).off('scroll').on('scroll',function(e){
				var j_window;

				j_window = $(window);
				if(Math.floor(j_window.scrollTop() / 32) < 10){
				    if(top_flag == false){
					top_flag = true;
					sub_update(0);
				    }
				}else{
				    top_flag = false;
				}

				if(Math.floor((j_table.height() - j_window.scrollTop()) / 32) < 50){
				    sub_update(1);
				}
			    });
			}

			esubid = reto[reto.length - 1].subid;
			down_block = false;
		    }
		}
	    );
	}
    };
    var filter_getparam = function(){
	var ret;

	ret = '';
	if(filter.uid != null){
	    ret += 'uid:' + filter.uid + ':'; 
	}
	if(filter.proid != null){
	    ret += 'proid:' + filter.proid + ':';
	}
	if(filter.result != null){
	    ret += 'result:' + filter.result + ':'; 
	}
	ret = ret.slice(0,-1);

	return ret;
    };

    that.node = new vus.node(pbox_name);

    that.__super();

    that.node.url_chg = function(direct,url_upart,url_dpart){
	var i;
	var filter_part;
	var key;
	var value;

	var _clear = function(){
	    $(window).off('scorll');
	    j_filter.find('tr.uid > td.value').text('None');
	    j_filter.find('tr.proid input').val('None');
	    j_filter.find('tr.result select').val('null');
	    j_table.find('tr.item').remove();
	    
	    if(j_ajax != null){
		j_ajax.abort();
		j_ajax = null;
	    }
	    
	    refresh_flag = false;
	    j_ajax = null;
	    esubid = 2147483647;
	    last_update = null;
	    top_flag = true;
	    top_queue = new Array;
	    down_block = false;
	    subid_curr = null;

	    filter = new Object;
	}

	if(direct == 'in' || direct == 'same'){
	    if(direct == 'same'){
		_clear();
	    }else{
		index.tab_hl(pbox_name);
		that.fadein(j_pbox);
	    }
	    refresh_flag = true;

	    filter.uid = null;
	    filter.proid = null;
	    filter.result = null;
	    if(url_dpart[0] != undefined){
		filter_part = url_dpart[0].split(':');
		for(i = 0;i < filter_part.length;i += 2){
		    key = filter_part[i];
		    value = filter_part[i + 1];

		    if(key == 'uid'){
			filter.uid = parseInt(value);
		    }else if(key == 'proid'){
			filter.proid = parseInt(value);
		    }else if(key == 'result'){
			filter.result = parseInt(value);
		    }
		}
	    }

	    if(filter.uid != null){
		j_filter.find('tr.uid > td.value').text(filter.uid);
	    }
	    if(filter.proid != null){
		j_filter.find('tr.proid input').val(filter.proid);
	    }
	    if(filter.result != null){
		j_filter.find('tr.result select').val(filter.result);
	    }

	    sub_update(1);
	}else if(direct == 'out'){
	    index.tab_ll(pbox_name);
	    that.fadeout(j_pbox);
	    _clear();
	}

	return 'stop';
    };

    j_pbox.find('div.subset > table.filter tr.proid input').on('focusin',function(e){
	if($(this).val() == 'None'){
	    $(this).val('');
	}
    }).on('focusout',function(e){
	if($(this).val() == ''){
	    $(this).val('None');
	}
    }).on('keypress',function(e){
	var param;

	if(e.which != 13){
	    return;
	}

	if((filter.proid = $(this).val()) == 'None'){
	    filter.proid = null;
	}
	console.log(filter.proid);
	if((param = filter_getparam()) != ''){
	    com.url_push('/toj/stat/sub/' + param + '/');
	}else{
	    com.url_push('/toj/stat/sub/');
	}
    });
    j_pbox.find('div.subset > table.filter tr.result select').on('change',function(e){
	var param;

	if((filter.result = $(this).val()) == 'null'){
	    filter.result = null;
	}
	if((param = filter_getparam()) != ''){
	    com.url_push('/toj/stat/sub/' + param + '/');
	}else{
	    com.url_push('/toj/stat/sub/');
	}
    });
    j_pbox.find('div.subset > table.filter button.clear').on('click',function(e){
	com.url_push('/toj/stat/sub/');
    });
    j_table.on('mousedown',function(e){
	return false;
    });
}; __extend(class_stat_sub_pbox,class_com_pbox);

var class_stat_subres_mbox = function(subid,subo){
    var that = this;

    that.subid = subid;
    that.subo = subo;
    that.node = new vus.node('res');
    
    that.__super();
}; __extend(class_stat_subres_mbox,class_com_mbox);
var class_stat_subfile_mbox = function(){
    var that = this;
    var j_mbox = $('#index_mask > div.stat_mask > div.subfile_mbox');

    var filebox_add = function(filename,content){
	var j_name;
	var j_box;
	var filebox;

	j_name = $('<label></label>');
	j_name.text(filename);
	j_box = $('<div class="filebox"></div>');
	filebox = CodeMirror(j_box[0],{
	    mode:'text/x-c++src',
	    theme:'lesser-dark',
	    lineNumbers:true,
	    matchBrackets:true,
	    indentUnit:4,
	    readOnly:true
	});
	filebox.getWrapperElement().style.width = '100%';
	filebox.getWrapperElement().style.height = '100%';
	filebox.getScrollerElement().style.width = '100%';
	filebox.getScrollerElement().style.height = '100%';
	filebox.setValue(content);

	j_mbox.append(j_name);
	j_mbox.append(j_box);
	filebox.refresh();
    }

    that.node = new vus.node('file');
    
    that.__super();

    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    that.fadein(j_mbox);
	    j_mbox.find('h2.subid').text('SubID: ' + stat.sub_subid);

	    $.post('/toj/php/status.php',{'action':'get_submit_data','data':JSON.stringify({'subid':stat.sub_subid})},function(res){
		var i;
		var reto;

		if(res[0] != 'E'){
		    reto = JSON.parse(res);
		    for(i = 0;i < reto.length;i++){
			filebox_add(reto[i].filename,reto[i].content);
		    }
		}
	    });
	}else if(direct == 'out'){
	    that.fadeout(j_mbox);
	    j_mbox.find('label').remove();
	    j_mbox.find('div.filebox').remove();
	}

	return 'cont';
    };

    j_mbox.find('button.result').on('click',function(e){
	com.url_update('/toj/m/sub/' + stat.sub_subid + '/res/');
    });
}; __extend(class_stat_subfile_mbox,class_com_mbox);
