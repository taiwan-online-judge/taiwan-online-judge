'use strict'

var sqmod_test = function(sq_node){
    var that = this;
    var index_node = new vus.node('index');
    var j_index_page = $('#index_page');

    sq_node.url_chg = function(direct,url_upart,url_dpart,param){
        if(direct == 'in'){
            if(url_dpart.length == 0){
                com.url_update('/toj/' + url_upart.join('/') + '/index/');
                return 'stop';
            }
        }

        return 'cont';
    }

    index_node.url_chg = function(direct,url_upart,url_dpart,param){
        if(direct == 'in'){
            com.loadpage('/toj/sqmod/sqmod_test/html/index.html').done(function(){
                test();        
            });
        }

        return 'cont';
    };
    sq_node.child_set(index_node);

    that.unload = function(){

    };




    function test(){
        var i;
        var j;
        var st;
        var j_div;
        var j_box;
        var j_fps;
        var j_stage_bottom;
        var j_stage;
        var j_stage_top;
        var ctx_bottom;
        var eng_bottom;
        var ctx;
        var eng;
        var ctx_top;
        var eng_top;

        var butts;
        var keymap = {'4':[0,0],'5':[0,1],'6':[0,2],'7':[0,3],
                      'R':[1,0],'T':[1,1],'Y':[1,2],'U':[1,3],
                      'F':[2,0],'G':[2,1],'H':[2,2],'J':[2,3],
                      'V':[3,0],'B':[3,1],'N':[3,2],'M':[3,3]};

        var audio;
        var ab_select;
        var ab_song2;
        var ab_song3;
        var ab_song4;

        var i_top = new Image();
        var i_light = new Image();
        var i_wave1 = new Image();
        var i_cover2 = new Image();
        var i_cover3 = new Image();
        var i_cover4 = new Image();

        var i_marks = new Array();

        

        function _load(){
            var i;
            var image;

            function _load_audio(filename,callback){
                var xhr = new XMLHttpRequest();
                xhr.open('GET','/toj/sqmod/sqmod_test/html/' + filename,true);
                xhr.responseType = 'arraybuffer';
                xhr.onload = function(){
                    audio.decodeAudioData(xhr.response,callback);
                }
                xhr.send();
            }

            i_top.src = '/toj/sqmod/sqmod_test/html/top.png';
            i_light.src = '/toj/sqmod/sqmod_test/html/light.png';
            i_wave1.src = '/toj/sqmod/sqmod_test/html/wave1.png';
            i_cover2.src = '/toj/sqmod/sqmod_test/html/IMSOHAPPY.jpg';
            i_cover3.src = '/toj/sqmod/sqmod_test/html/JOMANDA.jpg';
            i_cover4.src = '/toj/sqmod/sqmod_test/html/MOTHERSHIP.png';

            for(i = 0;i < 15;i++){
                image = new Image();
                image.src = '/toj/sqmod/sqmod_test/html/mark/mal_' + i + '.png';
                i_marks.push(image);
            }
            for(i = 0;i < 7;i++){
                image = new Image();
                image.src = '/toj/sqmod/sqmod_test/html/mark/malpassed_' + i + '.png';
                i_marks.push(image);
            }
            
            window.AudioContext = window.AudioContext || window.webkitAudioContext;

            audio = new AudioContext();
           
            _load_audio('select.ogg',function(buffer){
                ab_select = buffer;
            });
            _load_audio('IMSOHAPPY.ogg',function(buffer){
                ab_song2 = buffer;
            });
            _load_audio('JOMANDA.ogg',function(buffer){
                ab_song3 = buffer;
            });
            _load_audio('MOTHERSHIP.ogg',function(buffer){
                ab_song4 = buffer;
            });
        }

        function _scale(){
            var i;
            var j;
            var w;
            var h;
            var sw;
            var sh;
            var ratio;

            w = j_div.width();
            h = j_div.height();

            if(w * 3 >= h * 4){
                sw = h * 4 / 3;
                sh = h;
            }else{
                sw = w;
                sh = w * 3 / 4;
            }

            ratio = sw / 1920;
            for(i = 0;i < 4;i++){
                for(j = 0;j < 4;j++){
                    butts[i][j].css('top',(32 + i * 352) * ratio);
                    butts[i][j].css('left',(272 + j * 352) * ratio);
                    butts[i][j].width(320 * ratio);
                    butts[i][j].height(320 * ratio);
                }
            }

            j_box.width(sw);
            j_box.height(sh);
            j_stage_bottom.attr('width',sw);
            j_stage_bottom.attr('height',sh);
            j_stage.attr('width',sw);
            j_stage.attr('height',sh);
            j_stage_top.attr('width',sw);
            j_stage_top.attr('height',sh);
            ctx_bottom.scale(sw / 1920,sh / 1440);
            ctx.scale(sw / 1920,sh / 1440);
            ctx_top.scale(sw / 1920,sh / 1440);
        }
        
        var wave1_off = 0;
        var wave2_off = -1920;
        function _wave(){
            wave1_off -= 4;
            if(wave1_off < -i_wave1.width){
                wave1_off = -(wave1_off + i_wave1.width);
            }
            wave2_off -= 3;
            if(wave2_off < -i_wave1.width){
                wave2_off = -(wave2_off + i_wave1.width);
            }
            
            eng_bottom.add_draw(function(ctx){
                ctx.drawImage(i_wave1,wave1_off,1440 - i_wave1.height);
                ctx.drawImage(i_wave1,wave1_off + i_wave1.width,1440 - i_wave1.height);
                ctx.drawImage(i_wave1,wave2_off,1440 - i_wave1.height);
                ctx.drawImage(i_wave1,wave2_off + i_wave1.width,1440 - i_wave1.height);
            });

            eng_bottom.add_work(_wave);
        }

        var lights;
        function _top(){
            eng_top.add_draw(function(ctx){
                var i;
                var j;

                for(i = 0;i < 4;i++){
                    for(j = 0;j < 4;j++){
                        if(butts[i][j].touch == true){
                            ctx.drawImage(i_light,butts[i][j].x,butts[i][j].y);
                        }
                    }
                }

                ctx.drawImage(i_top,0,0);
            });
            eng_top.add_work(_top);
        }

        function _pro(){
            var curr_song = null;
            var start_cd = null;

            function __draw(){
                eng.add_draw(function(ctx){
                    var title;

                    function _draw_pro(i,j,title,cover){
                        var x,y;

                        x = butts[i][j].x;
                        y = butts[i][j].y;

                        if(cover != undefined){
                            ctx.drawImage(cover,x + 8,y + 8,304,304); 
                        }else{
                            ctx.fillStyle = '#1C1C1C';
                            ctx.font = '40px Saucer-Bold';
                            ctx.fillText(title,x + 32,y + 290);
                        }
                    }

                    _draw_pro(0,0,'A+B Problem');
                    _draw_pro(0,1,'I\'m so happy',i_cover2);
                    _draw_pro(0,2,'JOMANDA',i_cover3);
                    _draw_pro(0,3,'Mother Ship',i_cover4);

                    ctx.fillStyle = '#1C1C1C';
                    ctx.font = '60px Saucer-Regular';
                    if(curr_song != null){
                        if(start_cd == null){
                            start_cd = eng.ts;
                        }
                        
                        ctx.fillText('BACK',1002,1344);
                        ctx.fillText('START',1360,1344);

                        ctx.font = '48px Saucer-Regular';
                        ctx.fillText(new Number(60 - ((eng.ts - start_cd) / 1000)).toFixed(2),1360,1244);

                        title = curr_song;
                    }else{
                        ctx.fillText('PREV',1002,1344);
                        ctx.fillText('NEXT',1360,1344);

                        title = 'SELECT  PROBLEM';
                    }

                    ctx.rotate(Math.PI / 2);
                    ctx.font = '100px Saucer-Regular';
                    ctx.fillText(title,32,-100);
                });

                eng.add_work(__draw);
            }

            butts[0][1].on('click',function(e){
                _audio_play(ab_song2);
                curr_song = 'I\'m so happy';
            });
            butts[0][2].on('click',function(e){
                _audio_play(ab_song3);
                curr_song = 'JOMANDA';
            });
            butts[0][3].on('click',function(e){
                _audio_play(ab_song4);
                curr_song = 'Mother Ship';
            });

            butts[3][2].on('click',function(e){
                if(curr_song != null){
                    _audio_play(ab_select);
                    start_cd = null;
                    curr_song = null;
                }
            });
            butts[3][3].on('click',function(e){
                _test();
            });


            __draw();
        }
        
        function _test(){
            var timemap = new Array();
            var st = null;
            var curr = 0;
            var poslist = new Array();
            var last_touch;

            var curr_combo = 0;
            var score = {
                'perfect':0,
                'great':0,
                'good':0,
                'badd':0,
                'miss':0,
                'max_combo':0
            };

            function __judge(time){
                var ret;

                time = Math.abs(time);

                if(time > 500){
                    score.miss += 1;
                    ret = 4;
                }else if(time > 200){
                    score.bad += 1;
                    ret = 3;
                }else if(time > 100){
                    score.good += 1;
                    ret = 2;
                }else if(time > 50){
                    score.great += 1;
                    ret = 1;
                }else{
                    score.perfect += 1;
                    ret = 0;
                }

                if(ret <= 4){
                    curr_combo += 1;
                    score.max_combo = Math.max(score.max_combo,curr_combo);
                }else{
                    curr_combo = 0;
                }

                return ret;
            }
            function __play(){
                var i;
                var j;
                var ct;
                var map;
                var poss;
                var pos;
                var row;
                var col;
                var time;
                var next_poslist;

                ct = eng.ts - st;

                map = timemap[curr];
                if((ct + 509) >= map.time){
                    poss = map.pos;
                    for(i = 0;i < poss.length;i++){
                        poslist.push({'judge':-1,'time':map.time,'pos':poss[i]});
                    }

                    curr += 1;
                    if(curr >= timemap.length){
                        return;
                    }
                }

                next_poslist = new Array();
                for(i = 0;i < poslist.length;i++){
                    pos = poslist[i];
                    time = ct - pos.time;
                    if(time >= 500){
                        if(pos.judge == -1){
                            pos.judge = __judge(time);
                        }
                        continue;
                    }

                    if(Math.abs(time) < 50 && pos.judge == -1){
                        pos.judge = __judge(time);
                    }

                    row = pos.pos[0];
                    col = pos.pos[1];
                    if(butts[row][col].touch == true && last_touch[row][col] == false){
                        pos.judge = __judge(time);
                    }

                    next_poslist.push(pos);
                }
                poslist = next_poslist;
                
                for(i = 0;i < 4;i++){
                    for(j = 0;j < 4;j++){
                        last_touch[i][j] = butts[i][j].touch;
                    }
                }

                eng.add_work(__play);
            }
            function __drawmark(ctx,x,y,time){
                var image = i_marks[Math.floor(time / 36.36364)];
                ctx.drawImage(image,x + 8,y + 8,304,304);
            }
            function __draw(ctx){
                var i;
                var j;
                var pos;
                var row;
                var col;
                var time;

                ctx.fillStyle = '#C3C3C3';
                for(i = 0;i < poslist.length;i++){
                    pos = poslist[i];

                    time = (eng.ts - st) - pos.time; 
                    if(time >= -509 && time < 291){
                        row = pos.pos[0];
                        col = pos.pos[1];
                        __drawmark(ctx,butts[row][col].x,butts[row][col].y,time + 509);
                    }
                }
                eng.add_draw(__draw,10);
            }

            function __combo(){
                var last_combo = curr_combo;
                var ani_st = -1;

                function ___draw(ctx){
                    var m;
                    var move = 0;

                    if(curr_combo != last_combo && ani_st == -1){
                        ani_st = eng.ts; 
                    }

                    if(ani_st != -1){
                        if((move = eng.beat_ease(150,10,eng.ts - ani_st)) == null){
                            ani_st = -1;
                        }else{
                            ctx.transform(1,0,0,1,0,-move);
                        }
                    }

                    ctx.fillStyle = '#D9D9D9';
                    ctx.font = '300px Saucer-Mono';
                    m = ctx.measureText(curr_combo);
                    ctx.fillText(curr_combo,272 + 352 * 3 - 64 - m.width,32 + 352 * 2 - 64);

                    ctx.font = '60px Saucer-Mono';
                    m = ctx.measureText('combo');
                    ctx.fillText('combo',272 + 352 * 3 - 64 - m.width,32 + 352 * 2 + 64);

                    last_combo = curr_combo;

                    eng.add_draw(___draw,0);
                }

                eng.add_draw(___draw,0);
            }

            $.get('/toj/sqmod/sqmod_test/html/JOMANDA.ju',function(data){
                var i;
                var j;
                var k;
                var lines;
                var line;
                var parts;

                var tpb;
                var lbeat;
                var beat;
                var map;

                var ltime;
                var time;
                var pos;

                lines = data.split('\n');

                //Find start
                for(i = 0;i < lines.length;i++){
                    line = lines[i];
                    if(line == '#start#'){
                        i++;
                        break;
                    }
                }

                //Read beatmap
                tpb = 0;
                lbeat = 0;
                ltime = 570;
                for(;i < lines.length;i++){
                    if((line = lines[i]) == ''){
                        continue;
                    }

                    parts = line.split(' ');
                    beat = parts[0];
                    time = ltime + (beat - lbeat) * tpb / 1000;
                    if(parts[1].charAt(0) == 't'){
                        tpb = 60000 / parseInt(parts[1].split('=')[1]);
                    }else{
                        map = parseInt(parts[1]);
                        pos = new Array();
                        for(j = 0;j < 4;j++){
                            for(k = 0;k < 4;k++){
                                if((map & 1) == 1){
                                    pos.push([j,k]);    
                                } 
                                map = map >> 1;
                            }
                        }

                        timemap.push({'time':time,'pos':pos});
                    }

                    lbeat = beat;
                    ltime = time;
                }

                last_touch = new Array(4);
                for(i = 0;i < 4;i++){
                    last_touch[i] = new Array(4);
                    for(j = 0;j < 4;j++){
                        last_touch[i][j] = butts[i][j].touch;
                    }
                }

                j_stage_bottom.css('background-color','#1C1C1C');

                st = eng.ts;
                _audio_play(ab_song3,1);
                eng.add_work(__play);
                eng.add_draw(__draw,10);
                __combo();
            });
        }

        function _ani(){
            var et = new Date().getTime();
            j_fps.text(Math.floor(1 / (et - st) * 1000));
            st = et;

            window.requestAnimationFrame(_ani);

            eng_bottom.update();
            eng.update();
            eng_top.update();
        }

        var g_out;
        function _audio(){
            g_out = audio.createGain();
            g_out.connect(audio.destination);
            g_out.gain.value = 0.2;
        }
        var curr_src = null;
        function _audio_play(buffer,delay){
            var src = audio.createBufferSource();
            var delay = audio.createDelay();

            if(curr_src != null){
                curr_src.stop(0);
            }


            src.buffer = buffer;
            if(delay != undefined){
                delay.delayTime.value = delay; 
                delay.connect(g_out);
                src.connect(delay);
            }else{
                src.connect(g_out);
            }
            src.start(0);

            curr_src = src;
        }

        $(window).on('resize',function(e){
            _scale();
        });
        $(window).on('keydown',function(e){
            var chr = String.fromCharCode(e.keyCode); 
            var pos;
            
            if((pos = keymap[chr]) != undefined){
                butts[pos[0]][pos[1]].touch = true; 
            }
        });
        $(window).on('keyup',function(e){
            var chr = String.fromCharCode(e.keyCode); 
            var pos;
            
            if((pos = keymap[chr]) != undefined){
                butts[pos[0]][pos[1]].touch = false; 
            }
        });

        j_div = j_index_page.find('div.stage');
        j_box = j_div.find('div.box');
        j_fps = j_box.find('span.fps');
        j_stage_bottom = j_box.find('canvas.bottom');
        j_stage = j_box.find('canvas.main');
        j_stage_top = j_box.find('canvas.top');

        ctx_bottom = j_stage_bottom[0].getContext('2d');
        ctx = j_stage[0].getContext('2d');
        ctx_top = j_stage_top[0].getContext('2d');

        butts = new Array(3);
        for(i = 0;i < 4;i++){
            butts[i] = new Array(3);
            for(j = 0;j < 4;j++){
                butts[i][j] = $('<div class="butt"></div>') 
                butts[i][j].data('row',i);
                butts[i][j].data('col',j);
                butts[i][j].x = 272 + (j * 352);
                butts[i][j].y = 32 + (i * 352);
                butts[i][j].touch = false;

                j_box.append(butts[i][j]);
            }
        } 

        lights = new Array(3);
        for(i = 0;i < 4;i++){
            lights[i] = new Array(3);
            for(j = 0;j < 4;j++){
                lights[i][j] = 0;
                
                butts[i][j].on('mousedown',function(e){
                    lights[$(this).data('row')][$(this).data('col')] = 1;
                });
                butts[i][j].on('mouseup',function(e){
                    lights[$(this).data('row')][$(this).data('col')] = 0;
                });
            }
        }

        _scale();
        _load();

        eng_bottom = new engine(ctx_bottom);
        //eng_bottom.add_work(_wave);
        eng = new engine(ctx);
        eng.add_work(_test);
        eng_top = new engine(ctx_top);
        eng_top.add_work(_top);


        eng_top.update();
        ctx.fillStyle = '#1C1C1C';
        ctx.font = '100px Saucer-Regular';
        ctx.fillText('LOADING...',272 + 352 + 32,272 + 353 + 32);

        setTimeout(function(){
            _audio();
            _audio_play(ab_select);
            
            st = new Date().getTime();
            window.requestAnimationFrame(_ani);
        },2000);
    }
};

var engine = function(ctx){
    var that = this;
    var workq = new Array();
    var drawq = new Array();
    var st = null;

    that.ts = new Date().getTime();

    that.add_work = function(work){
        workq.push({'work':work}); 
    }; 
    that.add_draw = function(draw,z){
        if(z == undefined){
            z = 0;
        }
        drawq.push({'z':z,'draw':draw});
    };
    that.update = function(){
        var i;
        var worktq;
        var drawtq;
        
        that.ts = new Date().getTime() - st;

        worktq = workq.slice(0);
        workq = new Array();
        for(i = 0;i < worktq.length;i++){
            worktq[i].work(); 
        }

        drawtq = drawq.slice(0);
        drawq = new Array();
        drawtq.sort(function(a,b){
            return a.z - b.z;
        });
        if(drawtq.length > 0){
            ctx.clearRect(0,0,1920,1440);
        }
        for(i = 0;i < drawtq.length;i++){
            ctx.save();
            drawtq[i].draw(ctx);
            ctx.restore();
        } 
    };

    that.beat_ease = function(dur,max,off){
        if(off > dur){
            return null;
        }
        
        if(off * 2 < dur){
            return max * (off * 2 / dur);
        }else{
            return max * (2 - off * 2 / dur); 
        } 
    }
};
