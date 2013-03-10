<?php
require_once('../../php/status.inc.php');
require_once('../../php/problem.inc.php');

$subid = json_decode($_POST['subid']);
if(gettype($subid) != 'integer' || $subid < 1){
    exit('Esubid');
}

$sqlc = db_connect();
if(!status::subid_is_available($sqlc,$subid)){
    exit('Epermission');
}

$sub = status::get_by_subid($sqlc, $subid);
$proid = $sub->proid;
if(!$proid)
    exit('Eno_such_subid');

$prodir = '/srv/http/toj/center/pro/'.$proid.'/setting';
db_close($sqlc);

$fd = fopen($prodir, 'r');
while($line = fgets($fd)){
    if($line[0] == '='){
	break;
    }
}
$set = '';
while(($line = fgets($fd))){
    $set = $set.$line;
}
fclose($fd);

if(!$set)
    exit('Eerr_pro_data');

$proset = json_decode($set);

$subdir = '/srv/http/toj/center/submit/'.($subid - ($subid % 1000)).'/'.$subid.'/result/';
if(($result = file_get_contents($subdir.'result')) == ''){
    exit('Enull');
}

$q = json_decode($result);
$q->pro_setting = $proset;
echo(json_encode($q));

//echo('{"result":'.$result.', "pro_setting"='.$set.'}');
?>
