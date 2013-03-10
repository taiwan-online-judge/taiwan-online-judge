var sq = new function(){
    var that = this;
    var j_page = null;
    var sq_page = null;
    var sq_sqid = null;
    var sq_sqmodname = null;

    that.init = function(){
	j_page = $('#index_page > div.sq_page');	
	
	that.node = new vus.node('sq');		
	that.node.url_chg = function(direct,url_upart,url_dpart){
	    var sqid;

	    var _clean = function(){
		if(sq_page != null){
		    that.node.child_del(sq_page.node);
		}

		j_page.empty();
		j_page.removeClass(sq_sqmodname);
		index.content_empty();
		index.tab_empty();

		sq_page = null;
		sq_sqid = null;
		sq_sqmodname = null;
	    };
	    
	    if(direct == 'in' || direct == 'same'){
		sqid = url_dpart[0];
		if(sqid == ''){
		    com.url_update('/toj/none/'); 
		    return 'stop';
		}
		sqid = parseInt(sqid);
		if(sqid == sq_sqid){
		    return 'cont';
		}

		_clean();
		that.node.child_delayset(sqid.toString());

		$.post('/toj/php/square.php',{'action':'get_sq','data':JSON.stringify({'sqid':sqid})},function(res){
		    var css;
		    var reto;

		    if(res[0] != 'E'){
			sq_sqid = sqid;
			reto = JSON.parse(res);
			sq_sqmodname = reto.sqmodname;

			css = $('<link rel="stylesheet" type="text/css" href="/toj/sqmod/' + sq_sqmodname + '/' + sq_sqmodname + '.css">');
			$('head').append(css);
			css.ready(function(){
			    j_page.addClass(sq_sqmodname);

			    $.get('/toj/sqmod/' + sq_sqmodname + '/' + sq_sqmodname + '.html',{},function(res){
				j_page.html(res);
				$.getScript('/toj/sqmod/' + sq_sqmodname + '/' + sq_sqmodname + '.js',function(script,stat,res){
				    sq_page = new class_sq_page(sq_sqid,reto.sqname);
				    eval('new ' + sq_sqmodname + '(sq_page,j_page)');
				    that.node.child_set(sq_page.node);
				});
			    });
			});
		    }else{
			com.url_update('/toj/none/');
		    }
		});

	    }else if(direct == 'out'){
		_clean();
	    }

	    return 'cont';
	};
	com.vus_root.child_set(that.node);
    };
};

var class_sq_page = function(sqid,sqname){
    var that = this;

    that.sqid = sqid;
    that.sqname = sqname;
    that.node = new vus.node(sqid.toString());
};
