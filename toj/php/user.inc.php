<?php

require_once('common.inc.php');
require_once('/srv/http/phpmailer/class.phpmailer.php');

const USERNAME_LEN_MIN = 5;
const USERNAME_LEN_MAX = 20;
const PASSWORD_LEN_MIN = 5;
const PASSWORD_LEN_MAX = 32;
const NICKNAME_LEN_MIN = 1;
const NICKNAME_LEN_MAX = 32;
const EMAIL_LEN_MAX = 100;

const USER_PER_USER		= 0x00000001;
const USER_PER_PROCREATOR	= 0x00000002;
const USER_PER_PROADMIN		= 0x00000004;

const USER_LEVEL_USER		= 0x00000001;
const USER_LEVEL_PROCREATOR	= 0x00000003;
const USER_LEVEL_PROADMIN	= 0x00000007;
const USER_LEVEL_ADMIN		= 0x0000ffff;
const USER_LEVEL_SUPERADMIN	= 0xffffffff;

class user
{
    public $uid;
    public $username;
    public $password;
    public $nickname;
    public $aboutme;
    public $avatar;
    public $level;
    public $email;
      
    public static function get_from_uid($sqlc, $uid)
    {
	//return user object of specified uid. False if user doesn't exists.

	$result = pg_query_params($sqlc, 'SELECT * FROM "user" WHERE "uid"=$1 LIMIT 1;', array(intval($uid))) or die ("Eerror_get_user");
	$ret =  pg_fetch_object($result, null, 'user');
	pg_free_result($result);
	if(!$ret)
	    return false;
	$ret->uid = intval($ret->uid);
	$ret->level = intval($ret->level);
	return $ret;
    }

    public static function get_from_username($sqlc, $username)
    {
	//return user object of specified username. False if user doesn't exists.

	$result = pg_query_params($sqlc, 'SELECT * FROM "user" WHERE "username"=$1 LIMIT 1;', array($username));
	$ret = pg_fetch_object($result, null, 'user');
	pg_free_result($result);
	if(!$ret)
	    return false;
	$ret->uid = intval($ret->uid);
	$ret->level = intval($ret->level);

	return $ret;
    }

    public static function add($sqlc, $user)
    {
	//add user to database , with $user the user data object
	//return inserted user object. False if failed.
	//Assume the insertion is valid!!
	//requires member: string username, string nickname, string password, stirng aboutme, string avatar, string email

	$sqlstr = 'INSERT INTO "user" ("username", "nickname", "password", "aboutme", "avatar", "email") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;';
	$sqlarr = array($user->username, $user->nickname, $user->password, '', '', $user->email);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	if(!$sqlr)return false;
	//$sqlr = pg_query($sqlc, 'SELECT SCOPE_IDENTITY();');
	$obj = pg_fetch_object($sqlr, null, 'user');
	pg_free_result($sqlr);
	if($obj)$obj->uid = intval($obj->uid);
	return $obj;
    }

    public static function update($sqlc, $user)
    {
	//update user data into database, with $user the user data object
	//return updated object. False if failed.
	//Assume the update is valid!!
	//requires member: string nickname, string password, string aboutme, string avatar, string email, int uid
	
	$sqlstr = 'UPDATE "user" SET "nickname"=$1, "password"=$2, "aboutme"=$3, "avatar"=$4, "email"=$5 WHERE "uid"=$6 RETURNING *;';
	$sqlarr = array($user->nickname, $user->password, $user->aboutme, $user->avatar, $user->email, intval($user->uid));
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	if(!$sqlr)return false;
	$obj = pg_fetch_object($sqlr, null, 'user');
	pg_free_result($sqlr);
	if($obj)$obj->uid = intval($obj->uid);
	return $obj;	
    }

    /*public static function update_property($sqlc, $user)
    {
	//update property of given user.
	//return updated object. False if failed.
	//Assume the update is valid!!
	//requires member: int[] property, int uid;

	$sqlstr = 'UPDATE "user" SET "property"=$1 WHERE "uid"=$2 RETURNING *;';
	$sqlarr = array($user->property, intval($user->uid));
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	if(!$sqlr)return false;
	$obj = pg_fetch_object($sqlr, null, 'user');
	pg_free_result($sqlr);
	if($obj)$obj->uid = intval($obj->uid);
	return $obj;
    }*/

    public static function get_username($sqlc, $uid)
    {
	//return username of given uid. False if not found.

	$sqlstr = 'SELECT "username" FROM "user" WHERE "uid"=$1 LIMIT 1;';
	$sqlarr = array(intval($uid));
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = pg_fetch_result($sqlr, 0);
	pg_free_result($sqlr);
	return $ret;
    }

    public static function get_nickname($sqlc, $uid)
    {
	//return nickname of given uid. False if not found.

	$sqlstr = 'SELECT "nickname" FROM "user" WHERE "uid"=$1 LIMIT 1;';
	$sqlarr = array(intval($uid));
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = pg_fetch_result($sqlr, 0);
	pg_free_result($sqlr);
	return $ret;
    }

    public static function reset_password($sqlc, $uid)
    {
	//reset password for given uid. False if not found.

	$user = user::get_from_uid($sqlc, $uid);
	if(!$user)return false;
	$email = $user->email;
	if(!$email)return false;
	
	$passlen = 8;
	$newpass = '';
	for($i = 0; $i < $passlen; $i++)
	{
	    $v = rand()%62;
	    $c = null;
	    if($v<10)$c = chr(48 + $v);
	    else if($v<36)$c = chr(65 + $v - 10);
	    else $c = chr(97 + $v - 36);
	    $newpass = $newpass.$c;
	}
	//echo($newpass.'<br>');

	//email

	$cmail = new PHPMailer();
	$cmail->IsSMTP();

	$cmail->SMTPAuth = true;
	$cmail->SMTPSecure = 'SSL';
	$cmail->Host = 'ssl://'.SMTP_HOST;
	$cmail->Port = 465;
	$cmail->Username = SMTP_USER;
	$cmail->Password = SMTP_PASS;
	$cmail->From = 'sprout@csie.ntu.edu.tw';
	$cmail->FromName = 'Taiwan Online Judge';

	$cmail->AddAddress($email, $user->nickname);
	$cmail->WordWrap = 70;
	$cmail->Subject = 'TOJ Password Reset Notice';
	$cmail->IsHTML = true;
	$cmail->Body = 'Hi '.$user->nickname.' ('.$user->username.') , your new password is '.$newpass.' .';
	if(!$cmail->Send())
	{
	    //echo($cmail->ErrorInfo.'<br>');
	    return false;
	}



	$user->password = hash('sha512', $newpass);
	$nuser = user::update($sqlc, $user);
	if(!$nuser)return false;

	return true;	
    }

    public static function statistic($sqlc, $uid){
	$sqlstr = 'SELECT "proid",MIN("result") AS "result" FROM "submit" WHERE "uid"=$1 GROUP BY "proid" ORDER BY "proid" ASC;';
	$sqlarr = array(intval($uid));
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$trylist = array();
	while($obj = pg_fetch_object($sqlr)){
	    $obj->proid = intval($obj->proid); 
	    $obj->result = intval($obj->result); 
	    array_push($trylist, $obj);
	}
	pg_free_result($sqlr);
    
	$sqlstr = 'SELECT "result",COUNT("result") AS "count" FROM "submit" WHERE "uid"=$1 GROUP BY "result" ORDER BY "result";';
	$sqlarr = array(intval($uid));
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$substatis = array();
	while($obj = pg_fetch_object($sqlr)){
	    $obj->result = intval($obj->result);
	    $obj->count = intval($obj->count);
	    array_push($substatis, $obj);
	}
	pg_free_result($sqlr);

	$sqlstr = 'SELECT "result",COUNT("result") AS "count" FROM "submit" WHERE "uid"=$1 GROUP BY "result" ORDER BY "result";';
	$sqlarr = array(intval($uid));
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$substatis = array();
	while($obj = pg_fetch_object($sqlr)){
	    $obj->result = intval($obj->result);
	    $obj->count = intval($obj->count);
	    array_push($substatis, $obj);
	}
	pg_free_result($sqlr);

	$sqlstr = 'SELECT TO_CHAR("submit_time",\'YYYY-MM\') AS "time",COUNT("submit_time") AS "count" FROM "submit" WHERE uid=$1 GROUP BY TO_CHAR("submit_time",\'YYYY-MM\');';
	$sqlarr = array(intval($uid));
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$timesub = array();
	while($obj = pg_fetch_object($sqlr)){
	    $obj->count = intval($obj->count);
	    array_push($timesub, $obj);
	}
	pg_free_result($sqlr);

	return array(
	    'trylist' => $trylist,
	    'substatis' => $substatis,
	    'timesub' => $timesub
	);
    }
}

function sec_check_level($sqlc, $lv, $uid = null)
{
    $uidnull = false;
    if($uid == null)
    {
	$uid = intval($_COOKIE['uid']);
	$uidnull = true;
    }
    if($uidnull && !sec_is_login())
	return false;
    $user = user::get_from_uid($sqlc, $uid);
    return (($user->level & $lv) == $lv);
}

?>
