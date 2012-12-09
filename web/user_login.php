<?php
require_once('common.php');

$username = $_POST['username'];
$password = $_POST['password'];

if($username == '' || strlen($username) > 16 || $username != pg_escape_string($username)){
    exit('Eerror');
}
if($password == '' || strlen($password) > 128){
    exit('Eerror');
}

$sqlc = pg_connect('host=localhost port=5432 dbname='.DB_NAME.' user='.DB_USER.' password='.DB_PASSWORD);

$username = pg_escape_string($username);
$password = hash('sha512',$password);
$sqlr = pg_query_params($sqlc,'SELECT "userid" FROM "user" WHERE "username"=$1 AND "password"=$2 LIMIT 1;',
	array($username,$password));
if(($sqlo = pg_fetch_object($sqlr)) == null){
    pg_free_result($sqlr);
    pg_close($sqlc);
    exit('Eerror');
}
$userid = $sqlo->userid;
pg_free_result($sqlr);
pg_close($sqlc);

setcookie('userid',$userid,time() + 31536000);
setcookie('usersec',hash('sha512',$userid.SEC_SALT),time() + 31536000);
echo 'S';
?>
