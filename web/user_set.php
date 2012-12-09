<?php
require_once('common.php');

$userid = $_COOKIE['userid'];
$usersec = $_COOKIE['usersec'];
$type = $_POST['type'];

if(!sec_checkuser($userid,$usersec)){
    exit('Euser');
}
$userid = pg_escape_string($userid);

$sqlc = pg_connect('host=localhost port=5432 dbname='.DB_NAME.' user='.DB_USER.' password='.DB_PASSWORD);

if($type == 'userinfo'){
    $nickname = $_POST['nickname'];
    $aboutme = $_POST['aboutme'];
    $headimg = $_POST['headimg'];

    if($nickname == '' || strlen($nickname) > 16 || $nickname != pg_escape_string($nickname)){
	exit('Enickname');
    }
    if(strlen($aboutme) > 4096){
	exit('Eaboutme');
    }
    if($headimg == '' || strlen($headimg) > 4096){
	exit('Eheadimg');
    }

    $sqlr = pg_query_params($sqlc,'UPDATE "user" SET "nickname"=$1,"aboutme"=$2,"headimg"=$3 WHERE "userid"=$4;',
	array($nickname,$aboutme,$headimg,$userid));

    pg_free_result($sqlr);
}else if($type == 'squareadd'){
    $squareid = $_POST['squareid'];

    if($squareid == '' || strval(intval($squareid)) != $squareid){
	exit('Eerror');
    }

    $squareid = pg_escape_string($squareid);
    $sqlr = pg_query_params($sqlc,'SELECT "squareid" FROM "square" WHERE "squareid"=$1 LIMIT 1',
	array($squareid));

    if(pg_num_rows($sqlr) == 0){
	exit('Eerror');
	pg_free_result($sqlr);
    }
    pg_free_result($sqlr);

    $sqlr = pg_query_params($sqlc,'SELECT array_to_string("squarelist",\',\') AS "squarelist" FROM "user" WHERE "userid"=$1 LIMIT 1;',
	array($userid));

    if(($sqlo = pg_fetch_object($sqlr)) == null){
	pg_free_result($sqlr);
	exit('Eerror');
    }
    $squarelist = explode(',',$sqlo->squarelist);
    pg_free_result($sqlr);

    for($idx = 0;$idx < count($squarelist);$idx++){
	if($squarelist[$idx] == $squareid){
	    exit('Eerror');
	}
    }
    $squarelist[] = $squareid;

    $sqlr = pg_query_params($sqlc,'UPDATE "user" SET "squarelist"=\'{'.implode(',',$squarelist).'}\' WHERE "userid"=$1;',
	array($userid));

    pg_free_result($sqlr);
}else if($type == 'squareremove'){
    $squareid = $_POST['squareid'];

    if($squareid == '' || strval(intval($squareid)) != $squareid){
	exit('Eerror');
    }
    if($squareid == '1'){
	exit('Ecant');
    }

    $sqlr = pg_query_params($sqlc,'SELECT array_to_string("squarelist",\',\') AS "squarelist" FROM "user" WHERE "userid"=$1 LIMIT 1;',
	array($userid));

    if(($sqlo = pg_fetch_object($sqlr)) == null){
	pg_free_result($sqlr);
	exit('Eerror');
    }
    $squarelist = explode(',',$sqlo->squarelist);
    pg_free_result($sqlr);

    for($idx = 0;$idx < count($squarelist);$idx++){
	if($squarelist[$idx] == $squareid){
	    array_splice($squarelist,$idx,1);
	    break;
	}
    }

    $sqlr = pg_query_params($sqlc,'UPDATE "user" SET "squarelist"=\'{'.implode(',',$squarelist).'}\' WHERE "userid"=$1;',
	array($userid));

    pg_free_result($sqlr);
}else{
    exit('Eerror');
}

pg_close($sqlc);
echo 'S';
?>
