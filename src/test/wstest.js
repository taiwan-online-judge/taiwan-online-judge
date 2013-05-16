var count = 0;
var last = 0;
var data = new ArrayBuffer(1024);

var linkid = null;
var idendesc = null;

function test_call(iden,param,callback){
    callback('Hello Too');

    imc_call(idendesc,'/center/1/','test_dst','',function(result){
        console.log(result); 
    });
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

                imc_register_call('','test_call',test_call);
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
