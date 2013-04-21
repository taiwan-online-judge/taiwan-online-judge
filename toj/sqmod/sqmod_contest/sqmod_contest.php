<?php
//ini_set("display_errors", "On");

require_once('common.inc.php');
require_once('user.inc.php');
require_once('square.inc.php');
require_once('sqmod_contest.inc.php');
require_once('team.inc.php');
require_once('sqlib_scoreboard.inc.php');

$sqlc = db_connect();
$msqlc = db_connect('toj_mod');

$action = $_POST['action'];
$data = $_POST['data'];

if(strlen($action)==0)
    die('Eno_action');
if($action == 'get_prolist')
{
    $dt = json_decode($data);
    $sqid = intval($dt->sqid);
    if(square::get_sqmod($sqlc, $sqid) != SQMODNAME)
	die('Eerror_sqid_this_mod');
    if(!sec_is_login())
	die('Enot_login');
    $uid = intval($_COOKIE['uid']);
    if(square::get_user_relationship($sqlc, $uid, $sqid) < SQUARE_USER_ACTIVE)
	die('Ecannot_view_sq');
    
    $list = square::get_pro_list($sqlc, $sqid);
    if(!$list)
	die('Eno_problem');
    $data = get_setting($sqid);
    $nlist = process_pro_list($list, $data, $sqid);
    echo(json_encode($nlist));
}
if($action == 'get_user_stat')
{
    $dt = json_decode($data);
    $sqid = intval($dt->sqid);
    $display_team = $dt->display_team;
    if(square::get_sqmod($sqlc, $sqid) != SQMODNAME)
	die('Eerror_sqid_this_mod');
    if(!sec_is_login())
	die('Enot_login');
    $uid = intval($_COOKIE['uid']);
    if(square::get_user_relationship($sqlc, $uid, $sqid) < SQUARE_USER_ACTIVE)
	die('Ecannot_view_sq');

    $data = get_setting($sqid);

    $ret = new stdClass();
    $prostat = get_pro_stat_uid($sqlc, $msqlc, $sqid, SCOREBOARD_ID_PROBSTAT, $uid);
    $tmpstat = process_pro_stat($prostat);
    $ret->prostat = calc_score($tmpstat, $data, $sqid);
    $ret->base_line = get_base_line($data, $sqid, false);

    if($display_team)
    {
	$term = get_term($data, $sqid);
	$teamid = intval(get_teamid($msqlc, $term, $uid));
	if($teamid)
	{
	    $ret->team_base_line = get_base_line($data, $sqid, true);
	    $members = get_team_member($msqlc, $term, $teamid);
	    $arr = array();
	    foreach($members as $mem)
	    {
		if($mem->uid == $uid)continue;
		$tmpstat = process_pro_stat(get_pro_stat_uid($sqlc, $msqlc, $sqid, SCOREBOARD_ID_PROBSTAT, $mem->uid));
		$mem->prostat = calc_score($tmpstat, $data, $sqid);
		array_push($arr, $mem);
	    }
	    $ret->team = $arr;
	    $ret->teamid = $teamid;
	}
    }
    echo(json_encode($ret));
}
if($action == 'get_scoreboard'){
    $dt = json_decode($data);
    $sqid = intval($dt->sqid);

    $sqo = square::get($sqlc, $sqid);
    if($sqo == NULL || $sqo->sqmodname != SQMODNAME)
	die('Eerror_sq_error');
    if(!sec_is_login())
	die('Enot_login');
    $uid = intval($_COOKIE['uid']);
    if(square::get_user_relationship($sqlc, $uid, $sqid) < SQUARE_USER_ACTIVE)
	die('Ecannot_view_sq');

    $list = get_scoreboard($sqlc, $msqlc, $sqid, SCOREBOARD_ID_SCOREBOARD);
    $user_map = array();
    for($idx = 0;$idx < count($list);$idx++){
	$list[$idx]->nickname = user::get_nickname($sqlc, $list[$idx]->uid);
	$user_map[$list[$idx]->uid] = true;
    }

    $user_list = square::get_user_list($sqlc, $sqid);
    for($idx = 0;$idx < count($user_list);$idx++){
	if(!array_key_exists($user_list[$idx]->uid,$user_map)){
	    array_push($list,array(
		'uid' => $user_list[$idx]->uid,
		'nickname' => $user_list[$idx]->nickname,
		'rank' => -1,
		'rank_score' => 0,
		'problem' => []
	    ));
	}
    }

    echo(json_encode(array(
	'start_time' => $sqo->start_time,
	'list' => $list
    )));
}

db_close($sqlc);
db_close($msqlc);

?>
