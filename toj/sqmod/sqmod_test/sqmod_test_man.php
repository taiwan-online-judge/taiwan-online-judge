<?php

require_once('../../php/common.inc.php');
require_once('../../php/square.inc.php');
require_once('../../php/user.inc.php');
require_once('../../php/sqlib_scoreboard.inc.php');
require_once('sqmod_test.inc.php');

function get_sprout_data($msqlc, $uid, $term)
{
    $sqlstr = 'SELECT * FROM "sqmod_sprout_student" INNER JOIN "sqmod_sprout_team" ON "sqmod_sprout_student"."uid"="sqmod_sprout_team"."uid" WHERE "sqmod_sprout_student"."uid"=$1 AND "sqmod_sprout_team"."term"=$2;';
    $sqlarr = array($uid, $term);
    $res = pg_query_params($sqlstr, $sqlarr);
    $ret = pg_fetch_object($res);
    return $ret;
}

function trans_type($type)
{
    if($type==1)return '高中男';
    if($type==2)return '高中女';
    if($type==3)return '大學生';
    if($type==4)return '小老師';
    if($type==5)return '內測員';
    if($type==6)return '管理員';
}

function team_cmp($a, $b)
{
    if($a->sspd->teamid == $b->sspd->teamid)return ($a->sspd->type < $b->sspd->type);
    //var_dump($a);
    //echo($a->sspd->teamid.','.$b->sspd->teamid.'<br>');
    return $a->sspd->teamid > $b->sspd->teamid;
}

function get_user_spent_time($sqlc, $sqid, $uid, $start_time = null, $end_time = null)
{
    if(!$start_time)$start_time = '1990-01-01 01:01:01';
    if(!$end_time)$end_time = '2222-02-02 02:02:02';
    $sqlstr = 'SELECT "submit_time" FROM "submit" WHERE "uid"=$1 AND "submit_time">=$2 AND "submit_time"<$3 AND "proid" IN (SELECT "proid" FROM "pro_sq" WHERE "sqid"=$4) ORDER BY "submit_time";';
    $sqlarr = array($uid, $start_time, $end_time, $sqid);
    $res = pg_query_params($sqlc, $sqlstr, $sqlarr);
    $arr = pg_fetch_all_columns($res, 0);
    $last_time = 0;
    $tot_time = 0;
    $cnt = 0;
    //return 3;
    foreach($arr as $str)
    {
	$cnt += 1;
	$time = strtotime($str);
	//return $time/60;
	$mid = 10 * 60;
	$lng = 90 * 60;

	$nl_time = $time + $mid;
	if($nl_time <= $last_time + $lng)
	{
	    $tot_time += $nl_time - $last_time;
	}
	else 
	{
	    $tot_time += 2 * $mid;
	}

	$last_time = $nl_time;
    }
    return array($tot_time, $cnt);
}

$sqlc = db_connect();
$msqlc = db_connect('toj_mod2');

$sqid = intval($_GET['sqid']);
if(!$sqid)
    die('Eno_sqid');

$sboard_id = 1;
$sq = square::get($sqlc, $sqid);
if(!$sq)
    die('Eerror_sqid');

$stime = $sq->start_time;
$etime = $sq->end_time;

$sbdata = sqlib_scoreboard::get_scoreboard($sqlc, $msqlc, $sqid, $sboard_id, 'score_func', $sq->start_time, $sq->end_time, 1, null);

//var_dump($sbdata);

$prol = '';
foreach($sbdata[0]->problem as $pro)
{
    $prol = $prol.'<td align=center width=50>'.$pro->proid.'</td>';
}

$dt = get_setting($sqid);
$base = get_base_line($dt, $sqid, false);
$term = get_term($dt, $sqid);

echo('<meta http-equiv="Content-Type" content="text/html; charset=utf8">');
echo('<table border = 1>');
echo('<h align=center><td>rank</td><td>uid</td><td>Nickname</td><td>Name</td><td>StuNo.</td><td>Team</td><td>Type</td><td>Total</td>'.$prol.'<td>Sub.</td><td>Est. Time</td></h>');

$teamsc = array();

foreach($sbdata as $usr)
{
    $usr->sspd = get_sprout_data($msqlc, $usr->uid, $term);
}

if($_GET['sort']=='team')usort($sbdata, 'team_cmp');

foreach($sbdata as $usr)
{
    $spd = $usr->sspd;
    if($_GET['stu_only'] && !($spd->type>=1 && $spd->type<=4))
	continue;
    echo('<tr align="center">');
    echo('<td>'.$usr->rank.'</td>');
    echo('<td>'.$usr->uid.'</td>');
    $user = user::get_from_uid($sqlc, $usr->uid);
    $original_nickname=$user->nickname;
    if(mb_strlen($user->nickname,'UTF-8')>7){
	$user->nickname=mb_substr($user->nickname,0,6,'UTF-8').'...';
	echo('<td title="'.str_replace("!","!",htmlspecialchars($original_nickname)).'">'.$user->nickname.'</td>');
    } else {
	echo('<td>'.$user->nickname.'</td>');
    }
    echo('<td>'.$spd->name.'</td>');
    echo('<td>'.$spd->stuno.'</td>');
    echo('<td>'.$spd->teamid.'</td>');
    echo('<td>'.trans_type($spd->type).'</td>');

    $color = 'black';
    if($usr->rank_score >= $base->total_score)$color = 'gray';
    else if($usr->rank_score >= $base->good_score)$color = 'goldenrod';
    else if($usr->rank_score >= $base->pass_score)$color = 'limegreen';
    echo('<td><b><font color="'.$color.'">'.intval($usr->rank_score).'</font></b></td>');

    
    foreach($usr->problem as $pro)
    {
	if(!$pro->tries){echo('<td></td>');continue;}

	$clr = 'red';
	$b = false;
	if($pro->is_ac){$clr = 'green';$b = true;}
	else if($pro->best_score>=50)$clr = 'orange';
	echo('<td><font color="'.$clr.'">'.(b?'<b>':'').intval($pro->rank_score).(b?'</b>':'').'</font></td>');
    }

    $usr_time = get_user_spent_time($sqlc, $sqid, $usr->uid, $stime, $etime);
    $uttmin = floor($usr_time[0] / 60);
    $uttcnt = $usr_time[1];
    $tm_clr = 'black';
    $utmin = $uttmin % 60;
    if($utmin<10)$utmin = '0'.$utmin;
    $uthr = floor($uttmin/60);
    if($uthr >= 2)$tm_clr = 'lime';
    if($uthr >= 6)$tm_clr = 'orange';
    if($uthr >= 10)$tm_clr = 'red';
    echo('<td>'.$uttcnt.'</td><td><font color="'.$tm_clr.'">'.$uthr.':'.$utmin.'</font></td>');


    echo('</tr>');
}

echo('</table>');


db_close($sqlc);
db_close($msqlc);

?>
