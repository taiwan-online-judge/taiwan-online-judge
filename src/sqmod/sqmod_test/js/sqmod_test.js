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
                run();
            });
        }

        return 'cont';
    };
    sq_node.child_set(index_node);

    that.unload = function(){

    };




    var keymap = {'4':[0,0],'5':[0,1],'6':[0,2],'7':[0,3],
                  'R':[1,0],'T':[1,1],'Y':[1,2],'U':[1,3],
                  'F':[2,0],'G':[2,1],'H':[2,2],'J':[2,3],
                  'V':[3,0],'B':[3,1],'N':[3,2],'M':[3,3]};
    var expfunc = new Object();

    var j_stage_bottom;
    var j_stage;
    var j_stage_top;
    var j_butts;

    var ctx_bottom;
    var ctx;
    var ctx_top;
    var eng_bottom;
    var eng;
    var eng_top;

    var audio_ctx;
    var g_out;
    var curr_src = null;

    var mouse_pos = null;
    var butts;
    var update_top_reen = false;
    var imgmap = new Object();
    var audiomap = new Object();

    var param_auto = false;

    function load_image(filename){
        var defer = $.Deferred();
        var image;

        if((image = imgmap[filename]) != undefined){
            defer.resolve(image)
        }
        
        image = new Image();
        image.onload = function(){
            imgmap[filename] = image;
            defer.resolve(image);
        }
        image.src = '/toj/sqmod/sqmod_test/html/' + filename;

        return defer.promise();
    }
    function load_audio(filename){
        var defer = $.Deferred();
        var buffer;
        var xhr;

        if((buffer = audiomap[filename]) != undefined){
            defer.resolve(buffer);
        }

        xhr = new XMLHttpRequest();
        xhr.open('GET','/toj/sqmod/sqmod_test/html/' + filename,true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function(){
            audio_ctx.decodeAudioData(xhr.response,function(buffer){
                audiomap[filename] = buffer;
                defer.resolve(buffer);
            });
        }
        xhr.send();

        return defer.promise();
    }
    function audio_play(buffer,ds){
        var src = audio_ctx.createBufferSource();
        var delay = audio_ctx.createDelay(10);
        var proc = audio_ctx.createScriptProcessor(16384,1,1);

        if(typeof(buffer) == 'string'){
            buffer = audiomap[buffer];
        }

        if(curr_src != null){
            curr_src.stop(0);
        }

        src.buffer = buffer;
        src.connect(proc);

        proc.onaudioprocess = function(e){
            console.log(e.inputBuffer.duration);
            src.disconnect(0);
            src.connect(g_out);
            proc.disconnect(0);

            console.log(new Date().getTime());
            expfunc.test();
        }
        proc.connect(g_out);

        if(ds != undefined){
            //delay.delayTime.value = ds; 
            //delay.connect(g_out);
            //src.connect(delay);
        }else{
            //src.connect(g_out);
        }
        src.start(0);

        curr_src = src;
    }

    function run(){
        var i;
        var j;
        var j_div;
        var j_box;
        var j_fps;
        var st;

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
                    j_butts[i][j].css('top',(32 + i * 352) * ratio);
                    j_butts[i][j].css('left',(272 + j * 352) * ratio);
                    j_butts[i][j].width(320 * ratio);
                    j_butts[i][j].height(320 * ratio);
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
        function _audio(){
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audio_ctx = new AudioContext();

            g_out = audio_ctx.createGain();
            g_out.connect(audio_ctx.destination);
            g_out.gain.value = 0.2;
        }
        function _update(){
            var et = new Date().getTime();
            var fps = Math.floor(1 / (et - st) * 1000);

            st = et;
            j_fps.text(fps);
            if(fps < 40){
                console.log(fps);
            }

            window.requestAnimationFrame(_update);

            eng_bottom.update();
            eng.update();
            eng_top.update();
        }

        $(window).on('resize',function(e){
            _scale();
            update_top();
        });
        $(window).on('keydown',function(e){
            var chr = String.fromCharCode(e.keyCode); 
            var pos;
            
            if((pos = keymap[chr]) != undefined){
                update_butt(pos[0],pos[1],true);
            }else if(chr == 'Z' || chr == 'X'){
                if(mouse_pos != null){
                    update_butt(mouse_pos[0],mouse_pos[1],true);
                }
            }else if(chr == 'A'){
                param_auto ^= true; 
            }
        });
        $(window).on('keyup',function(e){
            var chr = String.fromCharCode(e.keyCode); 
            var pos;
            
            if((pos = keymap[chr]) != undefined){
                update_butt(pos[0],pos[1],false);
            }else if(chr == 'Z' || chr == 'X'){
                if(mouse_pos != null){
                    update_butt(mouse_pos[0],mouse_pos[1],false);
                }
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

        j_butts = new Array(3);
        butts = new Array(3);
        for(i = 0;i < 4;i++){
            j_butts[i] = new Array(3);
            butts[i] = new Array(3);
            for(j = 0;j < 4;j++){
                butts[i][j] = new Object();
                butts[i][j].x = 272 + (j * 352);
                butts[i][j].y = 32 + (i * 352);
                butts[i][j].touch = false;

                j_butts[i][j] = $('<div class="butt"></div>') 
                j_butts[i][j].data('row',i);
                j_butts[i][j].data('col',j);

                j_butts[i][j].on('mousedown',function(e){
                    var j_this = $(this);
                    var row;
                    var col;

                    row = j_this.data('row');
                    col = j_this.data('col');

                    update_butt(row,col,true);
                });
                j_butts[i][j].on('mouseup',function(e){
                    var j_this = $(this);
                    var row;
                    var col;

                    row = j_this.data('row');
                    col = j_this.data('col');

                    update_butt(row,col,false);
                });
                j_butts[i][j].on('mouseover',function(e){
                    var j_this = $(this);
                    var row;
                    var col;

                    row = j_this.data('row');
                    col = j_this.data('col');
                    mouse_pos = [row,col];
                });
                j_butts[i][j].on('mouseout',function(e){
                    var j_this = $(this);
                    var row;
                    var col;

                    row = j_this.data('row');
                    col = j_this.data('col');

                    mouse_pos = null;
                    update_butt(row,col,false);
                });

                j_box.append(j_butts[i][j]);
            }
        } 

        _scale();
        _audio();

        expfunc.audio_play = audio_play;

        eng_bottom = new engine(ctx_bottom,expfunc);
        eng = new engine(ctx,expfunc);
        eng_top = new engine(ctx_top,expfunc);

        ctx.fillStyle = '#1C1C1C';
        ctx.font = '100px Saucer-Regular';
        ctx.fillText('LOADING...',272 + 352 + 32,272 + 353 + 32);

        $.when(preload()).done(function(){
            update_top();

            window.requestAnimationFrame(_update);

            play();
        })

        /*setTimeout(function(){
            _audio();
            _audio_play(ab_select);
            
            st = new Date().getTime();
            window.requestAnimationFrame(_ani);
        },2000);*/
    }

    function preload(){
        return $.when(
            load_image('door_blue.png'),
            load_image('wave1.png'),
            load_image('wave2.png'),
            load_image('top.png'),
            load_image('light.png'),
            load_audio('select.ogg'),
            load_audio('result.ogg')
        ); 
    }
    
    function update_butt(row,col,touch){
        if(butts[row][col].touch != touch){
            butts[row][col].touch = touch;
            update_top();
        }
    }
    function update_top(){
        var i_top = imgmap['top.png'];
        var i_light = imgmap['light.png'];

        if(update_top_reen == true){
            return;
        }
        update_top_reen = true;

        eng_top.add_draw(0,function(ctx){
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

            update_top_reen = false;
        });
    }
    function back(){
        var i_wave1 = imgmap['wave1.png'];
        var i_wave2 = imgmap['wave2.png'];
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
            
            eng_bottom.add_draw(0,function(ctx){
                ctx.drawImage(i_wave1,wave1_off,1440 - i_wave1.height);
                ctx.drawImage(i_wave1,wave1_off + i_wave1.width,1440 - i_wave1.height);
                ctx.drawImage(i_wave1,wave2_off,1440 - i_wave1.height);
                ctx.drawImage(i_wave1,wave2_off + i_wave1.width,1440 - i_wave1.height);
            });

            eng_bottom.add_work(_wave);
        }
        
        eng_bottom.add_work(_wave);
    }

    function play(){
        var defer = $.Deferred();

        var end = false;
        var i_marks = new Array();

        var timemap = new Array();
        var st = null;
        var curr = 0;
        var poslist = new Array();
        var note_score;
        var last_touch;

        var curr_combo = 0;
        var score = {
            'score':0,
            'perfect':0,
            'great':0,
            'good':0,
            'bad':0,
            'miss':0,
            'max_combo':0,
            'total_note':0
        };

        function _judge(time){
            var ret;

            time = Math.abs(time);

            if(time > 500){
                score.miss += 1;
                ret = 4;
            }else if(time > 200){
                score.bad += 1;
                score.score += note_score * 0.1;
                ret = 3;
            }else if(time > 100){
                score.good += 1;
                score.score += note_score * 0.4;
                ret = 2;
            }else if(time > 50){
                score.great += 1;
                score.score += note_score * 0.7;
                ret = 1;
            }else{
                score.perfect += 1;
                score.score += note_score;
                ret = 0;
            }

            if(ret <= 2){
                curr_combo += 1;
                score.max_combo = Math.max(score.max_combo,curr_combo);
            }else{
                curr_combo = 0;
            }

            return ret;
        }

        function _draw(ctx){
            var i;
            var j;
            var pos;
            var row;
            var col;
            var time;
            
            function __drawmark(ctx,x,y,time){
                var image = i_marks[Math.floor(time / 36.36364)];

                ctx.drawImage(image,x + 8,y + 8,304,304);
            }

            for(i = 0;i < poslist.length;i++){
                pos = poslist[i];

                time = (eng.ts - st) - pos.time; 
                if(time >= -509 && time < 291){
                    row = pos.pos[0];
                    col = pos.pos[1];
                    __drawmark(ctx,butts[row][col].x,butts[row][col].y,time + 509);
                }
            }
        }
        function _update(){
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

            if(curr == timemap.length){
                if((ct - timemap[curr - 1].time) > 3000){
                    end = true;
                    j_stage_bottom.css('background-color','transparent');
                    
                    result(score);

                    return;
                }
            }else{
                map = timemap[curr];
                if((ct + 509) >= map.time){
                    poss = map.pos;
                    for(i = 0;i < poss.length;i++){
                        poslist.push({'judge':-1,'time':map.time,'pos':poss[i]});
                    }

                    curr +=1;
                }
            }

            next_poslist = new Array();
            for(i = 0;i < poslist.length;i++){
                pos = poslist[i];
                time = ct - pos.time;
                if(time >= 500){
                    if(pos.judge == -1){
                        pos.judge = _judge(time);
                    }
                    continue;
                }

                row = pos.pos[0];
                col = pos.pos[1];

                if(param_auto == true){
                    if(time > - 40 && time < 0){
                        update_butt(row,col,true);
                    }else if(time > 40 && time < 100){
                        update_butt(row,col,false);
                    }
                }

                if(butts[row][col].touch == true && last_touch[row][col] == false){
                    pos.judge = _judge(time);
                }

                next_poslist.push(pos);
            }
            poslist = next_poslist;
            
            for(i = 0;i < 4;i++){
                for(j = 0;j < 4;j++){
                    last_touch[i][j] = butts[i][j].touch;
                }
            }

            eng.add_draw(10,_draw);
            eng.add_work(_update);
        }
        
        function _combo(){
            var last_combo = curr_combo;
            var ani_st = -1;
            var m_combo;

            function __draw(ctx){
                var m;
                var move = 0;

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
                ctx.fillText('combo',272 + 352 * 3 - 64 - m_combo.width,32 + 352 * 2 + 64);

                last_combo = curr_combo;
            }
            function __update(){
                if(end == true){
                    return;
                }
                if(curr_combo > 0 || ani_st != -1){
                    if(curr_combo != last_combo && ani_st == -1){
                        ani_st = eng.ts; 
                    }
                    eng.add_draw(0,__draw);
                }

                eng.add_work(__update);
            }
            
            ctx.font = '60px Saucer-Mono';
            m_combo = ctx.measureText('combo')

            eng.add_work(__update);
        }
        function _score(){
            var m_otua;
            var i_door = imgmap['door_blue.png'];

            function __draw(){
                var text;
                var m;

                if(end == true){
                    return;
                } 

                var ratio = score.max_combo / score.total_note;
                var move = eng.beat_ease(307,40,(eng.ts - st) % 307);
                var dw = 3840 * ratio + move;
                var dh = 2880 * ratio + move;

                ctx.drawImage(i_door,-dw / 2,-dh / 2,1920 + dw,1440 + dh);
                ctx.fillStyle='rgba(0,0,0,' + (0.9 - (0.7 * ratio)) + ')';
                ctx.fillRect(0,0,1920,1440);

                text = Math.ceil(score.score).toString();

                ctx.fillStyle = '#D9D9D9';
                ctx.font = '100px Saucer-Mono';
                m = ctx.measureText(text);
                ctx.fillText(text,272 + 352 * 3 - 64 - m.width,32 + 352 - 64);

                if(param_auto == true){
                    ctx.font = '60px Saucer-Mono';
                    ctx.fillText('Player: OTUA',272 + 352 * 3 - 64 - m_otua.width,32 + 352 * 3 + 64);
                }

                eng.add_draw(0,__draw);
            }

            ctx.font = '60px Saucer-Mono';
            m_otua = ctx.measureText('Player: OTUA');

            eng.add_draw(0,__draw);
        }

        /*
        expfunc.play_draw = function(ctx,x,y,time){
            var image = i_marks[Math.floor(time / 36.36364)];

            ctx.drawImage(image,x + 8,y + 8,304,304);
        };*/
        expfunc.play_draw = function(ctx,poslist,ct){
            var i;
            var pos;
            var row;
            var col;
            var time;
            
            function __drawmark(x,y,time){
                var image = i_marks[Math.floor(time / 36.36364)];

                ctx.drawImage(image,x + 8,y + 8,304,304);
            }

            for(i = 0;i < poslist.length;i++){
                pos = poslist[i];

                time = ct - pos.time; 
                if(time >= -509 && time < 327){
                    row = pos.pos[0];
                    col = pos.pos[1];
                    __drawmark(butts[row][col].x,butts[row][col].y,time + 509);
                }
            }
        }
        
        expfunc.test = function(){
            st = eng.ts;
            console.log(new Date().getTime());
            eng.add_work(_update);
            _combo();
            _score();
        };

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
            var total_note;

            var defers = new Array();

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
            ltime = 200;
            total_note = 0;
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

                                total_note += 1;
                            } 
                            map = map >> 1;
                        }
                    }

                    timemap.push({'time':time,'pos':pos});
                }

                lbeat = beat;
                ltime = time;
            }

            note_score = 900000 / total_note;
            score.total_note = total_note;

            if(timemap.length == 0){
                return;
            }

            last_touch = new Array(4);
            for(i = 0;i < 4;i++){
                last_touch[i] = new Array(4);
                for(j = 0;j < 4;j++){
                    last_touch[i][j] = butts[i][j].touch;
                }
            }

            j_stage_bottom.css('background-color','#1C1C1C');

            defers.push(load_audio('JOMANDA.ogg'));
            for(i = 0;i < 22;i++){
                defers.push(load_image('mark/mal_' + i + '.png'));
            }
            //defers.push(load_image('mark/clearmark.png'));

            $.when.apply($,defers).done(function(ab_song){
                var i;

                for(i = 0;i < 22;i++){
                    i_marks[i] = arguments[i + 1];
                }

                defer.resolve();

                //Start
                console.log(ab_song.sampleRate);
                console.log(ab_song.length);
                audio_play(ab_song);
            });
        });

        

        return defer.promise();
    }
    
    expfunc.result_draw = function(ctx,offx,offy,score){
        ctx.font = '150px Saucer-Regular';
        ctx.fillText('Result',offx,offy);

        ctx.font = '120px Saucer-Regular';
        ctx.fillText(score.score,offx,offy + 200);

        ctx.font = '100px Saucer-Regular';
        ctx.fillText('Perfect',offx,offy + 350);
        ctx.fillText(score.perfect,offx + 600,offy + 350);
        ctx.fillText('Great',offx,offy + 450);
        ctx.fillText(score.great,offx + 600,offy + 450);
        ctx.fillText('Good',offx,offy + 550);
        ctx.fillText(score.good,offx + 600,offy + 550);
        ctx.fillText('Bad',offx,offy + 650);
        ctx.fillText(score.bad,offx + 600,offy + 650);
        ctx.fillText('Miss',offx,offy + 750);
        ctx.fillText(score.miss,offx + 600,offy + 750);
        ctx.fillText('Max Combo',offx,offy + 900);
        ctx.fillText(score.max_combo,offx + 600,offy + 900);
    };

    function result(score){
        var offx = 272 + 352 + 32;
        var offy = 32 + 256;

        function _draw(ctx){
            if(score.max_combo == score.total_note){
                ctx.fillStyle = "#F9BF45";
                ctx.font = '130px Saucer-Regular';
                ctx.fillText('FULL COMBO',offx + 32,offy + 72);

                ctx.fillStyle = '#1C1C1C';
            }

            ctx.font = '150px Saucer-Regular';
            ctx.fillText('Result',offx,offy);

            ctx.font = '120px Saucer-Regular';
            ctx.fillText(score.score,offx,offy + 200);

            ctx.font = '100px Saucer-Regular';
            ctx.fillText('Perfect',offx,offy + 350);
            ctx.fillText(score.perfect,offx + 600,offy + 350);
            ctx.fillText('Great',offx,offy + 450);
            ctx.fillText(score.great,offx + 600,offy + 450);
            ctx.fillText('Good',offx,offy + 550);
            ctx.fillText(score.good,offx + 600,offy + 550);
            ctx.fillText('Bad',offx,offy + 650);
            ctx.fillText(score.bad,offx + 600,offy + 650);
            ctx.fillText('Miss',offx,offy + 750);
            ctx.fillText(score.miss,offx + 600,offy + 750);
            ctx.fillText('Max Combo',offx,offy + 900);
            ctx.fillText(score.max_combo,offx + 600,offy + 900);
        }
        function _update(){
            eng.add_draw(0,_draw);
            eng.add_work(_update);
        }

        score.score = Math.ceil(score.score);
        audio_play('result.ogg');

        eng.add_work(_update);
        back();
    }
    

   /* function test(){
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
            
        function _ani(){
            var et = new Date().getTime();
            j_fps.text(Math.floor(1 / (et - st) * 1000));
            st = et;

            window.requestAnimationFrame(_ani);

            eng_bottom.update();
            eng.update();
            eng_top.update();
        }

        

        
    }*/
};

var engine = function(ctx,expfunc){
    var that = this;
    var workq = new Array();
    var drawq = new Array();
    var st = null;
    //var worker = new Worker('/toj/sqmod/sqmod_test/js/worker.js');

    that.ts = new Date().getTime();

    /*worker.onmessage = function(e){
        var data = e.data;

        if(data.type == 0){
            console.log(data.data);
        }else if(data.type == 2){
            data.param[0] = ctx;
            drawq.push(data); 
        }else if(data.type == 3){
            expfunc[data.func].apply(null,data.param);
        }
    }*/

    that.add_work = function(work){
        workq.push({'work':work}); 
    }; 
    that.run_back = function(funcname){
        var i;
        var param = new Array();

        for(i = 1;i < arguments.length;i++){
            param.push(arguments[i]);
        }

        worker.postMessage({'type':1,'ts':that.ts,'func':funcname,'param':param});
    };
    that.add_draw = function(z,draw){
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

        //worker.postMessage({'type':0,'ts':that.ts});

        if(workq.length > 0){
            worktq = workq.slice(0);
            workq = new Array();
            for(i = 0;i < worktq.length;i++){
                worktq[i].work(); 
            }
        }

        if(drawq.length > 0){
            ctx.clearRect(0,0,1920,1440);

            drawtq = drawq.slice(0);
            drawq = new Array();
            drawtq.sort(function(a,b){
                return a.z - b.z;
            });
            for(i = 0;i < drawtq.length;i++){
                ctx.save();
                if(drawtq[i].func == undefined){
                    drawtq[i].draw(ctx);
                }else{
                    expfunc[drawtq[i].func].apply(null,drawtq[i].param);
                }
                ctx.restore();
            }
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
