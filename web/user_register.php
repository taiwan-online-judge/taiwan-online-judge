<?php
require_once('common.php');

$username = $_POST['username'];
$password = $_POST['password'];
$nickname = $_POST['nickname'];

if($username == '' || strlen($username) > 16 || $username != pg_escape_string($username)){
    exit('Eusername');
}
if($password == '' || strlen($password) > 128){
    exit('Epassword');
}
if($nickname == '' || strlen($nickname) > 16 || $nickname != pg_escape_string($nickname)){
    exit('Enickname');
}

$sqlc = pg_connect('host=localhost port=5432 dbname='.DB_NAME.' user='.DB_USER.' password='.DB_PASSWORD);

$username = pg_escape_string($username);
$sqlr = pg_query_params($sqlc,'SELECT "username" FROM "user" WHERE "username"=$1 LIMIT 1;',
	array($username));
if(pg_num_rows($sqlr) > 0){
    pg_free_result($sqlr);
    pg_close($sqlc);
    exit('Eexist');
}
pg_free_result($sqlr);

$password = hash('sha512',$password);
$sqlr = pg_query_params($sqlc,'INSERT INTO "user" ("username","password","nickname") VALUES($1,$2,$3) RETURNING "userid";',
	array($username,$password,$nickname));
$userid = pg_fetch_row($sqlr)[0];
pg_free_result($sqlr);

pg_close($sqlc);

setcookie('userid',$userid,time() + 31536000);
setcookie('usersec',hash('sha512',$userid.SEC_SALT),time() + 31536000);
echo 'S';
?>
