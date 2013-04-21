<?php

require_once('common.inc.php');
require_once('square.inc.php');
require_once('sqlib_scoreboard.inc.php');

const SQMODNAME = 'sqmod_contest';

const SCOREBOARD_ID_PROBSTAT = 1;
const SCOREBOARD_ID_SCOREBOARD = 2;

function score_func($sqid, $proid, $best_score, $best_time, $is_ac, $ac_time, $tries_before_ac, $last_score, $last_status, $tries)
{
    $data = get_setting($sqid);
    $fscore = 0;

    foreach($data->pro as $pro)
    {
	if($pro->proid == $proid && $pro->method == 'normal')
	{
	    $fscore = $pro->score;
	    break;
	}
	if($pro->method == 'max')
	{
	    foreach($pro->config as $cf)
	    {
		foreach($cf as $sp)
		{
		    if($sp[0] == $proid)
		    {
			$fscore = $sp[1];
			break;
		    }
		}		    
	    }	
	}	
    }

    $rscore = $best_score * $fscore / 100;
    return $rscore;
}

function get_pro_stat_uid($sqlc, $msqlc, $sqid, $sboard_id, $uid)
{
    //get user $uid solving status of square $sqid. $sboard_id can be set as a fixed value.
    $sq = square::get($sqlc, $sqid);
    if(!$sq)die('Eno_such_sq');
    
    $data = sqlib_scoreboard::get_scoreboard_uid($sqlc, $msqlc, $sqid, $sboard_id, 'score_func', $sq->start_time, $sq->end_time, $uid);

    return $data[0];
}

function process_pro_stat($obj)
{
    $ret = array();
    foreach($obj->problem as $pro)
    {
	$ps = new stdClass();
	$ps->proid = $pro->proid;
	$ps->is_ac = $pro->is_ac;
	$ps->best_score = $pro->best_score;
	//$ps->rank_score = $pro->rank_score;
	$ps->tried = ($pro->tries > 0);
	//array_push($ret, $ps);
	$ret[$pro->proid] = $ps;
    }
    return $ret;
}

function add_setting($sqid)
{
    mkdir('/srv/http/toj/center/sq/'.$sqid);
}
function del_setting($sqid)
{
    $sqdir = '/srv/http/toj/center/sq/'.$sqid.'/';
    unlink($sqdir.'setting');
    rmdir($sqdir);
}
function get_setting($sqid)
{    
    $sqdir = '/srv/http/toj/center/sq/'.$sqid.'/';
    $cont = file_get_contents($sqdir.'setting');
    $data = json_decode($cont);
    return $data;
}
function put_setting($sqid, $data)
{    
    $sqdir = '/srv/http/toj/center/sq/'.$sqid.'/';
    file_put_contents($sqdir.'setting', json_encode($data));
}

function get_term($data, $sqid)
{
    return $data->term;
}

function calc_score($stat, $data, $sqid)
{
    $prolist = $data->pro;
    $ret = array();
    foreach($prolist as $pro)
    {
	$proid = $pro->proid;
	$np = new stdClass();
	if($stat)$np = clone $stat[$proid];
	//else continue;
	if(!$stat)
	{
	    $np->proid = $proid;
	    $np->best_score = 0;
	    $np->tried = false;
	    $np->is_ac = false;
	    array_push($ret, $np);
	    continue;
	}
	$method = $pro->method;
	//$np->full_score = $pro->score;
	if($method == 'normal')
	{
	    $np->best_score = $stat[$proid]->best_score / 100 * $pro->score;
	}
	if($method == 'max')
	{
	    $score = 0;
	    $tis_ac = false;
	    foreach($pro->config as $conf)
	    {
		//$np->best_score = json_encode($conf);
		$nowscore = 0;
		$is_ac = true;
		foreach($conf as $unit)
		{
		    $nowscore += $stat[$unit[0]]->best_score / 100 * $unit[1];
		    $np->tried = $np->tried || $stat[$unit[0]]->tried;
		    if(!$stat[$unit[0]]->is_ac)$is_ac = false;
		}
		$score = max($score, $nowscore);
		if($is_ac)$tis_ac = true;
	    }
	    $np->is_ac = $tis_ac;
	    $np->best_score = $score;// / 100 * $pro->score;
	}
	//$np->best_score = json_encode($np);
	array_push($ret, $np);
    }
    //$stat[0]->best_score = json_encode($ret[0]);
    return $ret;
}

function process_pro_list($list, $data, $sqid)
{
    $prol = $data->pro;
    $ret = array();
    foreach($prol as $pro)
    {
	$proid = $pro->proid;
	$np = null;
	foreach($list as $op)
	{
	    if($op->proid == $proid)
	    {
		$np = clone $op;
		break;
	    }
	}
	$np->prono = $pro->prono;
	$np->full_score = $pro->score;
	if($pro->proname)$np->proname = $pro->proname;
	array_push($ret, $np);
    }
    return $ret;
}

function get_base_line($data, $sqid, $isteam)
{
    $ret = new stdClass();
    if($isteam)
    {
	$ret->total_score = $data->total_score;
	$ret->pass_score = $data->pass_score_team;
	$ret->good_score = $data->good_score_team;
    }
    else
    {
	$ret->total_score = $data->total_score;
	$ret->pass_score = $data->pass_score;
	$ret->good_score = $data->good_score;
    }

    return $ret;
}

function get_scoreboard($sqlc, $msqlc, $sqid, $sboard_id){
    $sq = square::get($sqlc, $sqid);
    if(!$sq)
	die('Eno_such_sq');
    
    $data = sqlib_scoreboard::get_scoreboard($sqlc, $msqlc, $sqid, $sboard_id, 'score_func', $sq->start_time, $sq->end_time, 0, 65536);

    return $data;
}

function calc_default_baseline($total_score)
{
    $ret = new stdClass();

    $ret->pass_score = round($total_score * 0.6);
    $ret->good_score = round($total_score * 0.8);
    $ret->pass_score_team = round($total_score * 0.8);
    $ret->good_score_team = round($total_score * 1);

    return $ret;
}

function event_create($sqid)
{
    $set = array(
	'term' => 1,
	'pro' => [],
	'total_score' => 0,
	'pass_score' => 0,
	'good_score' => 0,
	'pass_score_team' => 0,
	'good_score_team' => 0
    );

    add_setting($sqid);
    put_setting($sqid, $set);
}
function event_destroy($sqid)
{
    del_setting($sqid);
}
function event_add_pro($sqid, $proid)
{   	     
    $set = get_setting($sqid);    

    $list = $set->pro;
    for($idx = 0;$idx < count($list);$idx++){
	if($list[$idx]->proid == $proid)
	    return;
    }
    $list[$idx] = array(
	"prono" => $idx + 1,
        "proid" => $proid,
        "score" => 100,
	"method" => 'normal'
    );
    $set->pro = $list;
    $set->total_score += 100;

    $baseline = calc_default_baseline($set->total_score);
    $set->pass_score = $baseline->pass_score;
    $set->good_score = $baseline->good_score;
    $set->pass_score_team = $baseline->pass_score_team;
    $set->good_score_team = $baseline->good_score_team;
    
    put_setting($sqid, $set);
}
function event_del_pro($sqid, $proid)
{   	     
    $set = get_setting($sqid);    

    $list = $set->pro;
    $idx = 0;
    while($idx < count($list)){
	if($list[$idx]->proid == $proid){
	    array_splice($list,$idx,1);
	    $set->total_score -= 100;
	}else{
	    $list[$idx]->prono = $idx + 1;
	    $idx++;
	}
    }
    $set->pro = $list;

    $baseline = calc_default_baseline($set->total_score);
    $set->pass_score = $baseline->pass_score;
    $set->good_score = $baseline->good_score;
    $set->pass_score_team = $baseline->pass_score_team;
    $set->good_score_team = $baseline->good_score_team;

    put_setting($sqid, $set);
}

?>
