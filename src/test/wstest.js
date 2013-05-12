var count = 0;
var last = 0;
var data = new ArrayBuffer(1024);

var linkid = null;
var iden = null;

function test(){
    $.post('http://toj.tfcis.org:83/conn',{},function(res){
        var reto;
        
        if(res[0] != 'E'){
            reto = JSON.parse(res)
            linkid = reto.client_linkid;

            new imc.proxy(linkid);
            iden = {'linkclass':'client','linkid':linkid};

            imc_register_call('','test_dst',test_dst);
    
            imc_call(iden,'/client/test/','test_dst','Hello',function(result){
                console.log(result);
            });

            conn(reto.client_linkid,reto.worker_linkid,reto.ip,reto.port);
        }else{

        }
    });
}

function test_dst(param,callback){
    console.log(param);
    
    callback('Hello Too');
}

function conn(client_linkid,worker_linkid,ip,port){
    console.log(client_linkid);
    console.log(worker_linkid);

    var ws;
    var reader = new FileReader;
    var imc_call = function(iden,dst,func_name,param){
        call = {
            'type':'call',
            'caller_retid':client_linkid + '/' + '13',
            'timeout':60000,
            'iden':iden,
            'dst':dst,
            'func_name':func_name,
            'param':param
        }

        data = new Blob([JSON.stringify(call)],{'type':'application/octet-stream'})
        ws.send(data);
    };
    
    ws = new WebSocket('ws://' + ip + ':' + port + '/conn');
    ws.onopen = function(){
        var i;

        $('div.main > div.error > div.reconnect').alert('close');

        console.log('open');
        ws.send(JSON.stringify({
            'client_linkid':client_linkid
        }))

        imc_call({'linkclass':'client','linkid':client_linkid},'/center/1' + '/','test_dst','');
    };
    ws.onmessage = function(e){
        reader.onload = function(e){
            var res = e.target.result;    
            console.log(JSON.parse(res));

            //imc_call({'linkclass':'client','linkid':client_linkid},'/center/' + worker_linkid + '/','test_dst','Hello');
        };
        reader.readAsText(e.data);
        count++;
    };
    ws.onclose = function(e){
        console.log('close');
    };

    perf();
}

function perf(){
    $('#speed').text((count - last) + '/s');
    last = count;
    setTimeout(perf,1000);
}
