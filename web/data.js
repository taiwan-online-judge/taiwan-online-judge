var data_callback;
var data_paramo;
var data_ajaxupdate;

function data_init(){
    data_callback = $.Callbacks();
    
    data_paramo = new Object();
    data_paramo.laststamp = '_';

    data_ajaxupdate = null;
}
function data_update(force){
    if(data_ajaxupdate != null){
	data_ajaxupdate.abort();
    }
    if(force){
	data_paramo.laststamp = '_';
    }

    data_ajaxupdate = $.post('data_update.php',
	    {'param':JSON.stringify(data_paramo)},
	    function(res){
		var reto;

		if(res == 'Esame'){
		    data_update();
		}else if(res[0] != 'E'){
		    reto = JSON.parse(res);
		    data_paramo.laststamp = reto.laststamp;

		    data_callback.fire(reto);

		    data_ajaxupdate = null;
		    data_update(false);
		}
	    }
    );
}
