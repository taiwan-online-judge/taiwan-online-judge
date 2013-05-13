var count = 0;
var last = 0;
var data = new ArrayBuffer(1024);

var linkid = null;
var iden = null;
var backend_conn = null;

function test(){
    $.post('http://toj.tfcis.org:83/conn',{},function(res){
        var reto;
        
        if(res[0] != 'E'){
            reto = JSON.parse(res)
            linkid = reto.client_linkid;

            new imc.Proxy(linkidm,function(linkid,callback){
                callback(backend_conn);
            });
            iden = {'linkclass':'client','linkid':linkid};

            imc_register_call('','test_call',test_call);
    
            conn_backend(reto.client_linkid,reto.backend_linkid,reto.ip,reto.port);
        }else{

        }
    });
}

function test_call(param,callback){
    console.log(param);
    
    callback('Hello Too');
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
    };

    backend_conn = that;

};__extend__(WebSocketConnection,imc.Connection);

function conn_backend(client_linkid,backend_linkid,ip,port){
    var ws;
    /*var imc_call = function(iden,dst,func_name,param){
        call = {
            'type':'call',
            'caller_retid':client_linkid + '/' + '13',
            'timeout':60000,
            'iden':iden,
            'dst':dst,
            'func_name':func_name,
            'param':param
        }

    };*/
    
    ws = new WebSocket('ws://' + ip + ':' + port + '/conn');
    ws.onopen = function(){
        var i;

        console.log('open');

        ws.send(JSON.stringify({
            'client_linkid':client_linkid
        }));
        imc.Proxy.instance.add_conn(new WebSocketConnection(backend_linkid,ws));

        imc_call({'linkclass':'client','linkid':client_linkid},'/center/1' + '/','test_dst','');
    };
}

function perf(){
    $('#speed').text((count - last) + '/s');
    last = count;
    setTimeout(perf,1000);
}
