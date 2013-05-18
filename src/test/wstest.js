'use strict'

var count = 0;
var last = 0;
var data = new ArrayBuffer(1024);

var linkid = null;
var idendesc = null;

function test_display(iden,param,callback){
    console.log(param);

    callback(null);

    /*imc_call(idendesc,'/center/1/','test_dst','',function(result){
        console.log(result); 
    });*/
}

var WebSocketConnection = function(linkid,ws){
    var that = this;
    var reader = new FileReader;

    that.__super__(linkid);

    that.send_msg = function(data){
        ws.send(new Blob([data],{'type':'application/octet-stream'}))
    };
    that.start_recv = function(recv_callback){
        ws.onmessage = function(e){
            reader.onload = function(e){
                recv_callback(that,e.target.result);
            };
            reader.readAsText(e.data);
        }
    };

    ws.onclose = function(e){
        console.log('close');
        that.close();

        setTimeout(conn_backend,5000);
    };
};__extend__(WebSocketConnection,imc.Connection);

function conn_backend(ip,port){
    $.post('http://toj.tfcis.org:83/conn',{},function(res){
        var reto;
        var iden;
        var linkid;
        var ws;
        
        if(res[0] != 'E'){
            reto = JSON.parse(res)
            idendesc = reto.client_idendesc;
            iden = JSON.parse(JSON.parse(idendesc)[0]);
            linkid = iden.linkid;

            ws = new WebSocket('ws://' + reto.ip + ':' + reto.port + '/conn');
            ws.onopen = function(){
                var i;
                var conn;

                console.log('open');

                console.log(linkid);
                ws.send(JSON.stringify({
                    'client_linkid':linkid
                }));

                conn = new WebSocketConnection(reto.backend_linkid,ws);

                new imc.Auth();
                new imc.Proxy(linkid,imc.Auth.instance,function(linkid,callback){
                    callback(conn);
                });
                imc.Proxy.instance.add_conn(conn);

                imc_register_call('','test_display',test_display);
            };
        }else{
            setTimeout(conn_backend,5000);
        }
    });
}

function perf(){
    $('#speed').text((count - last) + '/s');
    last = count;
    setTimeout(perf,1000);
}

var index = new function(){
    this.init = function(){
        var j_navbar = $('#index_head ul.right_navbar');
        var j_navbar_menu = $('#index_head_menu');
        var j_navbar_notice = $('#index_head_notice');
        var j_panel = $('#index_panel');
        var j_panel_menu = $('#index_panel_menu');
        var j_panel_notice = $('#index_panel_notice');

        var _in_area = function(target,id){
            return target.id == id || $(target).parents('#' + id).length > 0;
        };
        var _show_panel = function(){
            var j_i;

            if(!j_panel.hasClass('panel_container_a')){
                j_i = j_navbar_menu.find('i');
                j_i.removeClass('icon-chevron-left');
                j_i.addClass('icon-chevron-down');

                j_panel.addClass('panel_container_a');
            }
        };
        var _hide_panel = function(){
            var j_i;

            if(j_panel.hasClass('panel_container_a')){
                j_i = j_navbar_menu.find('i');
                j_i.removeClass('icon-chevron-down');
                j_i.addClass('icon-chevron-left');

                j_panel.removeClass('panel_container_a');
            }
        };
        var _show_menu = function(){
            _hide_notice();
            j_panel.find('div.menu_container').show();
            _show_panel();
        };
        var _hide_menu = function(){
            j_panel.find('div.menu_container').hide();
        };
        var _show_notice = function(){
            _hide_menu();
            j_panel.find('div.notice_container').show();
            _show_panel();
        };
        var _hide_notice = function(){
            j_panel.find('div.notice_container').hide();
        };
        
        $(window).on('resize',function(e){
            j_panel.css('min-height',($(window).height() - 40 + 'px'));
        });
        j_panel.css('min-height',($(window).height() - 40 + 'px'));

        $(window).on('mouseover',function(e){
            var target = e.target;

            console.log(e.target);
            if(target == null ||
                _in_area(target,'index_panel') ||
                (target.parentNode.id == 'index_head' && $(target).hasClass('navbar-inner'))){
                return;
            }

            if(_in_area(target,'index_head_menu')){
                if(!j_panel.hasClass('panel_container_a')){
                    _show_menu();
                }
            }else{
                if(!_in_area(target,'index_head_rightnavbar')){
                    _hide_panel();
                }
            }   
        });

        j_navbar_menu.on('click',function(e){
            _show_menu();
        });
        j_navbar_notice.on('click',function(e){
            _show_notice();
        });
    };
};
