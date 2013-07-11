'use strict'

var sqmod_test = function(sqid,sq_node){
    var that = this;
    var index_node = new vus.node('index');
    var j_index_page = $('#index_page');
    var callpath = 'sq/' + sqid + '/';

    function update_result(name,song,score,maxcombo){
        com.call_backend(callpath,'update_result',function(result){
            if(com.is_callerr(result)){
                index.add_alert('','錯誤','資料存取發生錯誤');
            }else{
                index.add_alert('alert-success','成功','記錄已送出');
            }
        },name,song,score,maxcombo);
    }

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
        var j_jurank;

        function _update(){
            com.call_backend(callpath,'list_jurank',function(result){
                var i;
                var data = result.data;
                var ranko;
                var j_item;

                if(com.is_callerr(result)){
                    index.add_alert('','錯誤','資料存取發生錯誤');
                }else{
                    j_jurank.empty();
                    for(i=0;i<data.length;i++){
                        ranko = data[i];        
                        
                        j_item = $('<tr><td class="rank"></td><td class="name"></td><td class="song"></td><td class="score"></td><td class="maxcombo"></td></tr>')
                        j_item.find('td.rank').text(i + 1);
                        j_item.find('td.name').text(ranko.name);
                        j_item.find('td.song').text(ranko.song);
                        j_item.find('td.score').text(ranko.score);
                        j_item.find('td.maxcombo').text(ranko.maxcombo);

                        j_jurank.append(j_item);
                    } 
                }
            });
        }

        if(direct == 'in'){
            imc.Proxy.instance.register_call(callpath,'update_jurank',function(callback){
                _update(); 
                callback('Success');
            });

            com.loadpage('/toj/sqmod/sqmod_test/html/index.html','/toj/sqmod/sqmod_test/css/index.css').done(function(){
                j_jurank = j_index_page.find('table.jurank > tbody');

                _update(); 
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

    var player_name;
    var curr_mode = 'pro';
    var back_running = false;

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
    function audio_play(buffer,onstart){
        var src = audio_ctx.createBufferSource();
        var proc = audio_ctx.createScriptProcessor(256,1,1);

        if(typeof(buffer) == 'string'){
            buffer = audiomap[buffer];
        }

        if(curr_src != null){
            curr_src.stop(0);
        }

        src.buffer = buffer;
        src.connect(proc);

        proc.onaudioprocess = function(e){
            src.disconnect(0);
            src.connect(g_out);
            proc.disconnect(0);

            console.log(new Date().getTime());
            if(onstart != undefined){
                onstart();
            }
        }
        proc.connect(g_out);

        curr_src = src;
        src.start(0);
    }
    function audio_stop(){
        if(curr_src != null){
            curr_src.stop(0);
        }
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
            }else if(chr == 'A' && curr_mode == 'play'){
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

                    update_butt(row,col,true,false);
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

        eng_bottom = new engine(ctx_bottom);
        eng = new engine(ctx);
        eng_top = new engine(ctx_top);

        ctx.fillStyle = '#1C1C1C';
        ctx.font = '100px Saucer-Regular';
        ctx.fillText('LOADING...',272 + 352 + 32,272 + 353 + 32);

        $.when(preload()).done(function(){
            update_top();

            window.requestAnimationFrame(_update);

            pro();
        });

        while(true){
            player_name = prompt('Your player name','Foo');
            if(player_name != ''){
                break;
            }
        }
    }

    function preload(){
        return $.when(
            load_image('door_blue.png'),
            load_image('startmark.png'),
            load_image('wave1.png'),
            load_image('wave2.png'),
            load_image('top.png'),
            load_image('light.png'),
            load_audio('select.ogg'),
            load_audio('result.ogg'),
            load_audio('select.ogg')
        ); 
    }
    
    function update_butt(row,col,touch,click){
        if(butts[row][col].touch != touch){
            if(click != false){
                j_butts[row][col].click();
            }

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
            if(curr_mode == 'play'){
                back_running = false;
                return;
            }

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
        
        if(back_running == false){
            back_running = true;
            eng_bottom.add_work(_wave);
        }
    }

    function play(song){
        var defer = $.Deferred();

        var end = false;
        var i_marks = new Array();
        var i_perfects = new Array();
        var i_greats = new Array();
        var i_goods = new Array();
        var i_bads = new Array();

        var timemap = new Array();
        var st = null;
        var curr = 0;
        var poslist = new Array();
        var note_score;
        var last_touch;

        var curr_tpb;
        var curr_combo = 0;
        var score = {
            'score':0,
            'door_note':0,
            'perfect':0,
            'great':0,
            'good':0,
            'bad':0,
            'miss':0,
            'max_combo':0,
            'total_note':0,
            'auto':false
        };

        function _judge(time){
            var ret;

            time = Math.abs(time);

            if(time > 425){
                score.miss += 1;
                score.door_note -= 8;
                ret = 4;
            }else if(time > 170){
                score.bad += 1;
                score.score += note_score * 0.1;
                score.door_note -= 8;
                ret = 3;
            }else if(time > 85){
                score.good += 1;
                score.score += note_score * 0.4;
                score.door_note += 1;
                ret = 2;
            }else if(time > 42){
                score.great += 1;
                score.score += note_score * 0.7;
                score.door_note += 2;
                ret = 1;
            }else{
                score.perfect += 1;
                score.score += note_score;
                score.door_note += 2;
                ret = 0;
            }

            score.door_note = Math.min(Math.max(0,score.door_note),score.total_note);

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
            
            function __drawmark(ctx,x,y,time,judge,judge_time){
                var off;
                    
                if(time < 800){
                    ctx.drawImage(i_marks[Math.floor(time / 36.36364)],x,y,320,320);
                }
                if(judge != -1){
                    off = eng.ts - judge_time;

                    if(judge == 0 && off < 225){
                        ctx.drawImage(i_perfects[Math.floor(off / 15)],x,y,320,320);
                    }else if(judge == 1 && off < 225){
                        ctx.drawImage(i_greats[Math.floor(off / 15)],x,y,320,320);
                    }else if(judge == 2 && off < 210){
                        ctx.drawImage(i_goods[Math.floor(off / 15)],x,y,320,320);
                    }else if(judge == 3 && off < 195){
                        ctx.drawImage(i_bads[Math.floor(off / 15)],x,y,320,320);
                    }
                }
            }

            for(i = 0;i < poslist.length;i++){
                pos = poslist[i];

                time = (eng.ts - st) - pos.time; 
                if(time >= -509 && time < 620){
                    row = pos.pos[0];
                    col = pos.pos[1];
                    __drawmark(ctx,butts[row][col].x,butts[row][col].y,time + 509,pos.judge,pos.judge_time);
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
                    
                    eng.add_work(function(){
                        result(song,score);
                    });
                    return;
                }
            }else{
                map = timemap[curr];
                if((ct + 509) >= map.time){
                    poss = map.pos;
                    for(i = 0;i < poss.length;i++){
                        poslist.push({'judge':-1,'judge_time':-1,'time':map.time,'pos':poss[i]});
                    }

                    if(map.tpb != undefined){
                        curr_tpb = map.tpb;
                    }

                    curr +=1;
                }
            }

            next_poslist = new Array();
            for(i = 0;i < poslist.length;i++){
                pos = poslist[i];
                time = ct - pos.time;
                if(time > 500){
                    if(pos.judge == -1){
                        pos.judge = _judge(time);
                        pos.judge_time = eng.ts;
                    }
                    continue;
                }

                row = pos.pos[0];
                col = pos.pos[1];

                if(param_auto == true){
                    score.auto = true;

                    if(butts[row][col].touch == false && time > -40 && time < 0){
                        update_butt(row,col,true);
                    }else if(time > 40 && time < 100){
                        update_butt(row,col,false);
                    }
                }

                if(pos.judge == -1 && butts[row][col].touch == true && last_touch[row][col] == false){
                    pos.judge = _judge(time);
                    pos.judge_time = eng.ts;
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
        
        function _prepare(){
            var defer = $.Deferred();
            var i_startmark = imgmap['startmark.png'];
            var poss = timemap[0].pos;
            
            function __draw(ctx){
                var i;
                var pos;
                var row;
                var col;
                
                if((eng.ts - st) >= 5000){
                    defer.resolve();
                    return;
                }
                
                for(i = 0;i < poss.length;i++){
                    pos = poss[i];
                    row = pos[0];
                    col = pos[1];

                    ctx.drawImage(i_startmark,butts[row][col].x + 35,butts[row][col].y + 35,250,250);
                }
                
                eng.add_draw(0,__draw);
            }

            eng.add_draw(0,__draw);

            return defer.promise();
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
            }
            function __update(){
                if(end == true){
                    return;
                }
                if(curr_combo > 0 || ani_st != -1){
                    if(curr_combo != last_combo && ani_st == -1){
                        ani_st = eng.ts; 
                    }
                    eng.add_draw(5,__draw);
                }
                last_combo = curr_combo;

                eng.add_work(__update);
            }
            
            ctx.font = '60px Saucer-Mono';
            m_combo = ctx.measureText('combo')

            eng.add_work(__update);
        }
        function _score(){
            var m_player;
            var m_otua;

            function __draw(){
                var text;
                var m;

                if(end == true){
                    return;
                } 

                text = Math.ceil(score.score).toString();

                ctx.fillStyle = '#D9D9D9';
                ctx.font = '100px Saucer-Mono';
                m = ctx.measureText(text);
                ctx.fillText(text,272 + 352 * 3 - 64 - m.width,32 + 352 - 64);

                ctx.font = '60px Saucer-Mono';
                if(param_auto == false){
                    text = 'Player: ' + player_name;
                    m = m_player;
                }else{
                    text = 'Player: OTUA';
                    m = m_otua;
                }
                ctx.fillText(text,272 + 352 * 3 - 64 - m.width,32 + 352 * 3 + 64);

                eng.add_draw(5,__draw);
            }

            ctx.fillStyle = '#D9D9D9';
            ctx.font = '60px Saucer-Mono';
            m_player = ctx.measureText('Player: ' + player_name);
            m_otua = ctx.measureText('Player: OTUA');

            eng.add_draw(5,__draw);
        }
        function _door(){
            var i_door = imgmap['door_blue.png'];

            function __draw(ctx){
                var ratio = score.door_note / score.total_note;
                var move = eng.beat_ease(curr_tpb,40,(eng.ts - st) % curr_tpb);
                var dw = 3840 * ratio + move;
                var dh = 2880 * ratio + move;
                
                if(end == true){
                    return;
                }
                
                ctx.drawImage(i_door,-dw / 2,-dh / 2,1920 + dw,1440 + dh);
                ctx.fillStyle='rgba(0,0,0,' + (0.9 - (0.5 * ratio)) + ')';
                ctx.fillRect(0,0,1920,1440);
                
                eng.add_draw(0,__draw);
            } 

            eng.add_draw(0,__draw);
        }

        curr_mode = 'play';

        $.get('/toj/sqmod/sqmod_test/html/song/' + song + '/' + song + '.ju',function(data){
            var i;
            var j;
            var k;
            var lines;
            var line;
            var parts;

            var delay;
            var lpb;
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

            //Load param
            delay = 0;
            for(i = 0;i < lines.length;i++){
                line = lines[i];
                if(line.charAt(0) == 'd'){
                    delay = parseInt(line.split('=')[1]);
                }else if(line == '#start#'){
                    i++;
                    break;
                }
            }

            //Read beatmap
            lpb = 0;
            tpb = 0;
            lbeat = 0;
            ltime = delay + 5000;
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
                    if(lpb != tpb){
                        timemap[timemap.length - 1].tpb = tpb;
                        lpb = tpb;
                    }
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

            defers.push(load_audio('song/' + song + '/' + song + '.ogg'));
            for(i = 0;i < 22;i++){
                defers.push(load_image('mark/mal_' + i + '.png'));
            }
            for(i = 0;i < 15;i++){
                defers.push(load_image('mark/fect_' + i + '.png'));
            }
            for(i = 0;i < 15;i++){
                defers.push(load_image('mark/at_' + i + '.png'));
            }
            for(i = 0;i < 14;i++){
                defers.push(load_image('mark/d_' + i + '.png'));
            }
            for(i = 0;i < 13;i++){
                defers.push(load_image('mark/_' + i + '.png'));
            }

            $.when.apply($,defers).done(function(ab_song){
                var i;
                var j;

                j = 1;
                for(i = 0;i < 22;i++,j++){
                    i_marks[i] = arguments[j];
                }
                for(i = 0;i < 15;i++,j++){
                    i_perfects[i] = arguments[j];
                }
                for(i = 0;i < 15;i++,j++){
                    i_greats[i] = arguments[j];
                }
                for(i = 0;i < 14;i++,j++){
                    i_goods[i] = arguments[j];
                }
                for(i = 0;i < 13;i++,j++){
                    i_bads[i] = arguments[j];
                }

                defer.resolve();

                //Start
                param_auto = false;
                curr_tpb = timemap[0].tpb;

                st = eng.ts;
                _door();
                _combo();
                _score();
                _prepare().done(function(){
                    audio_play(ab_song,function(){
                        console.log(eng.ts);
                        eng.add_work(_update);
                    });
                });
            });
        });

        return defer.promise();
    }
    
    function result(song,score){
        var st;
        var ori_score;
        var show_score;
        var offx = 272 + 352 + 32;
        var offy = 32 + 256;

        function _draw(ctx){
            var ct = eng.ts - st;

            if(score.max_combo == score.total_note){
                ctx.fillStyle = "#F9BF45";
                ctx.font = '130px Saucer-Regular';
                ctx.fillText('FULL COMBO',offx + 32,offy + 56);

                ctx.fillStyle = '#1C1C1C';
            }

            ctx.font = '150px Saucer-Regular';
            ctx.fillText('Result',offx,offy);

            ctx.font = '120px Saucer-Mono';
            ctx.fillText(show_score,offx,offy + 200);

            ctx.font = '100px Saucer-Regular';
            ctx.fillText('Perfect',offx,offy + 350);
            ctx.fillText(score.perfect,offx + 700,offy + 350);
            ctx.fillText('Great',offx,offy + 450);
            ctx.fillText(score.great,offx + 700,offy + 450);
            ctx.fillText('Good',offx,offy + 550);
            ctx.fillText(score.good,offx + 700,offy + 550);
            ctx.fillText('Bad',offx,offy + 650);
            ctx.fillText(score.bad,offx + 700,offy + 650);
            ctx.fillText('Miss',offx,offy + 750);
            ctx.fillText(score.miss,offx + 700,offy + 750);
            ctx.fillText('Max Combo',offx,offy + 900);
            ctx.fillText(score.max_combo,offx + 700,offy + 900);

            ctx.fillStyle = '#1C1C1C';
            ctx.font = '60px Saucer-Regular';
            ctx.fillText('BACK',1360,1344);

            if(ct < 1000){
                eng.add_draw(0,_draw);
            }else if(show_score < score.score){
                show_score = Math.min(score.score,ori_score + (ct - 1000) * 20); 
                eng.add_draw(0,_draw);
            }
        }

        curr_mode = 'result';

        st = eng.ts;
        ori_score = Math.ceil(score.score);
        show_score = ori_score;
        score.score += 100000 * score.door_note / score.total_note;
        score.score = Math.ceil(score.score);
        audio_play('result.ogg');

        if(score.auto == false){
            update_result(player_name,song,score.score,score.max_combo);
        }

        j_butts[3][3].on('click',function(e){
            j_butts[3][3].off('click');

            eng.add_work(function(){
                pro();
            });
        });

        eng.add_draw(0,_draw);
        back();
    }
    
    function pro(){
        var defers = [];
        var curr_song = null;
        var start_cd = null;
        var end = false;

        function _draw(ctx){
            var title;
            var timer;

            function __draw_pro(i,j,title,cover){
                var x,y;

                x = butts[i][j].x;
                y = butts[i][j].y;

                if(cover != undefined){
                    ctx.drawImage(cover,x,y,320,320); 
                }else{
                    ctx.fillStyle = '#1C1C1C';
                    ctx.font = '40px Saucer-Bold';
                    ctx.fillText(title,x + 32,y + 290);
                }
            }
            
            if(end == true){
                return;
            }
            
            __draw_pro(0,0,'A+B Problem');
            __draw_pro(0,1,'JOMANDA',imgmap['song/JOMANDA/JOMANDA.jpg']);
            __draw_pro(0,2,'JOMANDA',imgmap['song/SHION/SHION.jpg']);

            ctx.fillStyle = '#1C1C1C';
            ctx.font = '60px Saucer-Regular';
            if(curr_song != null){
                if(start_cd == null){
                    start_cd = eng.ts;
                }

                timer = 60 - ((eng.ts - start_cd) / 1000);
                if(timer <= 0){
                    _start();
                }
                
                ctx.fillText('BACK',1002,1344);
                ctx.fillText('START',1360,1344);

                ctx.font = '48px Saucer-Regular';
                ctx.fillText(new Number(timer).toFixed(2),1360,1244);

                title = curr_song;
            }else{
                ctx.fillText('PREV',1002,1344);
                ctx.fillText('NEXT',1360,1344);

                title = 'SELECT  PROBLEM';
            }

            ctx.rotate(Math.PI / 2);
            ctx.font = '100px Saucer-Regular';
            ctx.fillText(title,32,-100);

            eng.add_draw(0,_draw);
        }
        function _start(){
            var i;
            var j;

            if(curr_song == null){
                return;
            }

            end = true;
            audio_stop();

            for(i = 0;i < 4;i++){
                for(j = 0;j < 4;j++){
                    j_butts[i][j].off('click');
                }
            }

            eng.add_work(function(){
                play(curr_song);
            });
        }
        
        curr_mode = 'pro';

        defers.push(load_audio('song/JOMANDA/JOMANDA.ogg'));
        defers.push(load_audio('song/SHION/SHION.ogg'));
        defers.push(load_image('song/JOMANDA/JOMANDA.jpg'));
        defers.push(load_image('song/SHION/SHION.jpg'));

        $.when.apply($,defers).done(function(){
            j_butts[0][1].on('click',function(e){
                load_audio('song/JOMANDA/JOMANDA.ogg').done(function(ab_song){
                    audio_play(ab_song);
                });
                curr_song = 'JOMANDA';
            });
            j_butts[0][2].on('click',function(e){
                load_audio('song/SHION/SHION.ogg').done(function(ab_song){
                    audio_play(ab_song);
                });
                curr_song = 'SHION';
            });

            j_butts[3][2].on('click',function(e){
                if(curr_song != null){
                    audio_play('select.ogg');
                    start_cd = null;
                    curr_song = null;
                }
            });
            j_butts[3][3].on('click',function(e){
                _start(); 
            });

            audio_play('select.ogg');
            eng.add_draw(0,_draw);
            back();
        });
    }
};

var engine = function(ctx){
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
        
        var tmp = new Date().getTime();

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
                drawtq[i].draw(ctx);
                ctx.restore();
            }
        }

        tmp = new Date().getTime() - tmp;
        if(tmp > 15){
            console.log('time' + tmp);
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
