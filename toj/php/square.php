<?php
//ini_set("display_errors", "On");

require_once('square.inc.php');

$sqlc = db_connect();

$action = $_POST['action'];
$data = $_POST['data'];

if(strlen($action)==0)
    die('Eno_action');
if($action == 'add_sq')
{
    //Add new square. level USER_LEVEL_SUPERADMIN or above required.
    //data: sqname, publicity, [start_time, end_time], sqmodname

    $sq = json_decode($data);

    if(!sec_is_login())
	die('Eno_login');
    if(!sec_check_level($sqlc, USER_LEVEL_SUPERADMIN))
	die('Epermission_denied');

    if($sq->publicity != SQUARE_PUBLIC && $sq->publicity != SQUARE_AUTH && $sq->publicity != SQUARE_PRIVATE)
	die('Ewrong_publicity');

    if(!($sq->start_time))
	$sq->start_time = date('Y-m-d H:i:s');
    if(!($sq->end_time))
	$sq->start_time = null;
    if(strlen($sq->sqname)==0)
	die('Esqname_too_short');
    if(strlen($sq->sqname)>SQUARE_NAME_LEN_MAX)
	die('Esqname_too_long');
    if(strlen($sq->sqmodname)==0)
	die('Esqmodname_empty');
    
    $res = square::add($sqlc, $sq);
    if(!$res)
	die('Eadd_sq_failed');

    $res2 = square::add_user($sqlc, $_COOKIE['uid'], $res->sqid, SQUARE_USER_ADMIN);
    if(!$res2)
	die('Eadd_admin_failed');

    echo('S');
}
if($action == 'delete_sq')
{
    //Delete exist square. level USER_LEVEL_SUPERADMIN or above required.
    //data : sqid

    $sq = json_decode($data);

    if(!sec_is_login())
	die('Eno_login');
    if(!sec_check_level($sqlc, USER_LEVEL_SUPERADMIN))
	die('Epermission_denied');

    $sqid = intval($sq->sqid);
    if(!square::get($sqlc, $sqid))
	die('Eno_such_sq');

    $res = square::del($sqlc, $sqid);
    if(!$res)
	die('Edelete_failed');

    echo('S');
}
if($action == 'edit_sq')
{
    //edit exist square. level USER_LEVEL_SUPERADMIN / SQUARE_USER_ADMIN or above required.
    //data: sqid, sqname, publicity, [start_time, end_time], sqmodname

    $sq = json_decode($data);

    if(!sec_is_login())
	die('Eno_login');

    $sqid = intval($sq->sqid);
    if(!square::get($sqlc, $sqid))
	die('Eno_such_sq');

    if(!sec_check_level($sqlc, USER_LEVEL_SUPERADMIN) && !(square::get_user_relationship($sqlc, $_COOKIE['uid'], $sqid)>=SQUARE_USER_ADMIN))
	die('Epermission_denied');

    if($sq->publicity != SQUARE_PUBLIC && $sq->publicity != SQUARE_AUTH && $sq->publicity != SQUARE_PRIVATE)
	die('Ewrong_publicity');

    if(!($sq->start_time) && $sq->end_time)
	$sq->start_time = date('Y-m-d H:i:s');
    if(strlen($sq->sqname)==0)
	die('Esqname_too_short');
    if(strlen($sq->sqname)>SQUARE_NAME_LEN_MAX)
	die('Esqname_too_long');
    if(strlen($sq->sqmodname)==0)
	die('Esqmodname_empty');

    $res = square::edit($sqlc, $sqid, $sq);
    if(!$res)
	die('Eedit_failed');

    echo('S');
}
if($action == 'get_sq')
{   
    //get exist square data
    //data: sqid
    $sq = json_decode($data);

    $sqid = intval($sq->sqid);

    $ret = square::get($sqlc, $sqid);
    if(!$ret)
	die('Eno_such_sq');

    echo(json_encode($ret));
}
if($action == 'add_user')
{
    //add user to exist square
    //data: uid, sqid
    $dt = json_decode($data);

    if(!sec_is_login())
	die('Eno_login');

    $uid = intval($dt->uid);
    $sqid = intval($dt->sqid);

    $usr = user::get_from_uid($sqlc, $uid);
    if(!$usr)
	die('Eno_such_user');

    $sq = square::get($sqlc, $sqid);
    if(!$sq)
	die('Eno_such_sq');

    $adm = sec_check_level($sqlc, USER_LEVEL_SUPERADMIN) || (square::get_user_relationship($sqlc, $_COOKIE['uid'], $sqid)>=SQUARE_USER_ADMIN);

    if($uid != intval($_COOKIE['uid']) && !$adm)
	die('Epermission_denied');

    $rela = SQUARE_USER_ACTIVE;
    if(!$adm)
    {
	if($sq->publicity == SQUARE_AUTH)
	    $rela = SQUARE_USER_PENDING;
	if($sq->publicity == SQUARE_PRIVATE)
	    die('Eprivate_square');
    }

    if(square::get_user_relationship($sqlc, $uid, $sqid))
	die('Ealready_entered');

    $ret = square::add_user($sqlc, $uid, $sqid, $rela);
    if(!$ret)
	die('Eadd_user_failed');

    echo('S');
}
if($action == 'delete_user')
{
    //delete user from user-square relation
    //data : uid, sqid 
    $dt = json_decode($data);

    if(!sec_is_login())
	die('Eno_login');

    $uid = intval($dt->uid);
    $sqid = intval($dt->sqid);

    $usr = user::get_from_uid($sqlc, $uid);
    if(!$usr)
	die('Eno_such_user');

    $sq = square::get($sqlc, $sqid);
    if(!$sq)
	die('Eno_such_sq');

    $adm = sec_check_level($sqlc, USER_LEVEL_SUPERADMIN) || (square::get_user_relationship($sqlc, $_COOKIE['uid'], $sqid)>=SQUARE_USER_ADMIN);

    if($uid != intval($_COOKIE['uid']) && !$adm)
	die('Epermission_denied');

    if(!square::get_user_relationship($sqlc, $uid, $sqid))
	die('Enot_entered');

    $ret = square::del_user($sqlc, $uid, $sqid);
    if(!$ret)
	die('Edelete_user_failed');

    echo('S');
}
if($action == 'edit_user_relationship')
{
    //edit user relationship.
    //data: uid, sqid, relationship
    $dt = json_decode($data);

    if(!sec_is_login())
	die('Eno_login');

    $uid = intval($dt->uid);
    $sqid = intval($dt->sqid);
    $rel = intval($dt->relationship);

    $usr = user::get_from_uid($sqlc, $uid);
    if(!$usr)
	die('Eno_such_user');

    $sq = square::get($sqlc, $sqid);
    if(!$sq)
	die('Eno_such_sq');

    $adm = sec_check_level($sqlc, USER_LEVEL_SUPERADMIN) || (square::get_user_relationship($sqlc, $_COOKIE['uid'], $sqid)>=SQUARE_USER_ADMIN);

    if(!$adm)
	die('Epermission_denied');

    if(!square::get_user_relationship($sqlc, $uid, $sqid))
	die('Enot_entered');

    if($rel!=SQUARE_USER_PENDING && $rel!=SQUARE_USER_ACTIVE && $rel!=SQUARE_USER_ADMIN)
die('Ewrong_relationship');

    $ret = square::set_user_relationship($sqlc, $uid, $sqid, $rel);
    if(!$ret)
	die('Eedit_user_relationship_failed');

    echo('S');
}
if($action == 'get_available_sq')
{
    //get all available square data: sqid, start_time, end_time, publicity, sqname for given uid.
    //only USER_LEVEL_SUPERADMIN can see SQUARE_PRIVATE squares.
    //data: (no)

    if(!sec_is_login())
	die('Eno_login');

    $uid = intval($_COOKIE['uid']);

    $usr = user::get_from_uid($sqlc, $uid);
    if(!$usr)
	die('Eno_such_user');

    $adm = sec_check_level($sqlc, USER_LEVEL_SUPERADMIN);

    $pub = 2;
    if($adm)
	$pub = 1;

    $list = square::get_available_sq($sqlc, $uid, $pub);
    
    $ret->list = $list;
    $ret->timestamp = date('Y-m-d H:i:s');

    echo(json_encode($ret));    
}
if($action == 'get_entered_sq')
{

    //get all entered square data: sqid, start_time, end_time, publicity, sqname, relationship for given uid.
    //data: (no)

    if(!sec_is_login())
	die('Eno_login');

    $uid = intval($_COOKIE['uid']);

    $usr = user::get_from_uid($sqlc, $uid);
    if(!$usr)
	die('Eno_such_user');

    $list = square::get_entered_sq($sqlc, $uid);
    
    $ret->list = $list;
    $ret->timestamp = date('Y-m-d H:i:s');

    echo(json_encode($ret));   
}
if($action == 'add_pro_into_sq')
{
    if(!sec_is_login())
	die('Eno_login');

    $uid = intval($_COOKIE['uid']);

    $usr = user::get_from_uid($sqlc, $uid);
    if(!$usr)
	die('Eno_such_user');

    $dt = json_decode($data);
    if(!problem::is_available($sqlc, $dt->proid))
	die('Ewrong_proid');

    if(!square::get($sqlc, $dt->sqid))
	die('Ewrong_sqid');

    $adm = sec_check_level($sqlc, USER_LEVEL_SUPERADMIN) || square::get_user_relationship($sqlc, $uid, $dt->sqid) >= SQUARE_USER_ADMIN;

    if(!$adm)
	die('Enot_square_admin');

    if(square::is_pro_in_sq($sqlc, $dt->proid, $dt->sqid))
	die('Ealready_in_square');

    $ret = square::add_pro($sqlc, $dt->proid, $dt->sqid);
    if(!$ret)
	die('Eadd_problem_into_square_failed');

    echo('S');
}
if($action == 'delete_pro_from_sq')
{
    if(!sec_is_login())
	die('Eno_login');

    $uid = intval($_COOKIE['uid']);

    $usr = user::get_from_uid($sqlc, $uid);
    if(!$usr)
	die('Eno_such_user');

    $dt = json_decode($data);

    if(!square::get($sqlc, $dt->sqid))
	die('Ewrong_sqid');

    $adm = sec_check_level($sqlc, USER_LEVEL_SUPERADMIN) || square::get_user_relationship($sqlc, $uid, $dt->sqid) >= SQUARE_USER_ADMIN;

    if(!$adm)
	die('Enot_square_admin');

    if(!square::is_pro_in_sq($sqlc, $dt->proid, $dt->sqid))
	die('Enot_in_square');

    $ret = square::del_pro($sqlc, $dt->proid, $dt->sqid);
    if(!$ret)
	die('Edelete_problem_from_square_failed');

    echo('S');
}

db_close($sqlc);

?>
