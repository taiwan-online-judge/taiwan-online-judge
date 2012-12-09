<?php
require_once('common.php');

function scoreboardlist_cmp($a,$b){
    if($a['acceptcount'] == $b['acceptcount']){
	if($a['penalty'] == $b['penalty']){
	    return $a['userid'] - $b['userid'];
	}else{
	    return $a['penalty'] - $b['penalty'];
	}
    }
    return $b['acceptcount'] - $a['acceptcount'];
}

function square_scoreboard_list($sqlc,$paramo){
    $squareid = $paramo->squareid;

    if(gettype($squareid) != 'integer' || $squareid < 1){
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

    $sqlr = pg_query_params($sqlc,'SELECT "proid" FROM "problem" WHERE $1=ANY("squarelist") ORDER BY "proid";',
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
	    'penalty' => 0,
	    'prolist' => array() 
	);
    }
    pg_free_result($sqlr);

    $sqlr = pg_query_params($sqlc,'SELECT "userid","proid",EXTRACT(EPOCH FROM age("timestamp",$1)) AS "time","result"=0 AS "accept" FROM "submit" WHERE "proid" IN ('.implode(',',$proidlist).') ORDER BY "timestamp";',
	array($squareo->starttime));

    while($sqlo = pg_fetch_object($sqlr)){
	if(!array_key_exists($sqlo->userid,$useridlist)){
	    continue;
	}

	$userido = &$useridlist[$sqlo->userid]; 
	if(!array_key_exists($sqlo->proid,$userido['prolist'])){
	    $userido['prolist'][$sqlo->proid] = array(
		'accepttime' => null,
		'submitcount' => 0,
		'penalty' => 0
	    );
	}
	$proo = &$userido['prolist'][$sqlo->proid];

	if($proo['accepttime'] == null){
	    if($sqlo->accept == 't'){
		$proo['accepttime'] = intval($sqlo->time);
		$proo['submitcount']++;
		$proo['penalty'] = ($userido->submitcount - 1) * 1200 + $proo['accepttime'];

		$userido['acceptcount']++;
		$userido['penalty'] += $proo['penalty'];
	    }else{
		$proo['submitcount']++;
	    }
	}
    }
    pg_free_result($sqlr);

    $scoreboardlist = array();
    foreach($useridlist as $key => $value){
	$scoreboardlist[] = array(
		'userid' => $key,
		'nickname' => $value['nickname'],
		'acceptcount' => $value['acceptcount'],
		'penalty' => $value['penalty'],
		'prolist' => $value['prolist']);
    }
    usort($scoreboardlist,'scoreboardlist_cmp');

    $rank = 1;
    for($idx = 0;$idx < count($scoreboardlist);$idx++){
	if($idx > 0){
	    if($scoreboardlist[$idx]['acceptcount'] != $scoreboardlist[$idx - 1]['acceptcount'] ||
		    $scoreboardlist[$idx]['penalty'] != $scoreboardlist[$idx - 1]['penalty']){
		$rank = $idx + 1;
	    }
	}
	$scoreboardlist[$idx]['rank'] = $rank;
    }

    return array(
	'proidlist' => $proidlist,
	'scoreboardlist' => $scoreboardlist
    );
}
?>
