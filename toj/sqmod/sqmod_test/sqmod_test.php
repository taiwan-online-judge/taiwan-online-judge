<?php
//ini_set("display_errors", "On");

require_once('../../php/common.inc.php');
require_once('../../php/user.inc.php');
require_once('sqmod_test.inc.php');
require_once('team.inc.php');
require_once('../../php/sqlib_scoreboard.inc.php');

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
    if(square::get_user_relationship($sqlc, $uid, $sqid) != SQUARE_USER_ACTIVE)
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
    if(square::get_user_relationship($sqlc, $uid, $sqid) != SQUARE_USER_ACTIVE)
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

db_close($sqlc);
db_close($msqlc);

?>
