var nor_userid;
var nor_usersec;

function nor_init(){
    $('div.nor_button').hover(
	    function(e){
		$(this).addClass('nor_button_m');
	    },
	    function(e){
		$(this).removeClass('nor_button_m');
	    }
    );
    $('div.nor_tab > div.button').hover(
	    function(e){
		$(this).addClass('button_m');
	    },
	    function(e){
		$(this).removeClass('button_m');
	    }
    );
    $('div.nor_mask_head > div.button').hover(
	    function(e){
		$(this).addClass('button_m');
	    },
	    function(e){
		$(this).removeClass('button_m');
	    }
    );
}
function nor_scoretolight(sumscore,summaxscore){
    var i;
    var part;
    var light;

    if(sumscore == null){
	return 0;
    }

    if(summaxscore == 0){
	light = 1;
    }else{
	ratio = Math.floor(sumscore / summaxscore * 100);
	if(ratio == 100){
	    light = 4;
	}else if(ratio >= 80){
	    light = 3;
	}else if(ratio >= 60){
	    light = 2;
	}else{
	    light = 1;
	}
    }

    return light;
}
function nor_expendheight(){
    var i;
    var es;
    var j_e;

    es = $('[expendheight=true]');
    for(i = 0;i < es.length;i++){
        j_e = $(es[i]);
	j_e.css('height',(window.innerHeight - parseInt(j_e.css('top').match(/(.+)px/)[1])) + 'px');
    }
}
function nor_new_chpgbutton(text,click){
    var j_a;

    j_a = $('<a></a>')
    j_a.addClass('nor_chpg');
    j_a.on('click',click);
    j_a.text(text)

    return j_a;
}

function nor_getparam(){
    var ret;
    var i;

    var part;
    var subpart;

    ret = new Object();
    part = location.href.match(/([^?&]+)/g);
    for(i = 1;i < part.length;i++){
	part[i] = part[i].replace(/\+/g,' ');
	subpart = part[i].split('=');
	ret[decodeURIComponent(subpart[0]).replace(/^\s+|\s$/,' ')] = decodeURIComponent(subpart[1]);
    }

    return ret;
}
function nor_getcookie(){
    var ret;
    var i;

    var part;
    var subpart;
    
    ret = new Object();
    part = document.cookie.split(';');
    for(i = 0;i < part.length;i++){
	part[i] = part[i].replace(/\+/g,' ');
	subpart = part[i].split('=');
	ret[decodeURIComponent(subpart[0])] = decodeURIComponent(subpart[1]);
    }

    return ret;
}
