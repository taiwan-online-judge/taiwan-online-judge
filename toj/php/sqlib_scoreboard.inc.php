<?php
    
    /*
	Square mod library : Scoreboard
	2013/02/10 By TOJTeam

	Get scoreboard by rank : 
	sqlib_scoreboard::get_scoreboard($sqlc, $msqlc, $sqid, $sboard_id, $score_func, $start_time, $end_time, $start_rank, $number)
	
	Get scoreboard of specific user :
	sqlib_scoreboard::get_scoreboard_uid($sqlc, $msqlc, $sqid, $sboard_id, $score_func, $start_time, $end_time, $uid)

	$sqlc : sql connection to database 'toj'
	$msqlc : sql connection to database 'toj_mod'
	$sqid : square id number
	$sboard_id : scoreboard id number (of square)
	$score_func : function to determine rank_score
	$start_time : start timestamp
	$end_time : end timestamp
	$start_rank : display from which rank
	$number : number to display 
	$uid : user id number

	Parameter format of $score_func: 
	func($sqid, $proid, $best_score, $best_time, $is_ac, $ac_time, $tries_before_ac, $last_score, $last_status, $tries);

       */

    require_once('common.inc.php');

    class sqlib_scoreboard
    {
	public static function def_func($sqid, $proid, $best_score, $best_time, $is_ac, $ac_time, $tries_before_ac, $last_score, $last_status, $tries)
	{
	    return $best_score;
	}

	public static function get_last_update($msqlc, $sqid, $sboard_id)
	{
	    $sqlstr = 'SELECT "last_update" FROM "sqlib_scoreboard_last_update" WHERE "sqid"=$1 AND "sboard_id"=$2;';
	    $sqlarr = array($sqid, $sboard_id);
	    $res = pg_query_params($msqlc, $sqlstr, $sqlarr);
	    $ret = pg_fetch_result($res, 0);
	    return $ret;
	}

	public static function set_last_update($msqlc, $sqid, $sboard_id, $new)
	{
	    $now = date('Y-m-d H:i:s+08');
	    $sqlstr = 'UPDATE "sqlib_scoreboard_last_update" SET "last_update"=$3 WHERE "sqid"=$1 AND "sboard_id"=$2;';
	    if($new)
	    {
		$sqlstr = 'INSERT INTO "sqlib_scoreboard_last_update" ("sqid", "sboard_id", "last_update") VALUES ($1, $2, $3);';
		sqlib_scoreboard::clear_scoreboard($msqlc, $sqid, $sboard_id);
	    }
	    $sqlarr = array($sqid, $sboard_id, $now);
	    $res = pg_query_params($msqlc, $sqlstr, $sqlarr);
	}

	public static function clear_scoreboard($msqlc, $sqid, $sboard_id)
	{
	    $sqlstr = 'DELETE FROM "sqlib_scoreboard_main" WHERE "sqid"=$1 AND "sboard_id"=$2;';
	    $sqlarr = array($sqid, $sboard_id);
	    $res = pg_query_params($msqlc, $sqlstr, $sqlarr);
	}

	public static function get_scoreboard($sqlc, $msqlc, $sqid, $sboard_id, $score_func, $start_time = null, $end_time = null, $start_offset, $number, $uid = null) 
	{
	    if(!$start_time)$start_time = '1900-01-01 01:01:01+08';
	    if(!$end_time)$end_time = '2222-01-01- 01:01:01+08';
	    sqlib_scoreboard::update($sqlc, $msqlc, $sqid, $sboard_id, $score_func, $start_time, $end_time);
	    
	    //display
	    $sqlstr = 'SELECT "a1"."uid", "a1"."rank_score", COUNT(*) AS "rank" FROM "sqlib_scoreboard_main" "a1", "sqlib_scoreboard_main" "a2" WHERE "a1"."sqid"=$1 AND "a1"."sboard_id"=$2 AND "a2"."sqid"=$1 AND "a2"."sboard_id"=$2 AND ("a2"."rank_score">"a1"."rank_score" OR "a2"."uid"="a1"."uid") GROUP BY "a1"."uid", "a1"."rank_score" ORDER BY "a1"."rank_score" DESC, "a1"."uid" LIMIT $4 OFFSET $3;';
	    $sqlarr = array($sqid, $sboard_id, $start_offset-1, $number);
	    if($uid)
	    {
		$sqlstr = 'SELECT "a1"."uid", "a1"."rank_score", COUNT(*) AS "rank" FROM "sqlib_scoreboard_main" "a1", "sqlib_scoreboard_main" "a2" WHERE "a1"."sqid"=$1 AND "a1"."sboard_id"=$2 AND "a1"."uid"=$3 AND "a2"."sqid"=$1 AND "a2"."sboard_id"=$2 AND ("a2"."rank_score">"a1"."rank_score" OR "a2"."uid"="a1"."uid") GROUP BY "a1"."uid", "a1"."rank_score";';
		$sqlarr = array($sqid, $sboard_id, $uid);
	    }
	    
	    $res = pg_query_params($msqlc, $sqlstr, $sqlarr);
	    $arr = pg_fetch_all($res);

	    $ret_obj = array();
	    foreach($arr as $item)
	    {
		$obj = new stdClass();
		$obj->uid = intval($item['uid']);
		$obj->rank_score = doubleval($item['rank_score']);
		$obj->rank = intval($item['rank']);
		$obj->problem = array();

		$sqlstr = 'SELECT "proid", "best_score", "best_time", "is_ac", "ac_time", "tries_before_ac", "last_score", "last_status", "last_time", "tries", "rank_score" FROM "sqlib_scoreboard_pro" WHERE "sqid"=$1 AND "sboard_id"=$2 AND "uid"=$3 ORDER BY "proid";';
		$sqlarr = array($sqid, $sboard_id, $obj->uid);
		$res = pg_query_params($msqlc, $sqlstr, $sqlarr);
		$data = pg_fetch_all($res);
		foreach($data as $pro)
		{
		    $pobj = new stdClass();
		    $pobj->proid = intval($pro['proid']); ///
		    $pobj->best_score = doubleval($pro['best_score']);
		    $pobj->best_time = $pro['best_time'];
		    $pobj->is_ac = ($pro['is_ac']=='t');
		    $pobj->ac_time = $pro['ac_time'];
		    $pobj->tries_before_ac = intval($pro['tries_before_ac']);
		    $pobj->last_score = doubleval($pro['last_score']);
		    $pobj->last_status = intval($pro['last_status']);
		    $pobj->last_time = $pro['last_time'];
		    $pobj->tries = intval($pro['tries']);
		    $pobj->rank_score = doubleval($pro['rank_score']);

		    $proid = intval($pro['proid']);
		    $obj->problem[$proid] = $pobj;
		}
		array_push($ret_obj, $obj);
	    }	    
	    return $ret_obj;
	}

	public static function get_scoreboard_uid($sqlc, $msqlc, $sqid, $sboard_id, $score_func, $start_time = null, $end_time = null, $uid)
	{
	    return sqlib_scoreboard::get_scoreboard($sqlc, $msqlc, $sqid, $sboard_id, $score_func, $start_time, $end_time, null, null, $uid);
	}

	public static function update($sqlc, $msqlc, $sqid, $sboard_id, $score_func, $start_time, $end_time)
	{
	    $last_update = sqlib_scoreboard::get_last_update($msqlc, $sqid, $sboard_id);
	    $last_update_time = strtotime($last_update);
	    if(!$last_update)$last_update_time = 0;
	    if($last_update_time <= time()-2)
	    {
		sqlib_scoreboard::set_last_update($msqlc, $sqid, $sboard_id, !$last_update);
	    }
	    else return;
	    $last_update = date('Y-m-d H:i:s+08', $last_update_time);

	    //echo ('update!!'.$last_update.'<br>');
	    $sqlstr = 'SELECT DISTINCT "uid" FROM "submit" WHERE "last_update">=$4 AND "proid" IN (SELECT "proid" FROM "pro_sq" WHERE "sqid"=$1) AND "submit_time">=$2 AND "submit_time"<=$3;';
	    $sqlarr = array($sqid, $start_time, $end_time, $last_update);
	    $res = pg_query_params($sqlc, $sqlstr, $sqlarr);
	    $uid_list = pg_fetch_all_columns($res);
	    foreach($uid_list as $item)
	    {
		//echo($item.', ');
		$uid = intval($item);
		sqlib_scoreboard::update_user($sqlc, $msqlc, $sqid, $sboard_id, $score_func, $start_time, $end_time, $uid);		
	    }
	}

	public static function update_user($sqlc, $msqlc, $sqid, $sboard_id, $score_func, $start_time, $end_time, $uid)
	{
	    $sqlstr = 'SELECT "proid" FROM "pro_sq" WHERE "sqid"=$1;';
	    $sqlarr = array($sqid);
	    $res = pg_query_params($sqlc, $sqlstr, $sqlarr);
	    $proid_list = pg_fetch_all_columns($res, 0);

	    $total_rank_score = 0.0;
	    foreach($proid_list as $item)
	    {
		$proid = intval($item);
		$sqlstr = 'SELECT "result", "score", "submit_time" FROM "submit" WHERE "uid"=$1 AND "proid"=$2 AND "submit_time">=$3 AND "submit_time"<=$4 ORDER BY "submit_time";';
		$sqlarr = array($uid, $proid, $start_time, $end_time);
		$res = pg_query_params($sqlc, $sqlstr, $sqlarr);
		$sub_list = pg_fetch_all($res);
		
		$best_score = -1.0;
		$best_time = '1900-01-01 01:01:01+08';
		
		$is_ac = false;
		$ac_time = null;
		$tries_before_ac = 0;
		
		$tries = count($sub_list);
		$last_score = null;
		$last_status = null;
		$last_time = null;
		if($sub_list)
		{
		    $last_score = doubleval($sub_list[$tries-1]['score']);
		    $last_status = intval($sub_list[$tries-1]['result']);
		    $last_time = $sub_list[$tries-1]['submit_time'];
		
		    foreach($sub_list as $obj)
		    {
			$score = doubleval($obj['score']);
			$status = intval($obj['result']);
			$stime = $obj['submit_time'];
			if($score > $best_score)
			{
			    $best_score = $score;
			    $best_time = $stime;
			}
			if(!$is_ac)
			{
			    if($status == 0) // JUDGE_AC
			    {
				$is_ac = true;
				$ac_time = $stime;
			    }
			    else
			    {
			        $tries_before_ac += 1;
			    }
		        }
		    }
		}
		else
		{
		    $tries = 0;
		    $best_score = null;
		    $best_time = null;
		}

		if($score_func == null)$score_func = array('sqlib_scoreboard', 'def_func');
		$rank_score = $score_func($sqid, $proid, $best_score, $best_time, $is_ac, $ac_time, $tries_before_ac, $last_score, $last_status, $last_time, $tries);
		$sqlstr = 'SELECT COUNT(*) FROM "sqlib_scoreboard_pro" WHERE "sqid"=$1 AND "sboard_id"=$3 AND "proid"=$2 AND "uid"=$4;';
		$sqlarr = array($sqid, $proid, $sboard_id, $uid);
		$res = pg_query_params($msqlc, $sqlstr, $sqlarr);
		$cnt = intval(pg_fetch_result($res, 0));

		$sqlstr = 'UPDATE "sqlib_scoreboard_pro" SET "best_score"=$5, "best_time"=$6, "is_ac"=$7, "ac_time"=$8, "tries_before_ac"=$9, "last_score"=$10, "last_status"=$11, "last_time"=$12, "tries"=$13, "rank_score"=$14 WHERE "sqid"=$1 AND "sboard_id"=$2 AND "proid"=$3 AND "uid"=$4;';
		if($cnt==0)
		{
		    $sqlstr = 'INSERT INTO "sqlib_scoreboard_pro" ("sqid", "sboard_id", "proid", "uid", "best_score", "best_time", "is_ac", "ac_time", "tries_before_ac", "last_score", "last_status", "last_time", "tries", "rank_score") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);';
		}
		$sqlarr = array($sqid, $sboard_id, $proid, $uid, $best_score, $best_time, $is_ac?'t':'f', $ac_time, $tries_before_ac, $last_score, $last_status, $last_time, $tries, $rank_score);
		$res = pg_query_params($msqlc, $sqlstr, $sqlarr);
		//var_dump($sqlarr);
		$total_rank_score += $rank_score;
	    }

	    $sqlstr = 'SELECT COUNT(*) FROM "sqlib_scoreboard_main" WHERE "sqid"=$1 AND "sboard_id"=$2 AND "uid"=$3;';
	    $sqlarr = array($sqid, $sboard_id, $uid);
	    $res = pg_query_params($msqlc, $sqlstr, $sqlarr);
	    $cnt = intval(pg_fetch_result($res, 0));

	    $sqlstr = 'UPDATE "sqlib_scoreboard_main" SET "rank_score"=$4 WHERE "sqid"=$1 AND "sboard_id"=$2 AND "uid"=$3;';
	    if($cnt == 0)
	    {
		$sqlstr = 'INSERT INTO "sqlib_scoreboard_main" ("sqid", "sboard_id", "uid", "rank_score") VALUES ($1, $2, $3, $4);';
	    }
	    $sqlarr = array($sqid, $sboard_id, $uid, $total_rank_score);
	    $res = pg_query_params($msqlc, $sqlstr, $sqlarr);
	}
    }
?>
