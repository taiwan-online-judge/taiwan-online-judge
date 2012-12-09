<?php
require_once('common.php');

$userid = intval($_POST['userid']);

if(gettype($userid) != 'integer' || $userid < 1){
    exit('Eerror');
}

$sqlc = pg_connect('host=localhost port=5432 dbname='.DB_NAME.' user='.DB_USER.' password='.DB_PASSWORD);

$userid = pg_escape_string($userid);
$sqlr = pg_query_params($sqlc,'SELECT * FROM "user" WHERE "userid"=$1 LIMIT 1;',
	array($userid));

if(($usero = pg_fetch_object($sqlr)) == null){
    pg_free_result($sqlr);
    pg_close($sqlc);
    exit('Eerror');
}
pg_free_result($sqlr);

$sqlr = pg_query_params($sqlc,'SELECT COUNT(DISTINCT "proid") FROM "submit" WHERE "userid"=$1 AND "result"=0;',
	array($userid));
$acceptcount = pg_fetch_row($sqlr)[0];
pg_free_result($sqlr);

$sqlr = pg_query_params($sqlc,'SELECT COUNT(DISTINCT "proid") FROM "submit" WHERE "userid"=$1;',
	array($userid));
$trycount = pg_fetch_row($sqlr)[0];
pg_free_result($sqlr);

$sqlr = pg_query_params($sqlc,'SELECT COUNT("proid") FROM "submit" WHERE "userid"=$1;',
	array($userid));
$submitcount = pg_fetch_row($sqlr)[0];
pg_free_result($sqlr);

$userinfo = array(
    'userid' => $usero->userid,
    'username' => $usero->username,
    'nickname' => $usero->nickname,
    'headimg' => $usero->headimg,
    'aboutme' => $usero->aboutme,
    'acceptcount' => $acceptcount,
    'submitcount' => $submitcount,
    'trycount' => $trycount);

$sqlr = pg_query_params($sqlc,'SELECT "proid",MAX("sumscore"/"summaxscore") AS "rate" FROM "submit" WHERE "userid"=$1 AND "result"<>100 GROUP BY "proid" ORDER BY "proid";',
	array($userid));

$prolist = array();
while($sqlo = pg_fetch_object($sqlr)){
    $prolist[] = array(
	    'proid' => $sqlo->proid,
	    'rate' => $sqlo->rate * 100);
}
pg_free_result($sqlr);

pg_close($sqlc);

echo json_encode(array(
    'userinfo' => $userinfo,
    'prolist' => $prolist
));
?>
