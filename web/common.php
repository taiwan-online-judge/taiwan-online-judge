<?php

define('DB_NAME','expoj');
define('DB_USER','expoj');
define('DB_PASSWORD','');
define('SEC_SALT','xxxxx');

function sec_checkuser($userid,$usersec){
    if($userid == '' || $usersec == '' || strval(intval($userid)) != $userid || hash('sha512',$userid.SEC_SALT) != $usersec){
	return false;
    }

    return true;
}

?>
