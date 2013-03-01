<?php
    require_once('notice.inc.php');

    function center_result_event($uid,$msg){
	$db = db_connect();
	notice::add($db,NOTICE_TYP_USR,$uid,json_encode($msg));
	db_close($db);
    }
?>
