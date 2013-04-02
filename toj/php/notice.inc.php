<?php
require_once('common.inc.php');
require_once('user.inc.php');

const NOTICE_DEF_LIM = 5;
const NOTICE_MAX_LIM = 30;

const NOTICE_ACT_CNT = 1;
const NOTICE_ACT_NEW = 2;
const NOTICE_ACT_OLD = 4;

const NOTICE_TYP_USR = 1;
const NOTICE_TYP_PRO = 2;
const NOTICE_TYP_SQR = 3;
const NOTICE_TYP_ALL = 255;

class notice
{
    private static function ins_uid($sqlc, $uid)
    {
	$sqlstr = 'INSERT INTO "notice_cache" ("uid", "tim", "cnt", "tmp", "rsv") VALUES ($1, $2, $3, $4, $5) RETURNING *;';
	$sqlarr = array($uid, date("Y-m-d H:i:s"), 0, "0", "0");
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = pg_fetch_object($sqlr);
	pg_free_result($sqlr);
	return $ret;
    }

    public static function is_match($sqlc, $uid, &$not)
    {
	if($not->typ == NOTICE_TYP_ALL)
	{
	    return true;
	}
	if($not->typ == NOTICE_TYP_USR)
	{
	    return $uid == intval($not->val);
	}
	require_once('event.inc.php');
	if($not->typ == NOTICE_TYP_PRO)
	{
	    if(!event::exec_func('problem.inc.php', 'problem::is_available', array($sqlc, $not->val, $uid)))
	    {
		return false;
	    }
	    return true;
	}
	else if($not->typ == NOTICE_TYP_SQR)
	{
	    $ret = event::exec_func('square.inc.php', 'square::get_user_relationship', array($sqlc, $uid, $not->val));
	    if($ret >= SQUARE_USER_ACTIVE)
	    {
		return true;
	    }
	    return false;
	}
	return false;
    }

    private static function update($sqlc, $uid, &$tar, &$arr)
    {
	if(count($arr) <= 0)
	{
	    return false;
	}
	$sqlstr = 'UPDATE "notice_cache" SET "tmp"=$1, "cnt"=$2, "tim"=$4 WHERE "uid"=$3 RETURNING *;';
	$sqlarr = array($arr[0], intval($tar->cnt)+count($arr), $uid, date('Y-m-d H:i:s'));
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = pg_fetch_object($sqlr);
	pg_free_result($sqlr);
	foreach($arr as $it)
	{
	    $sqlstr = 'INSERT INTO "user_notice" ("uid", "nid") VALUES ($1, $2);';
	    $sqlarr = array(intval($uid), intval($it));
	    $sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	    pg_free_result($sqlr);
	}
	return $ret;
    }
    
    private static function check_new($sqlc, $uid)
    {
	$sqlstr = 'SELECT * FROM "notice_cache" WHERE "uid"=$1;';
	$sqlarr = array($uid);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = pg_fetch_object($sqlr);
	if($ret === false)
	{
	    $ret = notice::ins_uid($sqlc, $uid);
	}
	pg_free_result($sqlr);
	$sqlstr = 'SELECT * FROM "notice" WHERE "nid" > $1 ORDER BY "tim";';
	$sqlarr = array(intval($ret->tmp));
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$buf = array();
	while($row = pg_fetch_object($sqlr))
	{
	    if(self::is_match($sqlc, $uid, $row))
	    {
		array_unshift($buf, $row->nid);
	    }
	}
	pg_free_result($sqlr);
	if(count($buf) > 0)
	{
	    return self::update($sqlc, $uid, $ret, $buf);
	}
	return $ret;
    }

    // **warning**: this function will clear notice count of uid!!
    public static function get($sqlc, $uid, $typ, $arg1, $arg2)
    {
	$uid = intval($uid);
	if(!$uid || !$sqlc)
	{
	    return false;
	}
	$ret = self::check_new($sqlc, $uid);
	if($typ == NOTICE_ACT_CNT)
	{
	    return intval($ret->cnt);
	}
	else if($typ == NOTICE_ACT_NEW)
	{
	    if($ret->cnt == 0)
	    {
		return array();
	    }
	    $sqlstr = 'SELECT "nid" FROM "user_notice" WHERE "uid"=$1 AND "nid">$2 ORDER BY "nid" DESC';
	    $sqlarr = array($uid, intval($ret->rsv));
	    $sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	    $nids = array();
	    while($it=pg_fetch_array($sqlr))
	    {
		$nids[] = $it[0];
	    }
	    $sqlstr = 'SELECT * FROM "notice" WHERE "nid" IN ('.join($nids, ",").') ORDER BY "tim";';
	    $sqlr = pg_query($sqlc, $sqlstr);
	    $buf = array();
	    while($it = pg_fetch_object($sqlr))
	    {
		$it->nid = intval($it->nid);
		$it->typ = intval($it->typ);
		$buf[] = $it;
	    }
	    pg_free_result($sqlr);
	    $sqlstr = 'UPDATE "notice_cache" SET "cnt"=0, "rsv"=$2 WHERE "uid"=$1;';
	    $sqlarr = array($uid, $nids[0]);
	    $sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	    return $buf;
	}
	else if($typ == NOTICE_ACT_OLD)
	{
	    if($arg2 <= 0)
	    {
		$arg2 = 1;
	    }
	    if($arg2 > NOTICE_MAX_LIM)
	    {
		$arg2 = NOTICE_MAX_LIM;
	    }
	    $sqlstr = 'SELECT "nid" FROM "user_notice" WHERE "uid"=$1 AND "nid"<$2 ORDER BY "nid" DESC LIMIT $3';
	    $sqlarr = array($uid, $arg1, $arg2);
	    $sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	    $nids = array();
	    while($it=pg_fetch_array($sqlr))
	    {
		$nids[] = $it[0];
	    }
	    $sqlstr = 'SELECT * FROM "notice" WHERE "nid" IN ('.join($nids, ",").') ORDER BY "tim";';
	    $sqlr = pg_query($sqlc, $sqlstr);
	    $buf = array();
	    while($it = pg_fetch_object($sqlr))
	    {
		$it->nid = intval($it->nid);
		$it->typ = intval($it->typ);
		$buf[] = $it;
	    }
	    pg_free_result($sqlr);
	    return $buf;
	}
	return false;
    }

    public static function clr($sqlc, $uid, $lim=NOTICE_DEF_LIM)
    {
	return false;
	if($lim < 0)
	{
	    $lim = 0;
	}
	$ret = self::check_new($sqlc, $uid);
	$buf = preg_split("/[,]/", $ret->tmp);
	$buf = array_slice($buf, 0, $ret->cnt+$lim);
	$sqlstr = 'UPDATE "notice_cache" SET "tmp"=$1 WHERE "uid"=$2;';
	$sqlarr = array(join($buf, ","), $uid);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	if($sqlr)
	{
	    return count($buf);
	}
	return false;
    }

    // you can add notice by calling it.
    public static function add($sqlc, $typ, $val, $txt)
    {
	if(!is_string($val))
	{
	    $val = json_encode($val);
	}
	$sqlstr = 'INSERT INTO "notice" ("typ", "val", "txt", "tim") VALUES ($1, $2, $3, $4) RETURNING *;';
	$sqlarr = array($typ, $val, $txt, date('Y-m-d H:i:s'));
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = pg_fetch_object($sqlr);
	if($ret === false)
	{
	    return false;
	}
	return json_encode($ret);
    }

    public static function del($sqlc, $cond)
    {
	$sqlstr = 'DELETE FROM "notice" WHERE 0';
	if(isset($cond['nid']))
	{
	    $sqlstr .= ' OR "nid"=$1';
	}
	if(isset($cond['tim']))
	{
	    $sqlstr .= ' OR "tim" >= $2';
	}
	$sqlarr = array($cond['nid'], $cond['tim']);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	if(!$sqlr)
	{
	    return false;
	}
	return true;
    }
}
?>
