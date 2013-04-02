var home = new function(){
    var that = this;
	
    that.init = function(){
	home.home_pbox = new class_home_pbox;
	home.none_pbox = new class_none_pbox;
    }
};

var class_home_pbox = function(){
    var that = this;
    var j_pbox = $('#index_page > div.home_pbox');

    that.node = new vus.node('home');
	
    that.__super();

    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    that.fadein(j_pbox);
	    index.title_set('Taiwan Online Judge (for sprout)');
	    tmp();
	}else if(direct == 'out'){
	    that.fadeout(j_pbox);
	    tmp_stop = true;
	}

	return 'cont';
    }
    com.vus_root.child_set(that.node);

    var tmp_stop = true;
    var tmp_first = true;

    var load;
    var prog = 0;
    var bd = Math.PI / 180;

    var co_table = [
	'255,255,0',
	'255,0,255',
	'255,255,0',
	'255,255,255',
	'17,50,133',
	'203,27,69',
	'233,139,42',
	'186,145,50',
	'123,162,63',
	'27,129,62',
	'0,170,144',
	'0,137,167',
	'0,92,175',
	'203,64,66',
	'233,205,76',
	'232,48,21',
	'255,196,8'
    ];

    var st;
    var et;
    var pa_off = 0;
    var pa_c = 6;
    var pa_co = 0;
    var pb_off = 0;
    var pb_c = 6;
    var pb_co = 0;

    function tmp(){
	var e_ani;
	var e_canvas;
	var ctx;
	var e_audio;

	function drawTextAlongArc(context,str,centerX,centerY,radius,angle,offangle) {
	    var len = str.length, s;
	    context.save();
	    context.translate(centerX,centerY);
	    context.rotate(-1 * offangle);
	    context.rotate(-1 * angle / 2);
	    context.rotate(-1 * (angle / len) / 2);
	    for(var n = 0; n < len; n++) {
		context.rotate(angle / len);
		context.save();
		context.translate(0, -1 * radius);
		s = str[n];
		context.fillText(s,0,0);
		context.restore();
	    }
	    context.restore();
	}
	function drawRect(ctx,x,y,w,h){
	    ctx.beginPath();
	    ctx.rect(x,y,w,h);
	    ctx.fill();
	}
	function drawCircle(ctx,x,y,r,a,off){
	    ctx.beginPath();
	    ctx.arc(x,y,r,off,a + off,false);
	    ctx.stroke();
	}
	function drawLine(ctx,ax,ay,bx,by){
	    ctx.beginPath();
	    ctx.moveTo(ax,ay);
	    ctx.lineTo(bx,by);
	    ctx.stroke();
	}
	function drawPoly(ctx,x,y,r,c,offangle){
	    var i;

	    ctx.save();
	    ctx.beginPath();
	    ctx.translate(x,y);
	    ctx.rotate(-1 * offangle);
	    ctx.moveTo(0,-r);
	    for(i = 1;i <= c;i++){
		ctx.rotate(bd * 360 / c);
		ctx.lineTo(0,-r);
	    }
	    ctx.stroke();
	    ctx.restore();
	}

	var ani = function(){
	    var i;
	    var u,v;

	    if(tmp_stop == true){
		return;
	    }

	    et = new Date().getTime();
	    if((et - st) < 20){
		window.requestAnimationFrame(ani);
		return;
	    }
	    ctx.clearRect(0,0,1920,1080);

	    ctx.fillStyle = 'rgba(128,128,128,1)';
	    ctx.shadowBlur = 0;

	    ctx.strokeStyle = 'rgba(30,30,30,1)';
	    ctx.lineWidth = 2;
	    u = 3000 - (prog % 240) / 240 * 3000;
	    for(i = 0;i < 12;i++){
		v = (u + i * 250) % 3000;
		drawLine(ctx,v - 540,-5,v - 1040,1085);
	    }
	    ctx.strokeStyle = 'rgba(30,30,30,1)';
	    ctx.lineWidth = 2;
	    u = 2500 - (prog % 240) / 240 * 2500;
	    for(i = 0;i < 10;i++){
		v = (u + i * 250) % 2500;
		drawLine(ctx,-5,v - 1250,1925,v - 540);
	    }

	    ctx.strokeStyle = 'rgba(128,128,128,1)';

	    ctx.lineWidth = 12;
	    drawCircle(ctx,700,500,550,bd * 30,-bd * (prog % 360));
	    drawCircle(ctx,700,500,550,bd * 30,-bd * (prog % 360 + 120));
	    drawCircle(ctx,700,500,550,bd * 30,-bd * (prog % 360 + 240));

	    ctx.lineWidth = 8;
	    drawCircle(ctx,700,500,450,bd * 360,0);

	    ctx.lineWidth = 16;
	    drawCircle(ctx,700,500,440,bd * 60,-bd * ((prog * 2) % 360));
	    drawCircle(ctx,700,500,440,bd * 60,-bd * ((prog * 2) % 360 + 120));
	    drawCircle(ctx,700,500,440,bd * 60,-bd * ((prog * 2) % 360 + 240));

	    ctx.lineWidth = 10;
	    drawCircle(ctx,700,500,390,bd * 60,bd * ((prog * 7) % 360 + 160));
	    ctx.lineWidth = 8;
	    drawCircle(ctx,700,500,370,bd * 30,-bd * ((prog * 8) % 360 + 290));

	    ctx.lineWidth = 8;
	    drawCircle(ctx,700,500,350,bd * 60,bd * ((prog * 3) % 360));
	    ctx.lineWidth = 38;
	    drawCircle(ctx,700,500,335,bd * 20,bd * ((prog * 3) % 360 + 59));
	    ctx.lineWidth = 8;
	    drawCircle(ctx,700,500,320,bd * 80,bd * ((prog * 3) % 360 + 60));

	    ctx.lineWidth = 8;
	    drawCircle(ctx,700,500,350,bd * 50,bd * ((prog * 3) % 360 + 200));
	    ctx.lineWidth = 28;
	    drawCircle(ctx,700,500,340,bd * 40,bd * ((prog * 3) % 360 + 249));
	    ctx.lineWidth = 8;
	    drawCircle(ctx,700,500,330,bd * 60,bd * ((prog * 3) % 360 + 260));

	    if(prog % 6 < 4 || prog < 456 || prog > 912){
		ctx.lineWidth = 4;
		drawCircle(ctx,700,500,300,bd * 360,0);
		ctx.lineWidth = 16;
		drawCircle(ctx,700,500,295,bd * 80,-bd * ((prog * 4) % 360 + 90));
	    }
	    
	    ctx.lineWidth = 8;
	    drawCircle(ctx,700,500,260,bd * 90,bd * ((prog * 6) % 360 + 120));
	    drawCircle(ctx,700,500,210,bd * 160,bd * ((prog * 3) % 360 + 270));
	    drawCircle(ctx,700,500,230,bd * 120,-bd * ((prog * 5) % 360 + 120));

	    ctx.strokeStyle = 'rgba(128,128,128,' + (1 - (prog % 24)/24) + ')';
	    ctx.lineWidth = 8;
	    drawCircle(ctx,700,500,80 + (prog % 24) * 4,bd * 360,0);
	    ctx.lineWidth = 4;
	    drawCircle(ctx,700,500,70 + (prog % 24) * 4,bd * 360,0);

	    ctx.font = 'bold 16px tahoma';
	    drawTextAlongArc(ctx,"Hello TOJ [sprout]",700,500,460,bd * 60,bd * (prog % 360 + 115) * 2);
	    drawTextAlongArc(ctx,"Are You Happy?",700,500,460,bd * 50,bd * (prog % 360 + 30) * 2);

	    if(prog < 456 || prog > 912){
		ctx.strokeStyle = 'rgba(255,255,255,1)';
		ctx.lineWidth = 6;
		drawCircle(ctx,700,500,60,bd * 60,bd * ((prog * 4) % 360));
		drawCircle(ctx,700,500,60,bd * 60,bd * ((prog * 4) % 360 + 180));
	    }else{
		u = prog % 48;
		if(u == 0){
		    pa_off = bd * (prog % 373);
		    pa_c = prog % 5 + 3;
		    pa_co = Math.round(Math.random() * co_table.length);
		}
		ctx.strokeStyle = 'rgba(' + co_table[pa_co] + ',' + (1 - u / 48) + ')';
		drawPoly(ctx,700,500,u * 20,pa_c,pa_off);
		u = (prog + 24) % 48;
		if(u == 0){
		    pb_off = bd * (prog % 173);
		    pb_c = prog % 5 + 3;
		    pb_co = Math.round(Math.random() * co_table.length);
		}
		ctx.strokeStyle = 'rgba(' + co_table[pb_co] + ',' + (1 - u / 48) + ')';
		drawPoly(ctx,700,500,u * 20,pb_c,pb_off);

		ctx.strokeStyle = 'rgba(255,255,255,1)';
		ctx.lineWidth = 6;
		drawCircle(ctx,700,500,40,bd * 60,-bd * ((prog * 15) % 360));
		drawCircle(ctx,700,500,40,bd * 60,-bd * ((prog * 15) % 360 + 180));
	    }

	    v = prog % 96;
	    if((v >= 24 && v < 26)|| (v >= 28 && v < 30)){
		ctx.shadowBlur = 8;
	    }else{
		ctx.shadowBlur = 0;
	    }

	    ctx.font = 'bold 64px tahoma';
	    u = 0;
	    ctx.fillStyle = 'rgba(255,255,0,1)';
	    ctx.shadowColor = 'rgba(255,255,0,1)';
	    ctx.fillText('T',1000 + u,600);
	    ctx.fillStyle = 'rgba(255,255,255,1)';
	    ctx.shadowColor = 'rgba(255,255,255,1)';
	    u += ctx.measureText('T').width;
	    ctx.fillText('aiwan',1000 + u,600);
	    u += ctx.measureText('aiwan').width;

	    if((v >= 32 && v < 34)|| (v >= 36 && v < 38)){
		ctx.shadowBlur = 8;
	    }else{
		ctx.shadowBlur = 0;
	    }

	    ctx.fillStyle = 'rgba(255,0,255,1)';
	    ctx.shadowColor = 'rgba(255,0,255,1)';
	    ctx.fillText(' O',1000 + u,600);
	    ctx.fillStyle = 'rgba(255,255,255,1)';
	    ctx.shadowColor = 'rgba(255,255,255,1)';
	    u += ctx.measureText(' O').width;
	    ctx.fillText('nline',1000 + u,600);
	    u += ctx.measureText('nline').width;

	    if((v >= 40 && v < 42)|| (v >= 44 && v < 46)){
		ctx.shadowBlur = 8;
	    }else{
		ctx.shadowBlur = 0;
	    }

	    ctx.fillStyle = 'rgba(0,255,255,1)';
	    ctx.shadowColor = 'rgba(0,255,255,1)';
	    ctx.fillText(' J',1000 + u,600);
	    ctx.fillStyle = 'rgba(255,255,255,1)';
	    ctx.shadowColor = 'rgba(255,255,255,1)';
	    u += ctx.measureText(' J').width;
	    ctx.fillText('udge',1000 + u,600);

	    ctx.shadowBlur = 0;

	    ctx.fillStyle = 'rgba(255,196,8,0.9)';
	    drawRect(ctx,0,930,1920,70);

	    ctx.font = 'bold 50px 微軟正黑體';
	    ctx.fillStyle = 'rgba(255,255,255,1)';
	    ctx.fillText('Taiwan Online Judge (for sprout)     システムテスト',1920 - (prog % 720) / 720 * 3000,980);
	    ctx.fillText('Taiwan Online Judge (for sprout)     システムテスト',1920 - ((prog + 360) % 720) / 720 * 3000,980);

	    ctx.font = 'bold 36px 微軟正黑體';
	    u = ctx.measureText('Parallel Judge 使用可能').width + 64;
	    ctx.fillText('Parallel Judge 使用可能',1920 - u,64);

	    if(prog % 24 < 12){
		ctx.font = 'bold 36px 微軟正黑體';
		u = ctx.measureText('INSERT COIN[S]').width + 64;
		ctx.fillText('INSERT COIN[S]',1920 - u,1045);
	    }

	    if(prog <= 45){
		ctx.fillStyle = 'rgba(8,8,8,1)';
		drawRect(ctx,0,0,1920,1080);
	    }else if(prog < 50){
		ctx.fillStyle = 'rgba(8,8,8,' + (1 - (prog / 50)) + ')';
		drawRect(ctx,0,0,1920,1080);
	    }

	    if(prog > 25){
		if(prog <= 45){
		    ctx.fillStyle = 'rgba(255,255,0,1)';
		    drawRect(ctx,1000 * ((prog - 25) / 20) * 4 - 3000,500,200,128);
		    ctx.fillStyle = 'rgba(255,0,255,1)';
		    drawRect(ctx,1200 * ((prog - 25) / 20) * 4 - 3600,500,200,128);
		    ctx.fillStyle = 'rgba(0,255,255,1)';
		    drawRect(ctx,1400 * ((prog - 25) / 20) * 4 - 4200,500,200,128);
		}else if(prog < 50){
		    ctx.fillStyle = 'rgba(255,255,0,' + (1 - (prog / 50)) + ')';
		    drawRect(ctx,1000,500,200,128);
		    ctx.fillStyle = 'rgba(255,0,255,' + (1 - (prog / 50)) + ')';
		    drawRect(ctx,1200,500,200,128);
		    ctx.fillStyle = 'rgba(0,255,255,' + (1 - (prog / 50)) + ')';
		    drawRect(ctx,1400,500,200,128);
		}
	    }

	    st = et;
	    prog++;
	    if(prog == 1080){
		prog = 360;
	    }
	    window.requestAnimationFrame(ani);
	};

	var loadani = function(){
	    var u;
	    var v;

	    ctx.clearRect(0,0,1920,1080);

	    if(tmp_stop == true){
		return;
	    }

	    if(prog < 50){
		u = 0;
	    }else if(prog < 100){
		u = (prog - 50) / 50;
	    }else if(prog < 250){
		u = 1; 
	    }else if(prog < 300){
		u = (300 - prog) / 50;
	    }else{
		u = 0;
	    }

	    ctx.fillStyle = 'rgba(8,8,8,1)';
	    drawRect(ctx,0,0,320,1080);
	    
	    //v = ctx.measureText('TF ∪  CK').width;
	    //ctx.fillStyle = 'rgba(128,0,0,' + u + ')';
	    //ctx.fillRect(960 - v / 2 - 10,380,v + 20,200);
	    
	    //var canvas = document.createElement('sproutcanvas');
	    //var context = canvas.getContext('2d');
	    //var img = document.getElementById('myimg');
	    //context.drawImage(img, 0, 0 );
	    //var myData = context.getImageData(0, 0, img.width, img.height);
	    //ctx.fillStyle = 'rgba(255,255,255,' + u + ')';
	    //ctx.font = 'bold 36px tahoma';//v
	    //ctx.fillText('TF ∪  CK',1560 - v / 2,850);


	    var imageObjSprout = new Image();
	    imageObjSprout.src = '/toj/jcs/sprout2.png';
	    ctx.drawImage(imageObjSprout, 690,260,500,500);  
	    //var imgdSprout = ctx.getImageData(0, 0, 300, 300);  
	    //var Sproutpix_alpha = imgdSprout.data;  
	    //for(var spj = 3, spn = Sproutpix_alpha.length; spj < spn; spj += 4) {  
	    //    Sproutpix_alpha[spj] = Sproutpix_alpha[spj] * 0.2;  
	    //}  
	    //ctx.drawImage(Sproutpix_alpha, 2, 2);	    
	    //ctx.putImageData(imgdSprout, 0, 0, 300, 300);
	    var spu = 1.0-u;  
	    //alert(pu);
	    var spuint=parseInt(8);
	    //if(spuint<1)spuint=1;
	    ctx.fillStyle = 'rgba(' + spuint + ',' + spuint + ',' + spuint + ',' + spu + ')';
	   			 
	    ctx.fillRect(690-1+23,260-1+23,500+2-46+2,500+2-46+3);

	    //ctx.fillStyle = 'rgba(255,255,255,' + u + ')';
	    //ctx.font = 'bold 32px tahoma';//v
	    //ctx.fillText('TF∪CK ',1560 - v / 2,850);
	    

	    prog++;
	    if(prog == 400){
		prog = 0;
		st = 0;
		document.getElementById('tmp_audio').volume = 0.5;
		document.getElementById('tmp_audio').play();
		ani();
	    }else{
		setTimeout(loadani,10);
	    }
	}

	e_ani = document.getElementById('tmpani');
	e_canvas = document.getElementById('tmpcanv');

	if(e_ani.clientWidth * 9 > e_ani.clientHeight * 16){
	    e_canvas.width = e_ani.clientHeight / 9 * 16;
	    e_canvas.height = e_ani.clientHeight;
	}else{
	    e_canvas.width = e_ani.clientWidth;
	    e_canvas.height = e_ani.clientWidth / 16 * 9;
	}

	var waitaudio = function(){
	    if(document.getElementById('tmpload_audio').readyState != 4 || document.getElementById('tmp_audio').readyState != 4){
		setTimeout(waitaudio,100);	
	    }else{
		e_audio = document.getElementById('tmpload_audio');
		e_audio.volume = 0.5;
		e_audio.play();
		loadani();
	    }
	}

	ctx = e_canvas.getContext('2d');
	ctx.scale(e_canvas.width / 1920,e_canvas.height / 1080);

	tmp_stop = false;
	if(tmp_first == true){
	    load = true;
	    waitaudio();
	}else{
	    load = false;
	    ani();
	}

	tmp_first = false;
    }
}; __extend(class_home_pbox,class_com_pbox);

var class_none_pbox = function(){
    var that = this;
    var j_pbox = $('#index_page > div.none_pbox');

    that.node = new vus.node('none');

    that.__super();

    that.node.url_chg = function(direct,url_upart,url_dpart){
	if(direct == 'in'){
	    that.fadein(j_pbox);
	    index.title_set('Taiwan Online Judge');
	}else if(direct == 'out'){
	    that.fadeout(j_pbox);
	}

	return 'cont';
    }   
    com.vus_root.child_set(that.node);
}; __extend(class_none_pbox,class_com_pbox);
