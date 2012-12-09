<?php
require_once('common.php');

function ranklist_cmp($a,$b){
    if($a['acceptcount'] == $b['acceptcount']){
	if($a['submitcount'] == $b['submitcount']){
	    return $a['userid'] - $b['userid'];
	}else{
	    return $a['submitcount'] - $b['submitcount'];
	}
    }
    return $b['acceptcount'] - $a['acceptcount'];
}

function square_rank_list($sqlc,$paramo){
    $squareid = $paramo->squareid;
    $rankoff = $paramo->rankoff;

    if(gettype($squareid) != 'integer' || $squareid < 1){
	return null;
    }
    if(gettype($rankoff) != 'integer' || $rankoff < 0){
	return null;
    }

    $squareid = pg_escape_string($squareid);
    $sqlr = pg_query_params($sqlc,'SELECT * FROM "square" WHERE "squareid"=$1',
	array($squareid));

    if(($squareo = pg_fetch_object($sqlr)) == null){
	pg_free_result($sqlr);
	return null;
    }
    pg_free_result($sqlr);

    $sqlr = pg_query_params($sqlc,'SELECT "proid" FROM "problem" WHERE $1=ANY("squarelist");',
	    array($squareid));

    $proidlist = array();
    while($sqlo = pg_fetch_object($sqlr)){
	$proidlist[] = $sqlo->proid;
    }
    pg_free_result($sqlr);

    $sqlr = pg_query_params($sqlc,'SELECT "userid","nickname" FROM "user" WHERE $1=ANY("squarelist");',
	array($squareid));

    $useridlist = array();
    while($sqlo = pg_fetch_object($sqlr)){
	$useridlist[$sqlo->userid] = array(
		'nickname' => $sqlo->nickname,
		'acceptcount' => 0,
		'submitcount' => 0,
		'score' => 0);
    }
    pg_free_result($sqlr);

    $sqlr = pg_query_params($sqlc,'SELECT "userid" FROM "submit" WHERE "proid" IN ('.implode(',',$proidlist).') AND "result"=0 AND "timestamp">=$1 AND "timestamp"<$2 GROUP BY "proid","userid";',
	array($squareo->starttime,$squareo->endtime));

    while($sqlo = pg_fetch_object($sqlr)){
	if(array_key_exists($sqlo->userid,$useridlist)){
	    $useridlist[$sqlo->userid]['acceptcount']++;
	}
    }
    pg_free_result($sqlr);

    $sqlr = pg_query_params($sqlc,'SELECT "userid",COUNT("userid") AS "submitcount" FROM "submit" WHERE "proid" IN ('.implode(',',$proidlist).') AND "timestamp">=$1 AND "timestamp"<$2 GROUP BY "userid";',
	array($squareo->starttime,$squareo->endtime));

    while($sqlo = pg_fetch_object($sqlr)){
	if(array_key_exists($sqlo->userid,$useridlist)){
	    $useridlist[$sqlo->userid]['submitcount'] += $sqlo->submitcount;
	}
    }
    pg_free_result($sqlr);

    $sqlr = pg_query_params($sqlc,'SELECT "userid",MAX("sumscore") AS "score" FROM "submit" WHERE "proid" IN ('.implode(',',$proidlist).') AND "timestamp">=$1 AND "timestamp"<$2 GROUP BY "proid","userid";',
	array($squareo->starttime,$squareo->endtime));

    while($sqlo = pg_fetch_object($sqlr)){
	if(array_key_exists($sqlo->userid,$useridlist)){
	    $useridlist[$sqlo->userid]['score'] += $sqlo->score;
	}	
    }
    pg_free_result($sqlr);

    $ranklist = array();
    foreach($useridlist as $key => $value){
	$ranklist[] = array(
		'userid' => $key,
		'nickname' => $value['nickname'],
		'acceptcount' => $value['acceptcount'],
		'submitcount' => $value['submitcount'],
		'score' => $value['score']);
    }
    usort($ranklist,'ranklist_cmp');

    $rank = 1;
    for($idx = 0;$idx < count($ranklist);$idx++){
	if($idx > 0){
	    if($ranklist[$idx]['acceptcount'] != $ranklist[$idx - 1]['acceptcount'] ||
		    $ranklist[$idx]['submitcount'] != $ranklist[$idx - 1]['submitcount']){
		$rank = $idx + 1;
	    }
	}
	$ranklist[$idx]['rank'] = $rank;
    }

    return array(
	'rankcount' => count($ranklist),
	'ranklist' => array_slice($ranklist,$rankoff,20)
    );
}
?>
