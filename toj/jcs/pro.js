var pro = new function(){
    var that = this;
    var j_pbox = null;
    var pro_pbox = null;
    var pro_proid = null;
    var pro_pmodname = null;

    that.init = function(){
	j_pbox = $('#index_page > div.pro_pbox');

	that.sub_mbox = new class_pro_sub_mbox();

	that.node = new vus.node('pro');
	that.node.url_chg = function(direct,url_upart,url_dpart){
	    var proid;

	    var _clean = function(){
		if(pro_pbox != null){
		    that.node.child_del(pro_pbox.node);
		}
		j_pbox.empty();
		j_pbox.removeClass(pro_pmodname);
		index.content_empty();

		pro_pbox = null;
		pro_proid = null;
		pro_pmodname = null;
	    };

	    if(direct == 'in' || direct == 'same'){
		index.title_set('TOJ-題目');

		proid = url_dpart[0];
		if(proid == ''){
		    com.url_update('/toj/none/');
		    return 'stop';
		}
		proid = parseInt(proid);
		if(proid == pro_proid){
		    return 'cont';
		}

		_clean();	
		that.node.child_delayset(proid.toString());

		$.post('/toj/php/problem.php',{'action':'get_pro','data':JSON.stringify({'proid':proid})},function(res){
		    var css;
		    var reto;

		    if(res[0] != 'E'){
			pro_proid = proid;
			reto = JSON.parse(res);
			pro_pmodname = reto.pmodname;

			css = $('<link rel="stylesheet" type="text/css" href="/toj/pmod/' + pro_pmodname + '/' + pro_pmodname + '.css">');
			$('head').append(css);
			css.ready(function(){
			    j_pbox.addClass(pro_pmodname);

			    $.get('/toj/pmod/' + pro_pmodname + '/' + pro_pmodname + '.html',{},function(res){
				j_pbox.html(res);
				$.getScript('/toj/pmod/' + pro_pmodname + '/' + pro_pmodname + '.js',function(script,stat,res){
				    pro_pbox = new class_pro_pbox(pro_proid,reto.proname);
				    eval('new ' + pro_pmodname + '(pro_pbox,j_pbox)');
				    that.node.child_set(pro_pbox.node);
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

var class_pro_pbox = function(proid,proname){
    var that  = this; 
    var j_pbox = $('#index_page > div.pro_pbox');

    that.proid = proid;
    that.proname = proname;
    that.node = new vus.node(proid.toString());

    that.__super();

    that.submit = function(proid){
	if(proid == undefined){
	    proid = that.proid
	}
	pro.sub_mbox.init(proid);
	com.url_push('/toj/m/pro_sub/');
    };
}; __extend(class_pro_pbox,class_com_pbox);

var class_pro_sub_mbox = function(){
    var that = this;
    var j_mbox = $('#index_mask > div.pro_mask > div.sub_mbox');
    var j_error = j_mbox.find('div.head > div.error');
    var codebox = CodeMirror(j_mbox.find('div.codebox')[0],{
	mode:'text/x-c++src',
	theme:'lesser-dark',
	lineNumbers:true,
	matchBrackets:true,
	indentUnit:4
    });
    var proid = null;

    that.node = new vus.node('pro_sub');

    that.__super();

    that.init = function(id){
	proid = id;
	j_mbox.find('div.head > div.title').text('上傳ProID:' + proid);
	j_error.text('');
	$(j_mbox.find('[name="lang"] > option')[0]).attr('selected',true);
	codebox.setValue('');

	com.vus_mbox.child_set(that.node);
    };
    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    that.fadein(j_mbox);
	    codebox.refresh();
	}else if(direct == 'out'){
	    that.fadeout(j_mbox);
	    proid = null;
	    com.vus_mbox.child_del(that.node);
	}

	return 'cont';
    };

    j_mbox.find('div.head > div.oper > button.submit').on('click',function(e){
	$.post('/toj/php/problem.php',{'action':'submit_code','data':JSON.stringify({'proid':proid,'lang':1,'code':codebox.getValue()})},function(res){
	    if(res[0] == 'E'){
		if(res == 'Enot_login'){
		    j_error.text('未登入');
		}else if(res == 'Ewrong_language'){
		    j_error.text('語言錯誤');
		}else if(res == 'Ecode_too_long'){
		    j_error.text('程式碼過長');
		}else{
		    j_error.text('其他錯誤');
		}
	    }else{
		com.url_pull();
	    }
	});
    });

    codebox.getWrapperElement().style.width = '100%';
    codebox.getWrapperElement().style.height = '100%';
    codebox.getScrollerElement().style.width = '100%';
    codebox.getScrollerElement().style.height = '100%';
}; __extend(class_pro_sub_mbox,class_com_mbox);
