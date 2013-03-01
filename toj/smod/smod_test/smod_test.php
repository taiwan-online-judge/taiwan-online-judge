<?php
require_once('../../php/status.inc.php');

$subid = json_decode($_POST['subid']);
if(gettype($subid) != 'integer' || $subid < 1){
    exit('Esubid');
}

$sqlc = db_connect();
if(!status::subid_is_available($sqlc,$subid)){
    exit('Epermission');
}
db_close($sqlc);

$subdir = '/srv/http/toj/center/submit/'.($subid - ($subid % 1000)).'/'.$subid.'/result/';
if(($result = file_get_contents($subdir.'result')) == ''){
    exit('Enull');
}

echo($result);
?>
