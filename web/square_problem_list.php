<?php
require_once('common.php');

function square_problem_list($sqlc,$paramo){
    $userid = $_COOKIE['userid'];
    $usersec = $_COOKIE['usersec'];
    $squareid = $paramo->squareid;
    $prooff = $paramo->prooff;

    if(!sec_checkuser($userid,$usersec)){
	$userid = null;
    }
    if(gettype($squareid) != 'integer' || $squareid < 1){
	return null;
    }
    if(gettype($prooff) != 'integer' || $prooff < 0){
	return null;
    }

    $squaireid = pg_escape_string($squareid);
    $prooff = pg_escape_string($prooff);
    $sqlr = pg_query_params($sqlc,'SELECT * FROM "problem" WHERE $1 = ANY ("squarelist") ORDER BY "proid" LIMIT 20 OFFSET $2;',
	    array($squareid,$prooff));

    $prolist = array();
    $proidlist = array();
    while($proo = pg_fetch_object($sqlr)){
	$prolist[] = array(
		'proid' => $proo->proid,
		'proname' => $proo->proname,
		'acceptcount' => $proo->acceptcount,
		'submitcount' => $proo->submitcount,
		'sumscore' => null,
		'summaxscore' => null);
	$proidlist[$proo->proid] = count($prolist) - 1;
    }
    pg_free_result($sqlr);

    $sqlr = pg_query_params($sqlc,'SELECT COUNT(*) FROM "problem" WHERE $1 = ANY ("squarelist");',
	    array($squareid));
    $procount = pg_fetch_row($sqlr)[0];
    pg_free_result($sqlr);

    if($userid){
	$userid = pg_escape_string($userid);
	$sqlr = pg_query_params($sqlc,'SELECT "proid","sumscore","summaxscore" FROM "submit" WHERE "userid"=$1 AND "proid" IN ('.implode(',',array_keys($proidlist)).') ORDER BY "sumscore" DESC;',
		array($userid));

	while($sqlo = pg_fetch_object($sqlr)){
	    if($prolist[$proidlist[$sqlo->proid]]['sumscore'] == null){
		$prolist[$proidlist[$sqlo->proid]]['sumscore'] = $sqlo->sumscore;
		$prolist[$proidlist[$sqlo->proid]]['summaxscore'] = $sqlo->summaxscore;
	    }
	}
	pg_free_result($sqlr);
    }

    return array(
	'procount' => $procount,
	'prolist' => $prolist
    );
}
?>
