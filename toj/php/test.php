<?php
ini_set("display_errors", "On");
error_reporting(E_ALL & ~E_NOTICE);

require_once('common.inc.php');
require_once('sqlib.inc.php');
require_once('user.inc.php');

$msqlc = db_connect('toj_mod');
$sqlc = db_connect();

function func($sqid, $proid, $best_score, $best_time, $is_ac, $ac_time, $tries_before_ac, $last_score, $last_status, $last_time, $tries)
{
    return $best_score;
}

//$a = intval($_GET['a']);
//sqlib_scoreboard::set_last_update($msqlc, 1, 4, false);
//$scb = sqlib_scoreboard::get_scoreboard($sqlc, $msqlc, 1, $a, func, null, null, 1, 20);
//var_dump($scb);
//echo(json_encode($scb));
//$test = sqlib_scoreboard::get_last_update($msqlc, 1, $a);
//echo($test.'<br>');
//echo(strtotime($test).'<br>');
//echo(time());

$res = user::reset_password($sqlc, 130);
var_dump($res);

db_close($sqlc);
db_close($msqlc);
?>
