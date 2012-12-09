<?php
require_once('common.php');

$userid = $_COOKIE['userid'];
$usersec = $_COOKIE['usersec'];
$submitid = $_POST['submitid'];

if(!sec_checkuser($userid,$usersec)){
    exit('Eerror');
}
if($submitid == '' || strval(intval($submitid)) != $submitid){
    exit('Eerror');
}

$sqlc = pg_connect('host=localhost port=5432 dbname='.DB_NAME.' user='.DB_USER.' password='.DB_PASSWORD);

$userid = pg_escape_string($userid);
$submitid = pg_escape_string($submitid);
$sqlr = pg_query_params($sqlc,'SELECT "submitid" FROM "submit" WHERE "userid"=$1 AND "submitid"=$2 LIMIT 1',
	array($userid,$submitid));
if(pg_num_rows($sqlr) == 0){
    pg_free_result($sqlr);
    pg_close($sqlc);
    exit('Eerror');
}
pg_free_result($sqlr);
pg_close($sqlc);

echo json_encode(['code' => file_get_contents('submit/'.$submitid.'_submit.cpp')]);
?>
