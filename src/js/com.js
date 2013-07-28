'use strict'

var ACCESSID_SQUAREMG = 4; 
var ACCESSID_PROBLEMMG = 6; 

var ACCESS_READ = 0x1;
var ACCESS_WRITE = 0x2;
var ACCESS_CREATE = 0x4;
var ACCESS_DELETE = 0x8;
var ACCESS_SETPER = 0x10;
var ACCESS_EXECUTE = 0x20;

var WebSocketConnection = function(link,ws,file_addr){
    var that = this;
    var sendfile_filekeymap = {};

    that.__super__(link);

    that.send_msg = function(data){
        ws.send(new Blob([data],{'type':'application/octet-stream'}))
    };
    that.send_file = function(filekey,blob,callback){
        var i;
        var file_ws = new Array(4);
        var filesize = blob.size;
        var partsize = Math.ceil(filesize / 4);
        var count = 0;

        function _callback(err){
            if(!(filekey in sendfile_filekeymap)){
                return;
            }

            delete sendfile_filekeymap[filekey];

            for(i = 0;i < 4;i++){
                if(file_ws[i] != undefined){
                    file_ws[i].close();
                }
            }

            callback(err);
        }

        for(i = 0;i < 4;i++){
            file_ws[i] = new WebSocket('ws://' + file_addr + '/conn');
            file_ws[i].onopen = function(idx){return function(){
                var ws = file_ws[idx];
                var off = idx * partsize;
                var end = Math.min(filesize,off + partsize);

                ws.onmessage = function(e){
                    if(off >= end){
                        count += 1;
                        if(count == 4){
                            _callback();
                        }
                    }else{
                        ws.send(blob.slice(off,Math.min(end,off + 524288),
                                           'application/octet-stream'));
                        off += 524288;
                    }
                };

                console.log('file open ' + off);

                ws.send(JSON.stringify({
                    'conntype':'file',
                    'filekey':filekey
                }));

                ws.send(new Blob([JSON.stringify({'off':off})],
                             {'type':'application/octet-stream'}));
            }}(i);       
        }
    };
    that.abort_file = function(filekey,err){
        if(filekey in sendfile_filekeymap){
            sendfile_filekeymap[filekey]('Eabort');
        }
    };
    that.start_recv = function(recv_callback){
        ws.onmessage = function(e){
            var reader = new FileReader;
            
            reader.onload = function(e){
                recv_callback(that,e.target.result);
            };
            reader.readAsText(e.data);
        }
    };

    ws.onclose = function(e){
        console.log('close');
        that.close();
    };
};__extend__(WebSocketConnection,imc.Connection);

var vus = new function(){
    var that = this;

    that.node = function(name){
        var that = this;
        that.name = name;
        that.parent = null;
        that.ref_count = 1;
        that.child = new Object;
        that.delay_child = new Object;

        that.url_chg = function(direct,url_upart,url_dpart){
            return 'cont';
        };
        that.get = function(){
            that.ref_count++;
        };
        that.child_set = function(node){
            var delay_obj;

            node.parent = that;
            that.child[node.name] = node;

            if(node.name in that.delay_child){
                delay_obj = that.delay_child[node.name];
                delete that.delay_child[node.name]; 
                delay_obj.defer.resolve();
            }
        };
        that.child_delayset = function(name){
            that.delay_child[name] = {
                'defer':$.Deferred()
            };
        };
        that.child_del = function(node){
            node.parent = null;
            delete that.child[node.name];
        };
        that.lookup = function(url,close_flag){
            var i;
            var url_part;
            var node_curr;
            var node_prev;

            url_part = url.match(/\/toj\/(.*)/)[1].split('/');
            url_part.pop();
            node_prev = null;
            node_curr = that;
            for(i = 0;i < url_part.length;i++){
                node_prev = node_curr;
                if((node_curr = node_curr.child[url_part[i]]) == undefined){
                    if(close_flag == true){
                        return node_prev;
                    }else{
                        return null;
                    }
                }
            }
            return node_curr;
        }
    };
};

var com = new function(){
    var that = this;
    var urlchg_reen = false;
    var urlchg_hasnext = false;
    var check_mbox_url = function(url){
        if(url.search(/toj\/m\/.*/) != -1){
            return true;
        }else{
            return false;
        }
    }

    that.url_curr = null;
    that.url_prev = null;
    that.url_back = null;
    that.url_pbox = null;

    that.link = null;
    that.backend_link = null;
    that.conn_callback = $.Callbacks();

    that.ready = function(){
        var i;
        var url;
        var urlpart;

        function _update_check(j_e,checked){
            var i;
            var label;
            var spans;
            var j_span;

            if(checked == false){
                j_e.empty();
                j_e.attr('checked',null);
            }else{
                j_e.append($('<i class="icon-ok"></i>'));
                j_e.attr('checked','checked');
            }

            if((label = j_e.attr('data-all')) != undefined){
                spans = $.find('span.check[data-label="' + label + '"]');
                for(i = 0;i < spans.length;i++){
                    $(spans[i]).check(checked)
                }
            }
        }

        that.vus_root = new vus.node(null);
        that.vus_mbox = new vus.node('m');

        that.vus_mbox.url_chg = function(direct,url_upart,url_dpart){
            if(direct == 'in'){
                index.mask_show();
            }else if(direct == 'out'){
                index.mask_hide();
            }

            return 'cont';
        };
        that.vus_root.child_set(that.vus_mbox);

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

        $(document).on('click','a',function(e){
            that.url_push($(this).attr('href'));   
            return false;
        });
        $(document).on('click','span.check',function(e){
            var j_e = $(e.target);

            if(!j_e.is('span.check')){
                j_e = j_e.parent('span.check');
            }
            _update_check(j_e,!j_e.check());

            return false;
        });

        $.fn.check = function(checked){
            if(checked != undefined){
                _update_check(this,checked);
            }

            if(this.attr('checked') == 'checked'){
                return true;
            }else{
                return false;
            }
        };
        $.fn.tagbox = function(option){
            var tagbox = this.data('tagbox');

            if(option != undefined){
                tagbox = that.create_tagbox(this,option.words,option.restrict,option.duplicate); 
            }

            return tagbox;
        };
        $.fn.codebox = function(option){
            var codebox = this.data('codebox');

            if(option != undefined){
                codebox = that.create_codebox(this,option.mode,option.readonly);
            } 

            return codebox;
        };
    };

    that.url_push = function(url){
        if(url == location.href){
            return;
        }

        that.url_prev = location.href;
        that.url_back = that.url_prev;
        window.history.pushState(null,document.title,url);   
        that.url_chg();
    };
    that.url_push_back = function(block_regexp){
        console.log(that.url_back);

        if(that.url_back == null || (block_regexp != undefined && that.url_back.search(block_regexp) != -1)){
            that.url_push('/toj/home/');
        }else{
            that.url_push(that.url_back);
        }
    };
    that.url_update = function(url){
        if(url == location.href){
            return;
        }

        that.url_prev = location.href;
        window.history.replaceState(null,document.title,url);   
        that.url_chg();
    };
    that.url_pull_pbox = function(){
        that.url_update(that.url_pbox);
    };
    that.url_chg = function(){
        var i;
        var ret;
        var part;
        var stop_flag;

        var url_old;
        var url_new;
        var url_cpart;	
        var param_cpart;
        var url_ppart;
        var param_ppart;
        var is_mbox_old;
        var is_mbox_new;

        var part;
        var node_name;
        var node_param;
        var url_upart;
        var url_dpart;
        var node_curr;
        var node_parent;
        var node_bottom;

        var _chg_out = function(url_ppart,param_ppart,url_cpart){
            var i;
            var len;

            var node_name;
            var url_upart;
            var url_dpart;
            var node_curr;
            var node_parent;
            var node_bottom;

            len = Math.min(url_ppart.length,url_cpart.length);    
            node_bottom = that.vus_root;
            node_curr = node_bottom;
            for(i = 0;i < len;i++){
                if(url_ppart[i] != url_cpart[i]){
                    break;
                }

                node_name = url_ppart[i];
                if((node_curr = node_curr.child[node_name]) == undefined){
                    break;
                }
                node_bottom = node_curr;
            }
            if(node_curr != undefined){
                for(;i < url_ppart.length;i++){
                    node_name = url_ppart[i];
                    if(node_curr.child[node_name] == undefined){
                        break;
                    }
                    node_curr = node_curr.child[node_name];
                }

                i--;
                url_upart = url_ppart.slice(0);
                url_dpart = new Array;
                while(node_curr && node_curr != node_bottom){
                    node_parent = node_curr.parent;
                    node_curr.url_chg('out',url_upart,url_dpart,param_ppart[i]);

                    url_dpart = url_dpart.splice(0,0,url_upart.pop());
                    node_curr = node_parent;
                    i--;
                }
            }

            return node_bottom;
        };
        var _chg_in = function(url_cpart,param_cpart,idx,node_curr,url_upart,url_dpart){
            var node_name;
            var node_param;
            var node_parent;
            var delay_obj;

            for(;idx < url_cpart.length;idx++){
                node_parent = node_curr;

                node_name = url_cpart[idx];
                node_param = param_cpart[idx];

                if((node_curr = node_parent.child[node_name]) == undefined){
                    if((delay_obj = node_parent.delay_child[node_name]) == undefined){
                        that.url_update('/toj/none/');
                    }else{
                        delay_obj.url_curr = url_new; 
                        delay_obj.defer.done(function(){
                            if(url_new == delay_obj.url_curr){
                                _chg_in(url_cpart,param_cpart,idx,node_parent,url_upart,url_dpart);
                            }
                        });
                    }
                    break;
                }
                url_upart.push(url_dpart.shift());

                ret = node_curr.url_chg('in',url_upart,url_dpart,node_param);
                if(ret == 'stop'){
                    break;
                }
            }
        };

        that.url_curr = location.href;
        console.log(that.url_curr);

        if(urlchg_reen == true){
            urlchg_hasnext = true;
            return;
        }else{
            urlchg_reen = true;
            urlchg_hasnext = true;
        }

        while(urlchg_hasnext){
            urlchg_hasnext = false;

            url_old = that.url_prev;
            url_new = that.url_curr;

            url_cpart = url_new.match(/toj\/(.*)/)[1].split('/');
            url_cpart.pop();
            if(url_cpart.length == 0){
                that.url_update('/toj/home/');
                continue;
            }

            param_cpart = new Array;
            for(i = 0;i < url_cpart.length;i++){
                part = url_cpart[i].split(':');
                url_cpart[i] = part[0];
                if(part.length > 1){
                    part.splice(0,1);
                    param_cpart.push(part);
                }else{
                    param_cpart.push(null);
                }
            }

            if(url_old == null){
                is_mbox_old = false;
            }else{
                is_mbox_old = check_mbox_url(url_old);
            }
            is_mbox_new = check_mbox_url(url_new);

            if(url_old == null || (is_mbox_old == false && is_mbox_new == true)){
                node_bottom = that.vus_root;
            }else if(that.url_pbox != null && is_mbox_old == true && is_mbox_new == false){
                url_ppart = that.url_pbox.match(/toj\/(.*)/)[1].split('/');
                url_ppart.pop();

                param_ppart = new Array;
                for(i = 0;i < url_ppart.length;i++){
                    part = url_ppart[i].split(':');
                    url_ppart[i] = part[0];
                    if(part.length > 1){
                        part.splice(0,1);
                        param_ppart.push(part);
                    }else{
                        param_ppart.push(null);
                    }
                }

                node_bottom = _chg_out(url_ppart,param_ppart,url_cpart);	
            }else{
                url_ppart = url_old.match(/toj\/(.*)/)[1].split('/');
                url_ppart.pop();

                param_ppart = new Array;
                for(i = 0;i < url_ppart.length;i++){
                    part = url_ppart[i].split(':');
                    url_ppart[i] = part[0];
                    if(part.length > 1){
                        part.splice(0,1);
                        param_ppart.push(part);
                    }else{
                        param_ppart.push(null);
                    }
                }

                node_bottom = _chg_out(url_ppart,param_ppart,url_cpart);	
            }

            if(url_new != that.url_pbox){
                i = 0;
                node_curr = that.vus_root;
                url_upart = new Array;
                url_dpart = url_cpart.slice(0);
                stop_flag = false;
                while(node_curr != node_bottom){
                    node_name = url_cpart[i];
                    node_param = param_cpart[i];

                    if((node_curr = node_curr.child[node_name]) == undefined){
                        break;
                    }
                    url_upart.push(url_dpart.shift());
                    ret = node_curr.url_chg('same',url_upart,url_dpart,node_param);
                    if(ret == 'stop'){
                        stop_flag = true;
                        break;
                    }
                    i++;
                }
                if(stop_flag == false){
                    _chg_in(url_cpart,param_cpart,i,node_curr,url_upart,url_dpart);	
                }
            }

            if(that.url_pbox != null && is_mbox_old == true && is_mbox_new == false){
                url_ppart = url_old.match(/toj\/(.*)/)[1].split('/');
                url_ppart.pop();
                _chg_out(url_ppart,param_ppart,url_cpart);
            }

            if(is_mbox_new == false){
                if(that.url_pbox == null){
                    $('#index_mask').removeClass('index_mask_nopbox');
                    $('#index_mask').addClass('index_mask');
                }
                that.url_pbox = url_new;
            }
        }

        urlchg_reen = false;
    };

    that.loadpage = function(html_url,css_url){
        var j_index_page = $('#index_page');
        var j_css;
        var defer = $.Deferred();

        function loadhtml(){
            $.get(html_url,function(data){
                j_index_page.append($(data));
                that.exheight();
                defer.resolve();
            });
        }

        j_index_page.empty();

        if(css_url != undefined){
            j_css = $('<link rel="stylesheet">');
            j_css.attr('href',css_url);
            j_css.ready(function(){
                loadhtml();
            });
            j_index_page.append(j_css);
        }else{
            loadhtml();
        }
        
        return defer.promise();
    };
    that.exheight = function(){
        var i;
        var j_e;
        var winheight = $(window).innerHeight();
        var exratio;
        var extop;
        var exbottom;

        function ex(es,attr){
            for(i = 0;i < es.length;i++){
                j_e = $(es[i]);

                if((exratio = j_e.attr('exratio')) != undefined){
                    exratio = parseInt(exratio.match('(.*)%')[1]) / 100;
                    j_e.height(winheight * exratio);
                }else{
                    if((extop = j_e.attr('extop')) == undefined){
                        extop = j_e.css('top');
                    }
                    if((exbottom = j_e.attr('exbottom')) == undefined){
                        exbottom = '0px';
                    }

                    extop = extop.match('(.*)px')[1];
                    exbottom = exbottom.match('(.*)px')[1];
                    j_e.css(attr,(winheight - extop - exbottom));
                }
            }
        }

        ex($('[exheight="true"]'),'height');
        ex($('[exminheight="true"]'),'min-height');

        $('.modal-body').css('max-height',(winheight * 0.9 - 192) + 'px');
    };
    that.get_cookie = function(){
        var ret;
        var i;
        var part;
        var subpart;

        ret = new Object();
        part = document.cookie.split(';');
        if(part.length == 0){
            return null;
        }
        for(i = 0;i < part.length;i++){
            part[i] = part[i].replace(' ','').replace(/\+/g,' ');
            subpart = part[i].split('=');
            ret[decodeURIComponent(subpart[0])] = decodeURIComponent(subpart[1]);
        }

        return ret;
    };
    that.get_timestring = function(data,sec){
        var date;
        var ret;
        var hr;
        var min;
        var sec;

        function fix(num){
            if(num < 10){
                return '0' + num;
            }
            return num;
        }

        if(typeof(data) == 'string'){
            date = new Date(data);
        }else{
            date = data;
        }

        ret =  date.getFullYear() + '/' + fix(date.getMonth() + 1) + '/' + fix(date.getDate()) + ' ' + 
            fix(date.getHours()) + ':' + fix(date.getMinutes());

        if(sec == true){
            ret += ':' + fix(date.getSeconds());
        }

        return ret;
    };
    that.get_defaultimg = function(hash){
        return 'http://www.gravatar.com/avatar/' + hash + '?f=y&d=identicon&s=256';
    };
    that.check_access = function(accessid,permission){
        if((user.authmap[accessid].permission & permission) == permission){
            return true;
        }else{
            return false;
        }
    };
    that.create_codebox = function(j_div,mode,readonly){
        var codebox;
        
        if(readonly != true){
            readonly = false;
        }

        j_div.empty();

        codebox = CodeMirror(j_div[0],{
            'mode':mode,
            'theme':'lesser-dark',
            'lineNumbers':true,
            'matchBrackets':true,
            'indentUnit':4,
            'readOnly':readonly
        });

        codebox.getWrapperElement().style.width = '100%';
        codebox.getWrapperElement().style.height = '100%';
        codebox.getScrollerElement().style.width = '100%';
        codebox.getScrollerElement().style.height = '100%';

        j_div.data('codebox',codebox);

        return codebox;
    };
    that.create_pagination = function(j_div,start,end,curr,step){
        var i;
        var j_ul;
        var j_li;
        var off;
        var offs = new Array;

        start = Math.floor(start / step);
        end = Math.floor(Math.max(0,(end - 1)) / step);
        curr = Math.floor(curr / step);

        j_div.empty();

        j_div.addClass('pagination');
        j_div.append('<ul></ul>');
        j_ul = j_div.find('ul')

        j_li = $('<li class="prev"><a href="">←</a></li>');
        if(curr == 0){
            j_li.find('a').on('click',function(e){
                return false
            });

            j_li.addClass('disabled');
            off = curr * step;
        }else{
            off = (curr - 1) * step;
        }
        offs.push(off);
        j_li.data('off',off);
        j_ul.append(j_li);
        
        for(i = start;i <= end;i++){
            j_li = $('<li><a href=""></a></li>');
            off = i * step;
            offs.push(off);
            j_li.data('off',off);
            j_li.find('a').text(i + 1);

            if(i == curr){
                j_li.find('a').on('click',function(e){
                    return false;
                });

                j_li.addClass('active');
            }

            j_ul.append(j_li);
        }

        j_li = $('<li class="next"><a href="">→</a></li>');
        if(curr == end){
            j_li.find('a').on('click',function(e){
                return false;
            });
            
            j_li.addClass('disabled');
            off = curr * step; 
        }else{
            off = (curr + 1) * step;
        }
        offs.push(off);
        j_li.data('off',off);
        j_ul.append(j_li);

        return offs;
    };
    that.create_datetimepicker = function(j_div){
        j_div.addClass('input-append date');
        j_div.append($('<input type="text" data-format="yyyy/MM/dd hh:mm:ss"><span class="add-on"><i date-time-icon="icon-time" date-date-icon="icon-calendar"></i></span>'));

        j_div.datetimepicker({'language':'pt-BR'});

        return j_div.data('datetimepicker');
    };
    that.create_tagbox = function(j_div,words,restrict,duplicate){
        var i;
        var width;
        var inwidth;
        var j_box;
        var j_input;
        var j_menu;
        var last_text = '';
        var hide = true;
        var show = false;
        var tagboxo;

        function _resize(){
            var j_tag;
            var pos;
            var left;
            var top;
            
            left = 6;
            top = 4;
            if((j_tag = j_box.find('span.tag:last')).length == 1){
                pos = j_tag.position();
                left += pos.left + j_tag.width() + 14;

                top += pos.top + j_tag.height() + 1;

                if((inwidth - left) < 70){
                    left = 6;
                    top += 6;
                }else{
                    top -= (j_tag.height() + 2);
                }
            }

            j_input.width(inwidth - left + 6);
            j_input.css('padding-left',left);
            j_input.css('padding-top',top);
        }
        function _match(value){
            var i;
            var word;
            var list;
            var dup;
            var spans;
            var j_li;
            var j_a;
            var flag;
            
            if(value == ''){
                list = words;
            }else{
                list = new Array();
                for(i = 0;i < words.length;i++){
                    word = words[i];
                    if(word.indexOf(value) == 0){
                        list.push(word);
                    }
                }
            }

            if(duplicate != true){
                dup = new Object();
                spans = j_box.find('span.tag');
                for(i = 0;i < spans.length;i++){
                    dup[$(spans[i]).data('text')] = true;
                }
            }

            j_menu.empty();
            flag = false;
            for(i = 0;i < list.length;i++){
                word = list[i];
                if(word in dup){
                    continue;
                }
                flag = true;

                j_li = $('<li><a href=""></a></li>');
                j_li.data('word',word);
                j_li.on('mouseover',function(e){
                    j_menu.find('li.active').removeClass('active');
                    $(this).addClass('active');
                });

                j_a = j_li.find('a')
                j_a.text(word);
                j_a.on('click',function(word){return function(e){
                    _add_tag(word,false);

                    return false;
                }}(word));

                j_menu.append(j_li); 
            }

            j_menu.find('li:first').addClass('active');
            
            if(flag == true && show == true){
                j_menu.show();
            }else{
                j_menu.hide();
            }
        }
        function _move(direct){
            var j_li = j_menu.find('li.active')

            if(direct == 0){
                if(j_li.prev().length > 0){
                    j_li.removeClass('active');
                    j_li.prev().addClass('active');
                }
            }else{
                if(j_li.next().length > 0){
                    j_li.removeClass('active');
                    j_li.next().addClass('active');
                }
            }
        }
        function _init(){
            j_input.css('width','');
            width = j_input.width() + 14;
            inwidth = width - 14;

            j_div.width(width);
            j_input.width(inwidth);
            j_menu.width(width - 2);
        }
        function _set_words(new_words){
            words = new_words;

            if(words == undefined){
                words = [];
            }else{
                words = words.sort();
            }

            _match('');
            _resize();
        }

        function _add_tag(text,force){
            var j_li;
            var j_tag;

            j_input.val('');
            if(force == false){
                if(restrict == true){
                    if((j_li = j_menu.find('li.active')).length == 0){
                        return;
                    }
                    text = j_li.data('word'); 
                }else if(duplicate != true){
                    if(j_box.find('[text="' + text + '"]').length > 0){
                        return;
                    }
                }else if(text == ''){
                    return;
                }
            }

            j_tag = that.create_tag(text);
            j_tag.find('i').on('click',function(){
                _del_tag();
            });

            j_box.append(j_tag);

            _match('');
            _resize();
        }
        function _del_tag(){
            _match('');
            _resize();
        }

        j_div.empty();
        j_div.addClass('tagbox');
        j_div.append($('<div></div><input type="text"><ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu"></ul>'));

        j_box = j_div.find('div');
        j_input = j_div.find('input');
        j_menu = j_div.find('ul');

        _init();
        
        j_input.on('keydown',function(e){
            if(e.keyCode == 8 && j_input.val() == ''){
                j_box.find('span.tag:last').remove();
                _del_tag();
            }else if(e.keyCode == 38){
                _move(0); 
            }else if(e.keyCode == 40){
                _move(1); 
            }
        });
        j_input.on('keyup',function(e){
            var text = j_input.val();

            if(e.keyCode == 13){
                _add_tag(text,false);
            }else if(text != last_text){
                last_text = text;
                _match(text);
            }
        });

        j_input.on('focusin',function(e){
            if(hide == true){
                show = true;
                _match('');
                _resize();
            }
            hide = true;
        });
        j_input.on('focusout',function(e){
            if(hide == true){
                show = false;
                j_input.val('');
                j_menu.hide();
            }
        });
        j_menu.on('mousedown',function(e){
            hide = false;
        });
        j_menu.on('mouseup',function(e){
            j_input.focus();
        });

        _set_words(words);

        _match('');
        _resize();

        tagboxo = {
            'add_tag':function(text){
                _add_tag(text,true); 
            },
            'get_tag':function(){
                var i;
                var tags = j_box.find('span.tag');
                var taglist = new Array();

                for(i = 0;i < tags.length;i++){
                    taglist.push($(tags[i]).data('text'));
                }

                return taglist;
            },
            'set_words':function(new_words){
                _set_words(new_words);
            },
            'refresh':function(){
                _init();
                _match('');
                _resize();
            },
            'clear':function(){
                j_box.empty();
                _match('');
                _resize();
            }
        };

        j_div.data('tagbox',tagboxo);

        return tagboxo;
    };
    that.create_tag = function(text,style){
        var j_span;
        var j_i;

        j_span = $('<span class="label tag"></span>');
        j_span.data('text',text);
        if(style != undefined){
            j_span.addClass(style);
        }
        j_span.text(text);

        j_i = $('<i class="icon-remove-circle icon-white"></i>');
        j_span.append(j_i);
        j_i.on('click',function(e){
            j_span.remove();
        });

        return j_span;
    };
    that.is_callerr = function(result){
        if(result.stat == false || (typeof(result.data) == 'string' && result.data[0] == 'E')){
            return true;
        } 

        return false;
    };

    that.conn_backend = function(){
        $.post('http://toj.tfcis.org:83/conn',{},function(res){
            var reto;
            var idendesc;
            var ws;
            var addr;
            
            function x(idx){
                var tws = new WebSocket('ws://' + reto.ip + ':' + reto.port + '/conn');
                var offset;
                var end;
                var blob;

                tws.onmessage = function(){
                    console.log(offset)

                    if(offset < end){
                        console.log(offset);
                        tws.send(blob.slice(offset,Math.min(end,offset + 524288 * 1),'application/octet-stream'));
                        offset += (524288 * 1);
                    }else{
                        console.log(new Date().getTime());
                    }
                };
                tws.onopen = function(){
                    tws.send('filestream'); 
                };
                $('#test_fs').on('change',function(e){
                    blob = this.files[0];
                    offset = Math.floor(blob.size / 4) * idx;
                    if(idx != 3){
                        end = offset + Math.floor(blob.size / 4);
                    }else{
                        end = blob.size;
                    }

                    console.log(new Date().getTime());
                    tws.send('start');
                });
            }

            if(res[0] != 'E'){
                reto = JSON.parse(res)

                that.link = reto.client_link;
                that.backend_link = reto.backend_link;
                idendesc = reto.client_idendesc;
                addr = reto.ip + ':' + reto.port;

                ws = new WebSocket('ws://' + addr + '/conn');
                ws.onopen = function(){
                    var i;
                    var conn;
                    var cookie;

                    console.log('open');

                    ws.send(JSON.stringify({
                        'conntype':'main',
                        'client_link':that.link
                    }));

                    conn = new WebSocketConnection(reto.backend_link,ws,addr);

                    new imc.Auth();
                    new imc.Proxy(that.link,imc.Auth.instance,function(link,callback){
                        callback(conn);
                    });
                    imc.Proxy.instance.add_conn(conn);

                    imc.Auth.change_current_iden(idendesc)

                    if((cookie = that.get_cookie()).uid != undefined){
                        that.call_backend('core/user/','cookie_login',function(result){
                            if(that.is_callerr(result)){
                                index.add_alert('','錯誤','登入失敗');
                            }else{
                                imc.Auth.change_current_iden(result.data.idendesc);
                            }
                            
                            that.conn_callback.fire();
                        },parseInt(cookie.uid),cookie.hash);
                    }else{
                        that.conn_callback.fire();
                    }

                    $('#test_fs').on('change',function(e){
                        var blob = this.files[0];

                        console.log(new Date().getTime());

                        that.sendfile_backend(blob,function(filekey){
                            that.call_backend('test/','test_dst',function(result){
                                console.log(result);
                            },filekey);
                            console.log(filekey);
                        },function(result){
                            console.log(result);
                        }); 

                    });

                };
            }else{
                setTimeout(that.conn_backend,5000);
            }
        });
    }

    that.call_backend = function(path,func_name,callback){
        var i;
        var params = new Array()

        params = [that.backend_link + path,func_name,1000,callback]
        for(i = 3;i < arguments.length;i++){
            params.push(arguments[i]); 
        }

        imc.Proxy.instance.call.apply(undefined,params);
    };
    that.sendfile_backend = function(blob,filekey_callback,result_callback){
        return imc.Proxy.instance.sendfile(that.backend_link,blob,
                                           filekey_callback,result_callback);
    };
};
