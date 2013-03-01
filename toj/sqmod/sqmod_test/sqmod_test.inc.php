<?php

require_once('../../php/common.inc.php');
require_once('../../php/square.inc.php');
require_once('../../php/sqlib_scoreboard.inc.php');

const SQMODNAME = 'sqmod_test';

const SCOREBOARD_ID_PROBSTAT = 1;


function get_pro_stat_uid($sqlc, $msqlc, $sqid, $sboard_id, $uid)
{
    //get user $uid solving status of square $sqid. $sboard_id can be set as a fixed value.
    $sq = square::get($sqlc, $sqid);
    if(!$sq)die('Eno_such_sq');
    
    $data = sqlib_scoreboard::get_scoreboard_uid($sqlc, $msqlc, $sqid, $sboard_id, null, $sq->start_time, $sq->end_time, $uid);

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

function get_setting($sqid)
{    
    $sqdir = '/srv/http/toj/center/sq/'.$sqid.'/';
    $cont = file_get_contents($sqdir.'setting');
    $data = json_decode($cont);
    return $data;
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

?>
