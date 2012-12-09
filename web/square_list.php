<?php
require_once('common.php');

function square_list($sqlc,$paramo){
    $userid = $_COOKIE['userid'];
    $usersec = $_COOKIE['usersec'];
    if(!sec_checkuser($userid,$usersec)){
	return null;
    }

    $userid = pg_escape_string($userid);
    $sqlr = pg_query_params($sqlc,'SELECT array_to_string("squarelist",\',\') AS "squarelist" FROM "user" WHERE "userid"=$1 LIMIT 1;',
	array($userid));

    if(($sqlo = pg_fetch_object($sqlr)) == null){
	pg_free_result($sqlr);
	return null;
    }
    $squarelist = $sqlo->squarelist;
    pg_free_result($sqlr);

    $sqlr = pg_query($sqlc,'SELECT *,array_to_string("flag",\',\') AS "flag","starttime"<=now() AS "start","endtime"<=now() AS "end" FROM "square" WHERE "squareid" IN ('.$squarelist.') ORDER BY "squareid" ASC;');
    $inlist = array();
    while($squareo = pg_fetch_object($sqlr)){
	if($squareo->end == 't'){
	    $status = 'inactive';
	}else if($squareo->start == 't'){
	    $status = 'active';
	}else{
	    $status = 'upcoming';
	}
	$flaglist = explode(',',$squareo->flag);
	$flag = array();
	for($idx = 0;$idx < count($flaglist);$idx++){
	    $flag[$flaglist[$idx]] = true;
	}

	$inlist[] = array(
	    'squareid' => $squareo->squareid,
	    'squarename' => $squareo->squarename,
	    'starttime' => $squareo->starttime,
	    'endtime' => $squareo->endtime,
	    'status' => $status,
	    'flag' => $flag
	);
    }
    pg_free_result($sqlr);

    $sqlr = pg_query($sqlc,'SELECT *,array_to_string("flag",\',\') AS "flag","starttime"<=now() AS "start","endtime"<=now() AS "end" FROM "square" WHERE "squareid" NOT IN ('.$squarelist.') ORDER BY "squareid" ASC;');
    $outlist = array();
    while($squareo = pg_fetch_object($sqlr)){
	if($squareo->end == 't'){
	    $status = 'inactive';
	}else if($squareo->start == 't'){
	    $status = 'active';
	}else{
	    $status = 'upcoming';
	}
	$flaglist = explode(',',$squareo->flag);
	$flag = array();
	for($idx = 0;$idx < count($flaglist);$idx++){
	    $flag[$flaglist[$idx]] = true;
	}

	$outlist[] = array(
	    'squareid' => $squareo->squareid,
	    'squarename' => $squareo->squarename,
	    'starttime' => $squareo->starttime,
	    'endtime' => $squareo->endtime,
	    'status' => $status,
	    'flag' => $flag
	);
    }
    pg_free_result($sqlr);

    return array(
	'inlist' => $inlist,
	'outlist' => $outlist
    );
}
?>
