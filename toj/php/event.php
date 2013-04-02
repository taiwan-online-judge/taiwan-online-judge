<?php
    require_once('event.inc.php');
    if (!empty($_SERVER['HTTP_CLIENT_IP']))
        $ip=$_SERVER['HTTP_CLIENT_IP'];
    else if (!empty($_SERVER['HTTP_X_FORWARDED_FOR']))
        $ip=$_SERVER['HTTP_X_FORWARDED_FOR'];
    else
	$ip=$_SERVER['REMOTE_ADDR'];
    if(!event::validate_ip())
    {
	exit;
    }
    $fname = $_POST['fname'];
    $name = $_POST['name'];
    $arg = json_decode($_POST['arg']);
    if(event::exec_func($fname, $name, $arg) === false)
    {
	echo "false";
    }
    else
    {
	echo "true";
    }
?>
