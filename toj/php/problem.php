<?php
ini_set("display_errors", "On");
error_reporting(E_ALL & ~E_NOTICE);

require_once('problem.inc.php');
require_once('user.inc.php');

$sqlc = db_connect();

$action = $_POST['action'];
$data = $_POST['data'];

if(strlen($action)==0)
    die('Eno_action');
if($action == 'get_pro')
{
    //get problem data: proid, modid, name, pmodname, smodname, jmodname
    //only USER_LEVEL_SUPERADMIN or is_available 
    //data : proid

    $dt = json_decode($data);

    $proid = intval($dt->proid);
    
    $ret = problem::get($sqlc, $proid);
    if(!$ret)
	die('Eget_problem');

    if(!problem::is_available($sqlc, $proid))
	die('Epermission_denied');

    unset($ret->proid);
    //unset($ret->hidden);

    echo(json_encode($ret));    
}
if($action == 'add_pro')
{
    //Add problem
    //need SUPERADMIN
    //data: modid, proname, [hidden]
    if(!sec_is_login())
	die('Enot_login');
    if(!sec_check_level($sqlc, USER_PER_PROCREATOR))
	die('Epermission_denied');

    $dt = json_decode($data);
    
    if(strlen($dt->proname) == 0)
	die('Eproname_too_short');
    if(strlen($dt->proname) > PRONAME_LEN_MAX)
	die('Eproname_too_long');

    if(!problem::getmod($sqlc, $dt->modid))
	die('Ewrong_modid');    

    if($dt->hidden != 't' && $dt->hidden != 'f')
	die('Ewrong_hidden_value');

    /*CHECK OTHER DATA, TESTDATA ETC*/

    $dt->admin_uid = intval($_COOKIE['uid']);

    $pro = problem::add($sqlc, $dt);
    if(!$pro)
	die('Eadd_problem');    

    echo(json_encode($pro));
}
if($action == 'submit_code')
{
    //Submit code
    //Need problem available
    //data: proid, lang, code
    if(!sec_is_login())
	die('Enot_login');

    $uid = intval($_COOKIE['uid']);
    $dt = json_decode($data);

    $proid = intval($dt->proid);
    
    if(!problem::is_available($sqlc, $proid)){
	die('Epermission_denied');
    }

    $obj = problem::get($sqlc, $proid);
    $lang = intval($dt->lang);
    $oklang = problem::mod_get_lang($sqlc, $obj->modid);
    if($LANGUAGE[$lang] == null || (($lang & $oklang) == 0))
	die('Ewrong_language');

    if(strlen($dt->code) < CODE_LEN_MIN)
	die('Ecode_too_short');
    if(strlen($dt->code) > CODE_LEN_MAX)
	die('Ecode_too_long');

    //if(problem::recent_submit($sqlc, $uid, SUBMIT_MIN_INTERVAL) > 0)
    //	die('Esubmit_too_frequently');

    $subid = problem::submit($sqlc, $proid, $uid, $lang, $dt->code);
    if(!$subid)
	die('Esubmit_code_failed');

    /*ASSOCIATED SQUARE : CALL SQUARE MODULE TO GET EXTRA JUDGE OPTION*/

    if(!problem::send_socket($subid, $proid))
	die('Esend_socket_failed');

    echo(json_encode($subid));
}
if($action == 'get_pro_stat')
{
    //Get score and is_ac for specified proid.
    //Need login and problem available.
    //data : proid

    if(!sec_is_login())
	die('Enot_login');

    $uid = intval($_COOKIE['uid']);
    $dt = json_decode($data);

    $proid = intval($dt->proid);
    
    if(!problem::is_available($sqlc, $proid)){
	die('Epermission_denied');
    }

    $ret = problem::get_pro_stat($sqlc, $proid, $uid);
    if(!$ret)
	die('Eerror_get_pro_stat');
    
    echo(json_encode($ret));
}

db_close($sqlc);


?>
