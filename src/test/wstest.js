var count = 0;
var last = 0;
var data = new ArrayBuffer(1024);

function test(){
    $.post('http://toj.tfcis.org:83/conn',{},function(res){
        var reto;
        
        if(res[0] != 'E'){
            reto = JSON.parse(res)
            conn(reto.client_linkid,reto.worker_linkid,reto.ip,reto.port);
        }else{

        }
    });
}

function conn(client_linkid,worker_linkid,ip,port){
    console.log(client_linkid);
    console.log(worker_linkid);

    var ws;
    var reader = new FileReader;
    var imc_call = function(iden,dst,func_name,param){
        call = {
            'type':'call',
            'caller_retid':client_linkid + '/' + 'genid_13',
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

        console.log('open');
        ws.send(JSON.stringify({
            'client_linkid':client_linkid
        }))

        imc_call(client_linkid,'/backend/' + worker_linkid,'test_dst','Hello');
    };
    ws.onmessage = function(e){
        reader.onload = function(e){
            var res = e.target.result;    
            //console.log(JSON.parse(res));

            imc_call(client_linkid,'/backend/' + worker_linkid,'test_dst','Hello');
        };
        reader.readAsText(e.data);
        count++;
    };

    perf();
}

function perf(){
    $('#speed').text((count - last) + '/s');
    last = count;
    setTimeout(perf,1000);
}
