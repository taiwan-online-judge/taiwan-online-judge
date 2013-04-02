<?php
ini_set("display_errors", "On");
error_reporting(E_ALL & ~E_NOTICE);

require_once('common.inc.php');
require_once('sqlib.inc.php');
require_once('user.inc.php');
require_once('problem.inc.php');

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

/*for($i = 5; $i <= 61; $i++){
echo('uid : '.$i.'<br>');
$res = user::reset_password($sqlc, $i);
var_dump($res);
}*/
//user::reset_password($sqlc, 16);

if(!sec_check_level($sqlc, USER_LEVEL_SUPERADMIN))
    die('Epermission_denied');

if($_GET['code']=='code')
{
    $subid = intval($_GET['subid']);
    if(!$subid)
	die('Eno_subid');
    $path = '../center/submit/'.(int)(floor($subid/1000)*1000).'/'.$subid.'/data/main.cpp';
    $code = file_get_contents($path);
    if(!$code)
	die('Eerror_get_code');
    
    $sarr = array('<', '>');
    $darr = array('&lt;', '&gt;');

    $ncode = str_replace($sarr, $darr, $code);

    echo('Subid: '.$subid.'<br>');
?>
<script type="text/javascript" src="http://alexgorbatchev.com/pub/sh/current/scripts/shCore.js"></script>
<script type="text/javascript" src="http://alexgorbatchev.com/pub/sh/current/scripts/shBrushCpp.js"></script>
<link href="http://alexgorbatchev.com/pub/sh/current/styles/shCore.css" rel="stylesheet" type="text/css" />
<link href="http://alexgorbatchev.com/pub/sh/current/styles/shThemeDefault.css" rel="stylesheet" type="text/css" />
<?php
    echo('<pre class="brush: cpp">');
    echo($ncode);
    echo('</pre>');
?>
<script type="text/javascript">
     SyntaxHighlighter.all()
</script>
<?php
}
//exit();
if($_GET['rejudge']=='sub')
{
    $subid = intval($_GET['subid']);
    if(!$subid)
	die('Eno_subid');
    $res = problem::rejudge_sub($sqlc, $subid);
    if(!$res)
	die('Eerror_rejudge');
    echo('S');    
}
if($_GET['rejudge']=='pro')
{
    $proid = intval($_GET['proid']);
    if(!$proid)
	die('Eno_proid');
    $res = problem::rejudge_pro($sqlc, $proid);
    if(!$res)
	die('Eerror_rejudge');
    echo('S');
}

db_close($sqlc);
db_close($msqlc);
?>
