<?php
require_once('common.php');

$userid = $_COOKIE['userid'];
$usersec = $_COOKIE['usersec'];
$proid = $_POST['proid'];
$code = $_POST['code'];

if(!sec_checkuser($userid,$usersec)){
    exit('Euser');
}
if($proid == '' || strval(intval($proid)) != $proid){
    exit('Epro');
}
if(strlen($code) > (64 * 1024)){
    exit('Ecode');
}

$sqlc = pg_connect('host=localhost port=5432 dbname='.DB_NAME.' user='.DB_USER.' password='.DB_PASSWORD);

$userid = pg_escape_string($userid);
$sqlr = pg_query_params($sqlc,'SELECT * FROM "user" WHERE userid=$1 LIMIT 1;',
    array($userid));
if(($usero = pg_fetch_object($sqlr)) == null){
    pg_free_result($sqlr);
    pg_close($sqlc);
    exit('Euser');
}
pg_free_result($sqlr);

$mc = new Memcached();
$mc->addServer('localhost',11211);
if(!$mc->add('problem_code_submit_limit_'.$userid,true,10)){
    pg_close($sqlc);
    exit('Elimit');
}

$proid = pg_escape_string($proid);
$sqlr = pg_query_params($sqlc,'SELECT * FROM "problem" WHERE proid=$1 LIMIT 1;',
    array($proid));
if(($proo = pg_fetch_object($sqlr)) == null){
    pg_free_result($sqlr);
    pg_close($sqlc);
    exit('Epro');
}
pg_free_result($sqlr);

$sqlr = pg_query_params($sqlc,'INSERT INTO "submit" ("proid","userid","status","score","maxscore","runtime","peakmem") VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING "submitid";',
	array($proid,$userid,'{100}','{0}','{0}','{0}','{0}'));
$submitid = pg_fetch_row($sqlr)[0];
pg_free_result($sqlr);

file_put_contents('submit/'.$submitid.'_submit.cpp',$code);

pg_close($sqlc);

$sd = socket_create(AF_INET,SOCK_STREAM,0);
socket_connect($sd,'127.0.0.1',2501);

$data = $submitid.' '.$proid.chr(0);
socket_write($sd,$data,strlen($data));

socket_close($sd);

echo 'S';
?>
