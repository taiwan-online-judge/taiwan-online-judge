<?php

define('DB_NAME','xxxxx');
define('DB_USER','xxxxx');
define('DB_PASSWORD','xxxxx');
define('SEC_SALT','xxxxx');

define('SMTP_HOST','xxxxx');
define('SMTP_USER','xxxxx');
define('SMTP_PASS','xxxxx');

const CENTER_SOCKET_PORT = 2501;

function sec_is_login()
{
    if(!isset($_COOKIE['uid']) || !isset($_COOKIE['usec'])){
	return false;
    }

    $userid = $_COOKIE['uid'];
    $usersec = $_COOKIE['usec'];

    if($userid == '' || $usersec == '' || strval(intval($userid)) != $userid || hash('sha512',$userid.SEC_SALT) != $usersec){
	return false;
    }

    return true;
}

function db_connect($dbn = DB_NAME)
{
    return pg_connect('host=localhost port=5432 dbname='.$dbn.' user='.DB_USER.' password='.DB_PASSWORD);
}

function db_close($sqlcx)
{
    pg_close($sqlcx);
}

?>
