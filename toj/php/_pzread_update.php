<?php
require_once('common.inc.php');
  
$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
$sconn = socket_connect($socket, '127.0.0.1',CENTER_SOCKET_PORT);

if(!$sconn)
    exit('error');

$wret = socket_write($socket,'-1'.chr(0).'{}'.chr(0));
if($wret === false)
    exit('error');

$cret = socket_read($socket, 1024);
if($cret === false)
    exit('error');
if($cret[0] != 'S')
    exit('error');

exit('ok');
?>
