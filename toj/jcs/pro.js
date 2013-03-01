var pro = {
    init:function(){
	pro.pro_page = new class_pro_page;
    }
};

var class_pro_page = function(){
    var that  = this; 
    var ori_prop = new Object;
    var j_page = $('#index_page > [page="pro"]');
    var sub_mbox = new class_pro_sub_mbox(that);

    that.proid = null;
    that.proname = null;
    that.pmodname = null;

    that.__super();

    that.urlchange = function(direct){
	var proid;

	var _check = function(){
	    proid = common.geturlpart()[1];
	    if(proid == ''){
		return false;
	    }
	    proid = parseInt(proid);
	    return true;
	};
	var _in = function(){
	    index.settitle('TOJ-題目');

	    $.post('/toj/php/problem.php',{'action':'get_pro','data':JSON.stringify({'proid':proid})},function(res){
		var css;
		var reto;

		if(res[0] != 'E'){
		    that.proid = proid;
		    reto = JSON.parse(res);
		    that.proname = reto.proname;
		    that.pmodname = reto.pmodname;
		    j_page.addClass(that.pmodname);

		    css = $('<link rel="stylesheet" type="text/css" href="/toj/pmod/' + that.pmodname + '/' + that.pmodname + '.css">');
		    $('head').append(css);
		    css.ready(function(){
			$.get('/toj/pmod/' + that.pmodname + '/' + that.pmodname + '.html',{},function(res){
			    j_page.html(res);
			    $.getScript('/toj/pmod/' + that.pmodname + '/' + that.pmodname + '.js',function(script,stat,res){
				eval(that.pmodname + '.init(that,j_page)');
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
	    j_page.removeClass(that.pmodname);
	    index.emptycontent();
	    index.emptytab();
	    that.proid = null;
	    that.proname = null;
	    that.pmodname = null;
	};

	if(direct == 'in'){
	    if(_check()){
		_in();
	    }
	}else if(direct == 'out'){
	    _out();
	}else if(direct == 'same'){
	    if(_check()){
		if(proid != that.proid){
		    _out();
		    _in();
		}else{
		    that.export_urlchange('same');
		}
	    }
	}
    };
    that.submit = function(proid){
	if(proid == undefined){
	    proid = that.proid
	}
	sub_mbox.init(proid);
	common.showmbox(sub_mbox);
    };

    for(key in that){
	ori_prop[key] = that[key];
    }

    common.addpage('pro',that);
}; __extend(class_pro_page,class_common_page);

var class_pro_sub_mbox = function(paobj){
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

    that.__super(paobj);

    that.init = function(proid){
	that.proid = proid;
	j_mbox.find('div.head > div.title').text('上傳ProID:' + that.proid);
	j_error.text('');
	$(j_mbox.find('[name="lang"] > option')[0]).attr('selected',true);
	codebox.setValue('');
    };
    that.switchchange = function(direct){
	if(direct == 'in'){
	    that.fadein(j_mbox);
	    codebox.refresh();
	}else if(direct == 'out'){
	    that.fadeout(j_mbox);
	}
    };

    j_mbox.find('div.head > div.oper > button.submit').on('click',function(e){
	$.post('/toj/php/problem.php',{'action':'submit_code','data':JSON.stringify({'proid':that.proid,'lang':1,'code':codebox.getValue()})},function(res){
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
		common.hidembox(j_mbox); 
	    }
	});
    });
    j_mbox.find('div.head > div.oper > button.cancel').on('click',function(e){
	common.hidembox(j_mbox); 
    });

    codebox.getWrapperElement().style.width = '100%';
    codebox.getWrapperElement().style.height = '100%';
    codebox.getScrollerElement().style.width = '100%';
    codebox.getScrollerElement().style.height = '100%';
}; __extend(class_pro_sub_mbox,class_common_mbox);
