<?php
require_once('../../php/problem.inc.php');

const PMODNAME = 'pmod_test';

$proid = json_decode($_POST['proid']);
if(gettype($proid) != 'integer' || $proid < 1){
    exit('Eproid');
}

$sqlc = db_connect();
if(!problem::is_available($sqlc,$proid)){
    exit('Epermission');
}

$pro = problem::get($sqlc, $proid);
if($pro->pmodname != PMODNAME)
    exit('Ewrong_pmod');

db_close($sqlc);

$prodir = '/srv/http/toj/center/pro/'.$proid.'/';

$fd = fopen($prodir.'setting','r');
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

$content = file_get_contents($prodir.'public/content');

echo(json_encode(array(
    'set' => json_decode($set),
    'content' => $content
)));
?>
