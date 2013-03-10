<?php
require_once('common.inc.php');
require_once('user.inc.php');
require_once('square.inc.php');

const PRONAME_LEN_MAX = 100;

const CODE_LEN_MIN = 1;
const CODE_LEN_MAX = 102400;

const SUBMIT_MIN_INTERVAL = 10;

$LANGUAGE = array(0x1=>'C/C++', 0x2=>'JAVA', 0x4=>'Pascal');
$EXTENSION = array(0x1=>'cpp', 0x2=>'java', 0x4=>'pas');

class problem
{
    public $proid;
    public $modid;
    public $proname;
    public $hidden;

    public static function getmod($sqlc, $modid)
    {
	//return pmodname, smodname, jmodname for specified $modid.
	//False if not found.
	$result = pg_query_params($sqlc, 'SELECT * FROM "mod" WHERE "modid"=$1 LIMIT 1;', array($modid));
	$mret = pg_fetch_object($result);
	pg_free_result($result);
	if(!$mret)
	    return false;
	return $mret;
    }
    public static function get($sqlc, $proid)
    {
	//return problem data: proid, modid, proname, pmodname, smodname, jmodname
	//False if not found.
	$result = pg_query_params($sqlc, 'SELECT * FROM "problem" WHERE "proid"=$1 LIMIT 1;', array(intval($proid))) or die ("Eerror_get_problem");
	$ret = pg_fetch_object($result, null, 'problem');
	pg_free_result($result);
	if(!$ret)
	    return false;
	
	$ret->proid = intval($ret->proid);
	$ret->modid = intval($ret->modid);
	$ret->admin_uid = intval($ret->admin_uid);

	$mret = problem::getmod($sqlc, $ret->modid);
	if(!$mret)
	    return false;

	$ret->pmodname = $mret->pmodname;
	$ret->smodname = $mret->smodname;
	$ret->jmodname = $mret->jmodname;
	
	return $ret;	
    }
    
    public static function is_available($sqlc, $proid, $uid = null)
    {
	//return whether the problem is available for user $_COOKIE['uid'] or not.
	//USER_PER_PROADMIN always OK
	//admin of problem always OK
	//if HIDDEN , then NOT OK except admins
	//in sqid=1 always OK , even if not login
	//otherwise must exist at least one common square with relationship >= SQUARE_USER_ACTIVE
	$uidnull = false;
	if($uid == null)
	{
	    $uid = intval($_COOKIE['uid']);
	    $uidnull = true;
	}
	$sqlr = pg_query_params('SELECT "hidden", "admin_uid" FROM "problem" WHERE "proid"=$1;', array($proid));
	$obj = pg_fetch_object($sqlr);
	$hdn = $obj->hidden;
	if($hdn == null)
	    return false; // no such problem	

	if(sec_check_level($sqlc, USER_PER_PROADMIN, $uidnull?null:$uid))
	    return true;

	if((!$uidnull || sec_is_login()) && $uid == intval($obj->admin_uid))
	    return true;

	if($hdn == "t")
	    return false;

	$sqlstr = 'SELECT COUNT(*) FROM "pro_sq" WHERE "proid"=$1 AND "sqid"=$2;';
	$sqlarr = array($proid, 1);
	$sqlr = pg_query_params($sqlstr, $sqlarr);
	$ret = intval(pg_fetch_result($sqlr, 0));
	if($ret > 0)
	    return true;

	if($uidnull && !sec_is_login())
	    return false;

	$sqlstr = 'SELECT COUNT("pro_sq"."sqid") FROM "pro_sq" INNER JOIN "us_sq" ON "pro_sq"."sqid"="us_sq"."sqid" WHERE "pro_sq"."proid"=$1 AND "us_sq"."uid"=$2 AND "us_sq"."relationship">=$3;';
	$sqlarr = array($proid, $uid, SQUARE_USER_ACTIVE);
	$sqlr = pg_query_params($sqlstr, $sqlarr);
	$ret = intval(pg_fetch_result($sqlr, 0));
	if($ret > 0)
	    return true;

	return false;
    }

    public static function submit($sqlc, $proid, $uid, $lang, $code)
    {
	//Submit code(or data) : $proid, $uid, $lang, $code
	//Return subid. False if failed.

	////$submit_time = date('Y-m-d H:i:s');
	////$last_update = $submit_time;
	$sqlstr = 'INSERT INTO "submit" ("proid", "uid", "lang") VALUES ($1, $2, $3) RETURNING subid;';
	$sqlarr = array($proid, $uid, $lang);
	$sqlr = pg_query_params($sqlstr, $sqlarr);
	$subid = intval(pg_fetch_result($sqlr, 0));
	if(!$subid)
	    return false;
	
	global $EXTENSION;
	$ext = $EXTENSION[intval($lang)];
	if($ext == null)
	    die('Ewrong_extension');

	$parnum = $subid - ($subid%1000);
	$pardir = '../center/submit/'.$parnum.'/';
	if(!is_dir($pardir))
	    mkdir($pardir, 0755) or die('Ecannot_mkdir');
	mkdir($pardir.$subid, 0755) or die('Ecannot_mkdir');	
	mkdir($pardir.$subid.'/data', 0755) or die('Ecannot_mkdir');
	mkdir($pardir.$subid.'/result', 0755) or die('Ecannot_mkdir');
	chmod($pardir.$subid.'/result', 0775) or die('Ecannot_chmod');

	//$file = fopen($pardir.$subid.'/data/'.$subid.'.'.$ext,'w');
	//20130205 tmp change
	$file = fopen($pardir.$subid.'/data/main.'.$ext,'w');
	if(!$file)
	    die('Ewrite_file_failed');
	fwrite($file, $code);
	fclose($file);

	return $subid;
    }

    public static function add($sqlc, $pro)
    {
	//Add a new problem $pro into problem table.
	//Return the inserted object. False if failed.

	$sqlstr = 'INSERT INTO "problem" ("modid", "proname", "hidden", "admin_uid") VALUES ($1, $2, $3, $4) RETURNING *;';
	$sqlarr = array($pro->modid, $pro->proname, $pro->hidden, $pro->admin_uid);
	$sqlr = pg_query_params($sqlstr, $sqlarr);
	if(!$sqlr)
	    return false;
	$obj = pg_fetch_object($sqlr, null, 'problem');
	pg_free_result($sqlr);
	if(!$obj)
	    return false;

	$obj->proid = intval($obj->proid);
	$obj->modid = intval($obj->modid);
	$obj->admin_uid = intval($obj->admin_uid);

	return $obj;
    }
    
    public static function mod_get_lang($sqlc, $modid)
    {
	//get available language code (OR) format
	//return language code

	$sqlstr = 'SELECT "lang" FROM "mod" WHERE "modid"=$1;';
	$sqlarr = array($modid);
	$sqlr = pg_query_params($sqlstr, $sqlarr);
	$ret = pg_fetch_result($sqlr, 0);
	pg_free_result($sqlr);
	if(!$ret)
	    return false;
	return intval($ret);
    }

    public static function recent_submit($sqlc, $uid, $time)
    {
	//return submission number in recent $time seconds.
	$lasttime = date('Y-m-d H:i:s', time()-$time);
	$sqlstr = 'SELECT COUNT(*) FROM "submit" WHERE "uid"=$1 AND "submit_time" >= $2;';
	$sqlarr = array($uid, $lasttime);
	$sqlr = pg_query_params($sqlstr, $sqlarr);
	$ret = pg_fetch_result($sqlr, 0);
	if(!$ret)
	    return false;
	return intval($ret);
    }    

    public static function send_socket($subid, $proid)
    {
	///send socket to center.
	//Return true if success, false if failed.

	$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
	$sconn = socket_connect($socket, '127.0.0.1', CENTER_SOCKET_PORT);

	if(!$sconn)
	    return false;

	$wret = socket_write($socket, $subid.chr(0).'{}'.chr(0));
	if($wret === false)
	    return false;


	$cret = socket_read($socket, 1024);
	if($cret === false)
	    return false;
	if($cret[0] != 'S')
	    return false;
	return true;
    }

    public static function get_pro_stat($sqlc, $proid, $uid)
    {
	//get $uid 's score and is_ac of problem $proid.
	
	$ret = new stdClass();

	$sqlstr = 'SELECT COUNT(*) FROM "submit" WHERE "proid"=$1 AND "uid"=$2 AND "result"=0;';
	$sqlarr = array($proid, $uid);
	$res = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$acct = pg_fetch_result($res, 0);
	$ret->is_ac = ($acct > 0);

	$sqlstr = 'SELECT "score" FROM "submit" WHERE "proid"=$1 AND "uid"=$2 ORDER BY "score" DESC LIMIT 1;';
	$sqlarr = array($proid, $uid);
	$res = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$score = pg_fetch_result($res, 0);
	if($score === false)
	{
	    $ret->tried = false;
	    $ret->score = 0;
	}
	else
	{
	    $ret->tried = true;
	    $ret->score = $score;
	}

	return $ret;
    }

    public static function rejudge_pro($sqlc, $proid)
    {
	$sqlstr = 'SELECT "subid" FROM "submit" WHERE "proid"=$1 ORDER BY "subid";';
	$sqlarr = array($proid);
	$res = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ok = true;
	$sublist = pg_fetch_all_columns($res, 0);
	if(!$sublist)return false;
	foreach($sublist as $sub)
	{
	    $subid = intval($sub);
	    if(!problem::send_socket($subid, $proid))$ok = false;
	}
	return $ok;
    }

    public static function rejudge_sub($sqlc, $subid)
    {
	$sqlstr = 'SELECT "proid" FROM "submit" WHERE "subid"=$1;';
	$sqlarr = array($subid);
	$res = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$proid = intval(pg_fetch_result($res, 0));
	if(!$proid)return false;

	return problem::send_socket($subid, $proid);
    }
}


?>
