<?php
ini_set("display_errors", "On");
error_reporting(E_ALL & ~E_NOTICE);

require_once('status.inc.php');

$sqlc = db_connect();

$action = $_POST['action'];
$data = $_POST['data'];

if(strlen($action)==0)
    die('Eno_action');
if($action == 'get_submit')
{
    //get submit from submit table
    //data: sort, sort->subid, count, [wait, filter, last_update]
    $dt = json_decode($data);
    if($dt->sort->subid == null)
	die('Eno_sort_subid');
    if($dt->count == null)
	die('Eno_count');
    $cnt = intval($dt->count);
    if($cnt <= 0)
	die('Etoo_few_count');
    if($cnt > SUBMIT_COUNT_MAX)
	die('Etoo_many_count');
    
    $wait = intval($dt->wait);
    if($wait > SUBMIT_WAIT_MAX)
	die('Etoo_many_wait');

    $nowwait = $wait;
    $isadm = sec_check_level($sqlc, USER_PER_PROADMIN);

    while(1)
    {
	$ret = status::get_submit($sqlc, $dt->filter, $dt->sort, $cnt, $dt->last_update, $isadm);
	if($ret != null)
	{
	    /* OUTPUT */
	    echo(json_encode($ret));
	    exit(0);
	}
	//die('Efail');
	$nowwait--;
	if($nowwait<0)break;
	sleep(SUBMIT_SLEEP_TIME);
    }
    die('Eno_result');
}
if($action == 'get_by_subid')
{
    //get submission data and smodname by subid.
    //problem must be available for the user.
    //data: subid
    $dt = json_decode($data);
    $subid = intval($dt->subid);
    if(!$subid)
	die('Eno_subid');
    $obj = status::get_by_subid($sqlc, $subid);

    if(!problem::is_available($sqlc, $obj->proid))
	die('Epermission_denied');

    echo(json_encode($obj));
}
if($action == 'get_submit_data')
{
    //get submission data : code or something
    //data: subid

    if(!sec_is_login())
	die('Enot_login');

    $dt = json_decode($data);
    $subid = intval($dt->subid);
    if(!$subid)
	die('Eno_subid');

    $sub = status::get_by_subid($sqlc, $subid);
    if(!$sub)
	die('Ewrong_subid');

    if(!sec_check_level($sqlc, USER_LEVEL_SUPERADMIN) && ($sub->uid != intval($_COOKIE['uid'])))
	die('Epermission_denied');

    $ret = status::get_submit_data($subid);
    if(!$ret)
	die('Eerror_get_submit_data');

    echo(json_encode($ret));
}

db_close($sqlc);
?>
