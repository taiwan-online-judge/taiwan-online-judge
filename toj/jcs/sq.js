var sq = {
    init:function(){
	sq.sq_page = new class_sq_page;
    }
};

var class_sq_page = function(){
    var that = this;
    var ori_prop = new Object;
    var j_page = $('#index_page > [page="sq"]');

    that.sqid = null;
    that.sqname = null;
    that.sqmodname = null;

    that.__super();

    that.urlchange = function(direct){
	var sqid;

	var _check = function(){
	    sqid = common.geturlpart()[1];
	    if(sqid == ''){
		return false;
	    }
	    sqid = parseInt(sqid);
	    return true;
	};
	var _in = function(){
	    $.post('/toj/php/square.php',{'action':'get_sq','data':JSON.stringify({'sqid':sqid})},function(res){
		var css;
		var reto;

		if(res[0] != 'E'){
		    that.sqid = sqid;
		    reto = JSON.parse(res);
		    that.sqname = reto.sqname;
		    that.sqmodname = reto.sqmodname;
		    j_page.addClass(that.sqmodname);
		    index.settitle('TOJ-' + that.sqname);

		    css = $('<link rel="stylesheet" type="text/css" href="/toj/sqmod/' + that.sqmodname + '/' + that.sqmodname + '.css">');
		    $('head').append(css);
		    css.ready(function(){
			$.get('/toj/sqmod/' + that.sqmodname + '/' + that.sqmodname + '.html',{},function(res){
			    j_page.html(res);
			    $.getScript('/toj/sqmod/' + that.sqmodname + '/' + that.sqmodname + '.js',function(script,stat,res){
				eval(that.sqmodname + '.init(that,j_page)');
				that.export_urlchange('in');
			    });
			});
		    });
		}
	    });
	};
	var _out = function(){
	    that.export_urlchange('out');

	    for(key in that){
		if(!(key in ori_prop)){
		    delete that[key];
		}else{
		    that[key] = ori_prop[key];
		}
	    }

	    j_page.empty();
	    j_page.removeClass(that.sqmodname);
	    index.emptycontent();
	    index.emptytab();
	    that.sqid = null;
	    that.sqname = null;
	    that.sqmodname = null;
	};

	if(direct == 'in'){
	    if(_check()){
		_in();
	    }
	}else if(direct == 'out'){
	    _out();
	}else if(direct == 'same'){
	    if(_check()){
		if(sqid != that.sqid){
		    _out();
		    _in();
		}else{
		    that.export_urlchange('same');
		}
	    }
	}
    }

    for(key in that){
	ori_prop[key] = that[key];
    }

    common.addpage('sq',that);
}; __extend(class_sq_page,class_common_page);

