<?php
//ini_set("display_errors", "On");

require_once('common.inc.php');
require_once('step.inc.php');
require_once('teamt.php');

$sqlc = db_connect();
$msqlc = db_connect('toj_mod');

if(strlen($action)==0)
    die('Eno_action');
if($action == '')
{
}

$uid = $_GET['uid'];
$dat = get_prob_stat_uid($sqlc, $msqlc, 1, 2, $uid);

//var_dump($dat);
echo('uid : '.$dat->uid.'<br>');
foreach($dat->problem as $prob)
{
   echo('problem '.$prob->proid.' : ');
   if(!$prob->tries)
   {
       echo('--<br>');
       continue;
   }
   echo($prob->best_score.' ');
   if($prob->is_ac)echo('AC');
   echo('<br>');
}

$term = 1;
$teamid = get_teamid($msqlc, $term, $uid);
echo('<br>Team : '.$teamid.'<br>Members : <br>');
$members = get_team_member($msqlc, $term, $teamid);
foreach($members as $mem)
{
    echo('<br>Uid : '.$mem->uid.' ( Level '.$mem->level.' )<br>');
    $uid = intval($mem->uid);
    if($uid == intval($_GET['uid']))continue;
    $dat = get_prob_stat_uid($sqlc, $msqlc, 1, 2, $uid);

    foreach($dat->problem as $prob)
    {
	echo('problem '.$prob->proid.' : ');
	if(!$prob->tries)
	{
	    echo('--<br>');
	    continue;
	}
	echo($prob->best_score.' ');
	if($prob->is_ac)echo('AC');
	echo('<br>');
	}
}


db_close($sqlc);
db_close($msqlc);

?>
