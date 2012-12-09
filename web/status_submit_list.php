<?php
require_once('common.php');

function status_submit_list($sqlc,$paramo,$useronly){
    $submitoff = $paramo->submitoff;
    $submitid = $paramo->submitid;
    $proid = $paramo->proid;
    $result = $paramo->result;

    if($useronly == true){
	$userid = $_COOKIE['userid'];
	$usersec = $_COOKIE['usersec'];
	if(!sec_checkuser($userid,$usersec)){
	    return null;
	}
	$userid = pg_escape_string($userid);
    }
    if(gettype($submitoff) != 'integer' || $submitoff < 0){
	$submitoff = -1;
    }
    if(gettype($submitid) != 'integer' || $submitid < 1){
	$submitid = -1;
    }
    if(gettype($proid) != 'integer' || $proid < 1){
	$proid = -1;
    }
    if(gettype($result) != 'integer'){
	$result = -100;
    }
    if($submitoff == -1 && $submitid == -1){
	return null;
    }

    $submitlist = array();
    $useridlist = array();

    if($submitoff != -1){
	$submitoff = pg_escape_string($submitoff);
	$sqlstr = 'SELECT "submitid","proid","userid","timestamp","result","sumscore","summaxscore","sumruntime" FROM "submit" ';

	if($useronly == true){
	    $sqlr = pg_query_params($sqlc,$sqlstr.'WHERE "userid"=$1 ORDER BY "submitid" DESC LIMIT 20 OFFSET $2;',
		    array($userid,$submitoff));
	}else if($proid != -1 && $result != -100){
	    $sqlr = pg_query_params($sqlc,$sqlstr.'WHERE "proid"=$1 AND "result"=$2 ORDER BY "sumruntime" ASC LIMIT 20 OFFSET $3;',
		    array($proid,$result,$submitoff));
	}else if($proid != -1 && $result == -100){
	    $sqlr = pg_query_params($sqlc,$sqlstr.'WHERE "proid"=$1 AND "result"<>100 ORDER BY "submitid" DESC LIMIT 20 OFFSET $2;',
		    array($proid,$submitoff));
	}else{
	    $sqlr = pg_query_params($sqlc,$sqlstr.'ORDER BY "submitid" DESC LIMIT 20 OFFSET $1;',
		    array($submitoff));
	}

	while($submito = pg_fetch_object($sqlr)){
	    $submitlist[] = array(
		    'submitid' => $submito->submitid,
		    'proid' => $submito->proid,
		    'userid' => $submito->userid,
		    'timestamp' => $submito->timestamp,
		    'result' => $submito->result,
		    'sumscore' => $submito->sumscore,
		    'summaxscore' => $submito->summaxscore,
		    'sumruntime' => $submito->sumruntime);
	    $useridlist[$submito->userid] = '';
	}
	pg_free_result($sqlr);
    }

    if($submitid != -1){
	$sqlstr = 'SELECT "submitid","proid","userid",array_to_string("status",\',\') AS "status",array_to_string("score",\',\') AS "score",array_to_string("maxscore",\',\') AS "maxscore",array_to_string("runtime",\',\') AS "runtime",array_to_string("peakmem",\',\') AS "peakmem","timestamp","result","sumscore","summaxscore","sumruntime" FROM "submit" ';

	if($submitid != 2147483647){
	    $submitid = pg_escape_string($submitid);
	    $sqlr = pg_query_params($sqlc,$sqlstr.'WHERE "submitid"=$1 LIMIT 1;',
		array($submitid));
	}else{
	    if($useronly == true){
		$sqlr = pg_query_params($sqlc,$sqlstr.'WHERE "userid"=$1 ORDER BY "submitid" DESC LIMIT 1;',
		    array($userid));
	    }else if($proid != -1 && $result != -100){
		$sqlr = pg_query_params($sqlc,$sqlstr.'WHERE "proid"=$1 AND "result"=$2 ORDER BY "sumruntime" ASC LIMIT 1;',
		    array($proid,$result));
	    }else if($proid != -1 && $result == -100){
		$sqlr = pg_query_params($sqlc,$sqlstr.'WHERE "proid"=$1 AND "result"<>100 ORDER BY "submitid" DESC LIMIT 1;',
		    array($proid));
	    }else{
		$sqlr = pg_query($sqlc,$sqlstr.'ORDER BY "submitid" DESC LIMIT 1;');
	    }
	}

	while($submito = pg_fetch_object($sqlr)){
	    $submitlist[] = array(
		'submitid' => $submito->submitid,
		'proid' => $submito->proid,
		'userid' => $submito->userid,
		'status' => $submito->status,
		'score' => $submito->score,
		'maxscore' => $submito->maxscore,
		'runtime' => $submito->runtime,
		'peakmem' => $submito->peakmem,
		'timestamp' => $submito->timestamp,
		'result' => $submito->result,
		'sumscore' => $submito->sumscore,
		'summaxscore' => $submito->summaxscore,
		'sumruntime' => $submito->sumruntime);
	    $useridlist[$submito->userid] = '';
	}
	pg_free_result($sqlr);
    }else{
	$submitlist[] = null;
    }

    $sqlr = pg_query($sqlc,'SELECT "userid","nickname" FROM "user" WHERE "userid" IN ('.implode(',',array_keys($useridlist)).');');

    while($sqlo = pg_fetch_object($sqlr)){
	$useridlist[$sqlo->userid] = $sqlo->nickname;
    }
    pg_free_result($sqlr);

    for($idx = 0;$idx < count($submitlist);$idx++){
	if($submitlist[$idx] != null){
	    $submitlist[$idx]['nickname'] = $useridlist[$submitlist[$idx]['userid']];
	}
    }

    if($useronly == true){
	$sqlr = pg_query_params('SELECT COUNT(*) FROM "submit" WHERE "userid"=$1;',
		array($userid));
    }else if($proid != -1 && $result != -100){
	$sqlr = pg_query_params('SELECT COUNT(*) FROM "submit" WHERE "proid"=$1 AND "result"=$2;',
		array($proid,$result));
    }else if($proid != -1 && $result == -100){
	$sqlr = pg_query_params('SELECT COUNT(*) FROM "submit" WHERE "proid"=$1 AND "result"<>100;',
		array($proid));
    }else{
	$sqlr = pg_query('SELECT COUNT(*) FROM "submit";');
    }
    $submitcount = pg_fetch_row($sqlr)[0];
    pg_free_result($sqlr);

    return array(
	'submitcount' => $submitcount,
	'submitlist' => $submitlist
    );
}
?>
