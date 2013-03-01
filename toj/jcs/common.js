var RESULTMAP = {0:'AC',1:'WA',2:'TLE',3:'MLE',4:'RF',5:'RE',6:'CE',7:'ERR',100:'WAIT'};

var USER_PER_USER	    = 0x00000001;
var USER_PER_PROCREATOR	    = 0x00000002;
var USER_PER_PROADMIN	    = 0x00000004;

var USER_LEVEL_USER	    = 0x00000001;
var USER_LEVEL_PROCREATOR   = 0x00000003;
var USER_LEVEL_PROADMIN	    = 0x00000007;
var USER_LEVEL_ADMIN	    = 0x0000ffff;
var USER_LEVEL_SUPERADMIN   = -1;

var __extend = function(child,parent){
    child.prototype.__super = parent;
};

var common = {
    page_list:new Array(),
    url_prev:null,
    url_curr:null,
    mbox_curr:null,
    mbox_defer:null,

    init:function(){
	var i;
	var url;
	var urlpart;
	
	urlpart = location.href.split('?');
	if(urlpart[0].search(/\/$/) == -1){
	    url = urlpart[0] + '/';
	    if(urlpart.length > 1){
		url = url + '?';
		for(i = 1;i < urlpart.length;i++){
		    url = url + urlpart[i];
		}
	    }
	    window.history.replaceState(null,document.title,url);
	}

	common.url_curr = location.href;

	$(document).on('click','a',function(e){
	    common.pushurl($(this).attr('href'));   
	    return false;
	});
	$(document).on('keyup',function(e){
	    if(e.which == 27){
		common.hidembox(false);
	    }
	});
    },

    exheight:function(){
	var i;
	var es;
	var extop;
	var exbottom;
	var j_e;
	var j_parent;

	es = $('[exheight=true]');
	for(i = 0;i < es.length;i++){
	    j_e = $(es[i]);
	    if((extop = j_e.attr('extop')) == undefined){
		extop = j_e.css('top').match(/(.+)px/)[1];
	    }
	    if((exbottom = j_e.attr('exbottom')) == undefined){
		exbottom = 0;
	    }
	    extop = parseInt(extop);
	    exbottom = parseInt(exbottom);

	    j_e.css('height',($(window).height() - (extop + exbottom) + 'px'));
	}
    },
    getcookie:function(){
	var ret;
	var i;
	var part;
	var subpart;
	
	ret = new Array();
	part = document.cookie.split(';');
	for(i = 0;i < part.length;i++){
	    part[i] = part[i].replace(/\+/g,' ');
	    subpart = part[i].split('=');
	    ret[decodeURIComponent(subpart[0])] = decodeURIComponent(subpart[1]);
	}

	return ret;
    },
    getdate:function(str){
	var part;
	part = str.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/);
	return new Date(part[1],parseInt(part[2]) - 1,part[3],part[4],part[5],part[6],0);
    },
    getdatestring:function(date,secflag){
	var month;
	var day;
	var hr;
	var min;
	var sec;

	month = date.getMonth() + 1;
	if(month < 10){
	    month = '0' + month;
	}
	day = date.getDate();
	if(day < 10){
	    day = '0' + day;
	}
	hr = date.getHours();
	if(hr < 10){
	    hr = '0' + hr;
	}
	min = date.getMinutes();
	if(min < 10){
	    min = '0' + min;
	}
	if(secflag == true){
	    sec = date.getSeconds();
	    if(sec < 10){
		sec = '0' + sec;
	    }

	    return date.getFullYear() + '-' + month + '-' + day + ' ' + hr + ':' + min + ':' + sec;
	}else{
	    return date.getFullYear() + '-' + month + '-' + day + ' ' + hr + ':' + min;
	}
    },
    getlang:function(value){
	var i;
	var ret;
	var langlist = ['C++','JAVA','Pascal'];

	ret = new Array;
	i = 0;
	while(value > 0){
	    if((value & 1) == 1){
		ret.push(langlist[i]);
	    }
	    value = value >> 1;
	}

	return ret;
    },

    geturlpart:function(url){
	if(url == undefined){
	    return location.href.match(/toj\/(.*)/)[1].split('/');
	}else{
	    return url.match(/toj\/(.*)/)[1].split('/');
	}
    },
    pushurl:function(url){
	common.url_prev = location.href;
	window.history.pushState(null,document.title,url);   
	common.url_curr = location.href;
	common.page_urlchange();
    },
    replaceurl:function(url){
	window.history.replaceState(null,document.title,url);   
	common.url_curr = location.href;
    },
    prevurl:function(notpagename){
	if(common.url_prev == null || common.geturlpart(common.url_prev)[0] == notpagename){
	    common.pushurl('/toj/home/');
	}else{
	    common.pushurl(common.url_prev);
	}
    },
    page_urlchange:function(){
	var urlpart;
	var pagename;
	var pagename_prev;

	if(arguments.callee.reentrant == true){
	    arguments.callee.hasnext = true;
	    return;
	}else{
	    arguments.callee.reentrant = true;
	    arguments.callee.hasnext = true;
	}

	while(arguments.callee.hasnext){
	    arguments.callee.hasnext = false;

	    if(common.mbox_curr != null){
		common.hidembox(false);
	    }

	    urlpart = common.geturlpart();
	    pagename = urlpart[0];
	    if(pagename == ''){
		common.replaceurl('/toj/home/');
		common.page_urlchange();
		continue;
	    }else if(!(pagename in common.page_list)){
		common.replaceurl('/toj/none/');
		common.page_urlchange();
		continue;
	    }

	    if(common.url_prev != null){
		pagename_prev = common.geturlpart(common.url_prev)[0];
		if(pagename == pagename_prev){
		    common.page_list[pagename].urlchange('same');
		}else{
		    if(pagename_prev in common.page_list){
			common.page_list[pagename_prev].urlchange('out');
		    }
		    common.page_list[pagename].urlchange('in');
		}
	    }else{
		common.page_list[pagename].urlchange('in');
	    }
	}
	arguments.callee.reentrant = false;
    },
    addpage:function(pagename,pageobj){
	common.page_list[pagename] = pageobj;
    },
    removepage:function(pagename){
	delete common.page_list[pagename];
    },

    showmbox:function(mboxobj){
	common.mbox_curr = mboxobj;
	mboxobj.switchchange('in');
	common.mbox_defer = $.Deferred();
	return common.mbox_defer.promise();
    },
    hidembox:function(done){
	if(common.mbox_curr != null){
	    common.mbox_curr.switchchange('out');
	    common.mbox_curr = null;
	    if(done == true){
		common.mbox_defer.resolve();
	    }else{
		common.mbox_defer.reject();
	    }
	}
    }
};

var class_common_page = function(){
    var that = this;
    that.tab_list = Array();
    that.tabname_curr = null;

    that.urlchange = function(direct){};
    that.fadein = function(j_e){
	j_e.stop().fadeIn('fast');
    };
    that.fadeout = function(j_e){
	j_e.stop().hide();
    };

    that.tab_urlchange = function(tabname){
	if(arguments.callee.reentrant == true){
	    arguments.callee.hasnext = true;
	    return;
	}else{
	    arguments.callee.reentrant = true;
	    arguments.callee.hasnext = true;
	}

	while(arguments.callee.hasnext){
	    arguments.callee.hasnext = false;

	    if(tabname == null){
		if(that.tabname_curr in that.tab_list){
		    index.lltab(that.tabname_curr);
		    that.tab_list[that.tabname_curr].urlchange('out');
		}
		that.tab_list = new Array();
		that.tabname_curr = null;
		continue;
	    }

	    if(!(tabname in that.tab_list)){
		common.replaceurl('/toj/none/');
		common.page_urlchange();
		return;
	    }

	    if(tabname == that.tabname_curr){
		that.tab_list[tabname].urlchange('same');
	    }else{
		if(that.tabname_curr in that.tab_list){
		    index.lltab(that.tabname_curr);
		    that.tab_list[that.tabname_curr].urlchange('out');
		}
		that.tabname_curr = tabname;
		index.hltab(tabname);
		that.tab_list[tabname].urlchange('in');
	    }
	}
	arguments.callee.reentrant = false;
    };
    that.addtab = function(tabname,tabobj){
	that.tab_list[tabname] = tabobj;
    };
    that.removetab = function(tabname){
	delete that.tab_list[tabname];
    };
};

var class_common_tab = function(paobj){
    var that = this;
    that.paobj = paobj;

    that.urlchange = function(direct){};
    that.fadein = function(j_e){
	j_e.stop().fadeIn('fast');
    };
    that.fadeout = function(j_e){
	j_e.stop().hide();
    };
};

var class_common_mbox = function(paobj){
    var that = this;
    that.paobj = paobj;

    that.switchchange = function(direct){};
    that.fadein = function(j_e){
	j_e.stop().show();
	index.showmask();
    };
    that.fadeout = function(j_e){
	index.hidemask();
	j_e.stop().hide();
    };
}
