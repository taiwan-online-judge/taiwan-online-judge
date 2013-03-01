var stat = {
    init:function(){
	stat.stat_page = new class_stat_page;
    }
};

class_stat_page = function(){
    var that = this;
    var j_page = $('#index_page > [page="stat"]');
    var j_blank = $('#index_page > [page="stat"] > div.blank');
    var allsub_tab = new class_stat_allsub_tab(that);

    that.subinfo_mbox = new class_stat_subinfo_mbox(that);

    that.__super();

    that.urlchange = function(direct){
	var _in = function(){
	    that.fadein(j_page);

	    index.settitle('TOJ-狀態');

	    that.addtab('allsub',allsub_tab);
	    index.addtab('allsub','/toj/stat/allsub/','全部動態');

	    _change();
	};
	var _out = function(){
	    that.fadeout(j_page);
	    index.emptytab();
	    that.tab_urlchange(null);
	};
	var _change = function(){
	    var tabname;

	    tabname = common.geturlpart()[1];
	    if(!(tabname in that.tab_list)){
		tabname = 'allsub';
		common.replaceurl('/toj/stat/allsub/');
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
    };

    common.addpage('stat',that);
}; __extend(class_stat_page,class_common_page);

var class_stat_allsub_tab = function(paobj){
    var that = this;
    var j_tab = $('#index_page > [page="stat"] > [tab="allsub"]');
    var j_table = j_tab.find('table.sublist');
    
    var refresh_flag = false;
    var j_ajax = null;
    var ssubid = 0;
    var esubid = 2147483647;
    var lastupdate = null;
    var topflag = true;
    var topqueue = new Array;
    var downblock = false;
    var subid_curr = null;

    var subinfo_switch = function(subid){
	if(subid == undefined){
	    subid = common.geturlpart()[2];
	}
	if(subid != '' && subid != subid_curr){
	    subid_curr = parseInt(subid);
	    common.replaceurl('/toj/stat/allsub/' + subid_curr + '/');
	    that.paobj.subinfo_mbox.init(subid_curr);
	    common.showmbox(that.paobj.subinfo_mbox).always(function(){
		subid_curr = null;
		//common.prevurl();
	    });
	}
    };
    var sub_listset = function(j_item,subo){
	var j_a;

	j_item.attr('subid',subo.subid);

	j_item.find('td.subid').text(subo.subid);
	
	j_a = j_item.find('td.proid > a.link');
	j_a.attr('href','/toj/pro/' + subo.proid+ '/');
	j_a.text(subo.proid);

	j_a = j_item.find('td.nickname > a.link');
	j_a.attr('href','/toj/user/' + subo.uid+ '/');
	j_a.text(subo.nickname);
	
	j_item.find('td.runtime').text(subo.runtime);
	j_item.find('td.memory').text(subo.memory);
	j_item.find('td.result').text(RESULTMAP[subo.result]);
	j_item.find('td.score').text(subo.score);
	j_item.find('td.time').text(common.getdatestring(subo.submit_time,true));
	j_item.find('td.lang').text(common.getlang(subo.lang)[0]);

	j_item.off('click').on('click',function(e){
	    if(e.target.tagName != 'A'){
		subinfo_switch(subo.subid);
	    }
	});
    };
    var sub_listnew = function(subo){
	var j_item;

	j_item = $('<tr class="item"><td class="subid"></td><td class="proid"><a class="link"></a></td><td class="nickname"><a class="link"></a></td><td class="runtime"></td><td class="memory"></td><td class="result"></td><td class="score"></td><td class="time"></td><td class="lang"></td></tr>');
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
		'filter':{'uid':null,'result':null,'proid':null,'lang':null},
		'sort':{'score':null,'runtime':null,'memory':null,'subid':[1,0]},
		'wait':10,
		'count':100,
		'last_update':lastupdate
	    })}
	    ,function(res){
		var i;
		var reto;
		var j_item;
		var maxsubid;

		if(res[0] != 'E'){
		    reto = JSON.parse(res);

		    maxsubid = ssubid;
		    for(i = 0;i < reto.length;i++){
			reto[i].submit_time = common.getdate(reto[i].submit_time);

			j_item = j_table.find('[subid="' + reto[i].subid + '"]')
			if(j_item.length > 0){
			    sub_listset(j_item,reto[i]);
			}else if(reto[i].subid > ssubid){
			    if(topflag == true){
				j_item = sub_listnew(reto[i]);
				j_item.insertAfter(j_table.find('tr.head')); 
				j_item.css('opacity',0).slideDown('fast').fadeTo(100,1);
			    }else{
				j_item = sub_listnew(reto[i]);
				j_item.insertAfter(j_table.find('tr.head')); 
				topqueue.push(reto[i].subid);
			    }
			}

			if(reto[i].subid > maxsubid){
			    maxsubid = reto[i].subid;
			}
			if(reto[i].last_update > lastupdate){
			    lastupdate = reto[i].last_update;
			}
		    }
		    ssubid = maxsubid;
		}

		j_ajax = null;
		sub_refresh();
	    }
	);
    };
    var sub_update = function(type){
	if(type == 0){
	    while(topqueue.length > 0){
		j_table.find('[subid="' + topqueue.pop() + '"]').css('opacity',0).slideDown('fast').fadeTo(100,1);
	    }
	}else if(type == 1 && downblock == false){
	    downblock = true;
	    $.post('/toj/php/status.php',{'action':'get_submit',
		'data':JSON.stringify({
		    'filter':{'uid':null,'result':null,'proid':null,'lang':null},
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
			    downblock = false;
			}
		    }else{
			reto = JSON.parse(res);
			for(i = 0;i < reto.length;i++){
			    reto[i].submit_time = common.getdate(reto[i].submit_time);

			    j_item = sub_listnew(reto[i]);
			    j_table.append(j_item); 
			    j_item.css('opacity',0).slideDown('fast').fadeTo(100,1);
			}

			if(lastupdate == null){
			    for(i = 0;i < reto.length;i++){
				if(ssubid < reto[i].subid){
				    ssubid = reto[i].subid;
				}
			    }

			    lastupdate = reto[0].last_update;
			    for(i = 1;i < reto.length;i++){
				if(lastupdate < reto[i].last_update){
				    lastupdate = reto[i].last_update;
				}
			    }

			    sub_refresh();

			    j_tab.on('scroll',function(e){
				if(Math.floor(j_tab.scrollTop() / 32) < 10){
				    if(topflag == false){
					topflag = true;
					sub_update(0);
				    }
				}else{
				    topflag = false;
				}

				if(Math.floor((j_table.height() - j_tab.scrollTop()) / 32) < 50){
				    sub_update(1);
				}
			    });
			}

			esubid = reto[reto.length - 1].subid;
			downblock = false;
		    }
		}
	    );
	}
    };

    that.__super(paobj);

    that.urlchange = function(direct){
	if(direct == 'in'){
	    that.fadein(j_tab);
	    refresh_flag = true;

	    sub_update(1);
	    subinfo_switch();
	}else if(direct == 'out'){
	    that.fadeout(j_tab);
	    j_tab.off('scorll');
	    j_table.find('tr.item').remove();
	    
	    if(j_ajax != null){
		j_ajax.abort();
		j_ajax = null;
	    }
	    
	    refresh_flag = false;
	    j_ajax = null;
	    esubid = 2147483647;
	    lastupdate = null;
	    topflag = true;
	    topqueue = new Array;
	    downblock = false;
	    subid_curr = null;
	}else if(direct == 'same'){
	    subinfo_switch();
	}
    };

    j_table.on('mousedown',function(e){
	return false;
    });
}; __extend(class_stat_allsub_tab,class_common_tab);

var class_stat_subinfo_mbox = function(paobj){
    var that = this;
    var ori_prop = new Object;
    var j_mbox = $('#index_mask > div.stat_mask > div.subinfo_mbox');
    var subid = null;

    that.subid = null;
    that.smodname = null;
    that.subo = null;
    
    that.__super(paobj);

    that.init = function(id){
	subid = id;
    };
    that.switchchange = function(direct){
	if(direct == 'in'){
	    $.post('/toj/php/status.php',{'action':'get_by_subid','data':JSON.stringify({'subid':subid})},function(res){
		var reto;

		if(res[0] != 'E'){
		    that.subid = subid;
		    reto = JSON.parse(res);
		    that.smodname = reto.smodname;
		    that.subo = reto;
		    delete that.subo.smodname;

		    j_mbox.addClass(that.smodname);

		    css = $('<link rel="stylesheet" type="text/css" href="/toj/smod/' + that.smodname + '/' + that.smodname + '.css">');
		    $('head').append(css);
		    css.ready(function(){
			$.get('/toj/smod/' + that.smodname + '/' + that.smodname + '.html',{},function(res){
			    var j_h;
			    var j_button;

			    j_mbox.html(res);

			    j_h = $('<h2 style="padding:6px 0px 0px 0px;"></h2>');
			    j_h.text('SubID:' + that.subo.subid);
			    j_button = $('<button style="margin:6px 0px 0px 0px; float:right;">關閉</button>');
			    j_button.on('click',function(e){
				common.hidembox('false');
			    });
			    j_mbox.prepend(j_h);
			    j_mbox.prepend(j_button);

			    $.getScript('/toj/smod/' + that.smodname + '/' + that.smodname + '.js',function(script,stat,res){
				eval(that.smodname + '.init(that,j_mbox)');
				that.export_switchchange('in');
			    });
			});
		    });
		}
	    });
	}else if(direct == 'out'){
	    that.export_switchchange('out');

	    for(key in that){
		if(!(key in ori_prop)){
		    delete that[key];
		}
	    }

	    j_mbox.empty();
	    j_mbox.removeClass(that.smodname);
	    that.subid = null;
	    that.smodname = null;
	    that.subo = null;
	}
    };

    for(key in that){
	ori_prop[key] = true;
    }
}; __extend(class_stat_subinfo_mbox,class_common_mbox);
