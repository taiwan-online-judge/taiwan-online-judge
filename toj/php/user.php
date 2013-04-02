<?php
//ini_set("display_errors", "On");
//error_reporting(E_ALL & ~E_NOTICE);

require_once('user.inc.php');

$sqlc = db_connect();

$action = $_POST['action'];
$data = $_POST['data'];

if(strlen($action)==0)
    die('Eno_action');
if($action == 'register')
{
    //Add new user.
    //Data: username, password, nickname, email, [aboutme, avatar]

    $user = json_decode($data);
    
    if(strlen($user->username)<USERNAME_LEN_MIN)
	die('Eusername_too_short');
    if(strlen($user->username)>USERNAME_LEN_MAX)
	die('Eusername_too_long');
    if(strlen($user->password)<PASSWORD_LEN_MIN)
	die('Epassword_too_short');
    if(strlen($user->password)>PASSWORD_LEN_MAX)
	die('Epassword_too_long');
    if(strlen($user->nickname)<NICKNAME_LEN_MIN)
	die('Enickname_too_short');
    if(strlen($user->nickname)>NICKNAME_LEN_MAX)
	die('Enickname_too_long');
    if(strlen($user->email)==0)
	die('Eempty_email');
    if(strlen($user->email)>EMAIL_LEN_MAX)
	die('Eemail_too_long');
    //if($user->password != $user->passconf)
    //	die('Epassword_not_match');

    if(user::get_from_username($sqlc, $user->username) != false)
	die('Eusername_exists');

    $user->password = hash('sha512', $user->password);

    $res = user::add($sqlc, $user);

    if(!$res)
	die('Einsert_failed');

    setcookie('uid', $res->uid, time() + 31536000, '/toj/');
    setcookie('usec', hash('sha512', $res->uid.SEC_SALT), time() + 31536000, '/toj/');

    echo('S');
}
if($action == 'update')
{
    //Update exist user
    //data: nickname, [aboutme, avatar], [oldpw, password]

    $user = json_decode($data);

    if(!sec_is_login())
	die('Enot_login');

    $user->uid = $_COOKIE['uid'];

    $olduser = user::get_from_uid($sqlc, $user->uid);
    if(!$olduser)
        die('Eget_user_failed');

    if(strlen($user->oldpw)>0)
    {
	if(strlen($user->password)<PASSWORD_LEN_MIN)
	    die('Epassword_too_short');
	if(strlen($user->password)>PASSWORD_LEN_MAX)
	    die('Epassword_too_long');
	//if($user->password != $user->passconf)
	//    die('Epassword_not_match');

	$oldhash = hash('sha512', $user->oldpw);

	if($olduser->password != $oldhash)
	    die('Eold_password_not_match');

	$user->password = hash('sha512', $user->password);
    }
    else
    {
	$user->password = $olduser->password;
    }

    if(strlen($user->nickname)<NICKNAME_LEN_MIN)
	die('Enickname_too_short');
    if(strlen($user->nickname)>NICKNAME_LEN_MAX)
	die('Enickname_too_long');
    if(strlen($user->email)==0)
	die('Eempty_email');
    if(strlen($user->email)>EMAIL_LEN_MAX)
	die('Eemail_too_long');

    $res = user::update($sqlc, $user);
    if(!$res)
	die('Eupdate_failed');

    echo('S');
}
if($action == 'view')
{
    //View user data
    //data: uid

    $cls = json_decode($data);

    if($cls->uid == null)
    {
	if(!sec_is_login())
	    die('Enot_login_or_please_set_uid');
	$cls->uid = intval($_COOKIE['uid']);
    }
    $user = user::get_from_uid($sqlc, $cls->uid);
    if(!$user)
	die('Eget_user_failed');

    unset($user->password);
    if(intval($_COOKIE['uid']) != $user->uid)
	unset($user->email);

    echo(json_encode($user));
}
if($action == 'login')
{
    //Login.
    //data: username, password
    $login = json_decode($data);
    
    if(strlen($login->username)==0)
	die('Eno_username');
    if(strlen($login->username)>USERNAME_LEN_MAX)
	die('Eusername_too_long');
    if(strlen($login->password)==0)
	die('Eno_password');
    if(strlen($login->password)>PASSWORD_LEN_MAX)
	die('Epassword_too_long');

    $user = user::get_from_username($sqlc, $login->username);
    if(!$user)
	die('Euser_not_exist');

    if(hash('sha512', $login->password) != $user->password)
	die('Ewrong_password');

    setcookie('uid', $user->uid, time() + 31536000, '/toj/');
    setcookie('usec', hash('sha512', $user->uid.SEC_SALT), time() + 31536000, '/toj/');

    echo('S');
}

db_close($sqlc);

?>
