<?php
//ini_set("display_errors", "On");
//error_reporting(E_ALL & ~E_NOTICE);

require_once('notice.inc.php');

/* usage:
 * action count(uid): update notice count of uid, return value: integer
 * action get(uid): update notice of uid, return notice data limited to notice count,
 *   and clear notice count. format: object array, see table "notice"
 * action clear(uid, [limit]): clear cache number to notice_count+limit, 
 *   does not affect notice, only user cache. return remain number as int.
 * action add(type, value, context): add a notice, need admin permission now.
 *   **attention**: this is only for web, use notice::add with your own code, 
 *     that function does not require any user permission.
 *   type is an integer, see "notice.inc.php" NOTICE_TYP_*.
 *   value are paired with type, like proid, sqid, uid, .., meaning nothing
 *     with NOTICE_TYP_ALL, but cannot be NULL.
 *   context is what you want. treat as string data so its format
 *     depends on your own.
 *   return 'S' when success.
 */

$sqlc = db_connect();
$action = $_POST['action'];
$data = json_decode($_POST['data']);

if(strlen($action) == 0)
{
    die('Eno_action');
}
if(!sec_is_login())
{
    die('Eno_login');
}
$uid = intval($_COOKIE['uid']);
$usr = user::get_from_uid($sqlc, $uid);
if(!$usr)
{
    die('Eno_such_user');
}

if($action == 'count')
{
    $cnt = notice::get($sqlc, $uid, NOTICE_ACT_CNT);
    echo $cnt;
}
else if($action == 'get')
{
    $nid = intval($data->nid);
    if($nid > 0)
    {
	$cnt = intval($data->count);
	$res = notice::get($sqlc, $uid, NOTICE_ACT_OLD, $nid, $cnt);
	if($res === false)
	{
	    die('Eno_such_nid');
	}
	echo json_encode($res);
    }
    else
    {
	$res = notice::get($sqlc, $uid, NOTICE_ACT_NEW);
	echo json_encode($res);
    }
}
else if($action == 'clear')
{
    $lim = NOTICE_DEF_LIM;
    if(isset($data->limit))
    {
	$lim = intval($data->limit);
    }
    if($lim > NOTICE_MAX_LIM)
    {
	$lim = NOTICE_MAX_LIM;
    }
    $ret = notice::clr($sqlc, $uid, $lim);
    echo $ret;
}
else if($action == 'add')
{
    if(!sec_check_level($sqlc, USER_LEVEL_SUPERADMIN) && $uid != 111)
    //if(!sec_check_level($sqlc, USER_LEVEL_SUPERADMIN))
    {
	die('Epermission_denied');
    }
    if(!isset($data->type))
    {
	die('Etype_is_empty');
    }
    if(!isset($data->value))
    {
	die('Evalue_is_empty');
    }
    if(!isset($data->context))
    {
	die('Econtext_is_empty');
    }
    $res = notice::add($sqlc, $data->type, $data->value, $data->context);
    if(!$res)
    {
	die('Efail');
    }
    echo 'S';
}

db_close($sqlc);

?>
