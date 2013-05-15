var count = 0;
var last = 0;
var data = new ArrayBuffer(1024);

var linkid = null;
var iden = null;

function test_call(param,callback){
    callback('Hello Too');

    imc_call(iden,'/center/1/','test_dst','',function(result){
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

        conn_backend();
    };
};__extend__(WebSocketConnection,imc.Connection);

function conn_backend(client_linkid,backend_linkid,ip,port){
    $.post('http://toj.tfcis.org:83/conn',{},function(res){
        var reto;
        var ws;
        
        if(res[0] != 'E'){
            reto = JSON.parse(res)
            linkid = reto.client_linkid;

            ws = new WebSocket('ws://' + reto.ip + ':' + reto.port + '/conn');
            ws.onopen = function(){
                var i;
                var conn;

                console.log('open');

                ws.send(JSON.stringify({
                    'client_linkid':reto.client_linkid
                }));

                conn = new WebSocketConnection(reto.backend_linkid,ws);

                new imc.Proxy(linkid,function(linkid,callback){
                    callback(conn);
                });
                imc.Proxy.instance.add_conn(conn);

                iden = {'linkclass':'client','linkid':linkid};

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
