<?php

require_once('common.inc.php');
require_once('user.inc.php');
require_once('problem.inc.php');

const SQUARE_USER_PENDING = 1;
const SQUARE_USER_ACTIVE = 2;
const SQUARE_USER_ADMIN = 3;

const SQUARE_PUBLIC = 3;
const SQUARE_AUTH = 2;
const SQUARE_PRIVATE = 1;

const SQUARE_NAME_LEN_MAX = 100;

class square
{
    public $sqid;
    public $publicity;
    public $start_time;
    public $end_time;
    public $sqname;
    public $sqmodname;

    public static function get($sqlc, $sqid)
    {
	//get square object from sqid
	//return the object found. False if no such record
	$sqlr = pg_query_params($sqlc, 'SELECT * FROM "square" WHERE "sqid"=$1 LIMIT 1;', array($sqid));
	$ret = pg_fetch_object($sqlr, null, 'square');
	pg_free_result($sqlr);
	if($ret)$ret->sqid = intval($ret->sqid);
	return $ret;	
    }

    public static function add($sqlc, $sq)
    {
	//add a square object
	//required member of sq : publicity, start_time, end_time, sqname, sqmodname
	//publicity : SQUARE_PUBLIC, SQUARE_AUTH, SQUARE_PRIVATE
	//return the object . False if failed.
	$sqlstr = 'INSERT INTO "square" ("publicity", "start_time", "end_time", "sqname", "sqmodname") VALUES ($1, $2, $3, $4, $5) RETURNING *;';
	$sqlarr = array($sq->publicity, $sq->start_time, $sq->end_time, $sq->sqname, $sq->sqmodname);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = pg_fetch_object($sqlr, null, 'square');
	pg_free_result($sqlr);
	if($ret)$ret->sqid = intval($ret->sqid);
	return $ret;
    }

    public static function edit($sqlc, $sqid, $sq)
    {
	//edit exist square data
	//required member of sq : publicity, start_time, end_time, sqname, sqmodname
	//publicity : SQUARE_PUBLIC, SQUARE_AUTH, SQUARE_PRIVATE
	//return edited object . False if failed.
	//
	//if puhlicity change SQUARE_AUTH => SQUARE_PUBLIC, 
	//set all SQUARE_USER_PENDING users to SQUARE_USER_ACTIVE.
	$oldsq = square::get($sqlc, $sqid);
	if($oldsq->publicity==SQUARE_AUTH && $sq->publicity==SQUARE_PUBLIC)
	{
	    $sqlstr = 'UPDATE "us_sq" SET "relationship"=$1 WHERE "sqid"=$2 AND "relationship"=$3;';
	    $sqlarr = array(SQUARE_USER_ACTIVE, $sqid, SQUARE_USER_PENDING);
	    $sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	}
	$sqlstr = 'UPDATE "square" SET "publicity"=$1, "start_time"=$2, "end_time"=$3, "sqname"=$4, "sqmodname"=$5 WHERE "sqid"=$6 RETURNING *;';
	$sqlarr = array($sq->publicity, $sq->start_time, $sq->end_time, $sq->sqname, $sq->sqmodname, $sqid);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = pg_fetch_object($sqlr, null, 'square');
	pg_free_result($sqlr);
	if($ret)$ret->sqid = intval($ret->sqid);
	return $ret;
    }

    public static function del($sqlc, $sqid)
    {
	//Delete the square $sqid. Also delete the user-square relation involves this square.
	//return false if failed.
	$sqlstr = 'DELETE FROM "square" WHERE "sqid"=$1;';
	$sqlstr2 = 'DELETE FROM "us_sq" WHERE "sqid"=$1;';
	$sqlr = pg_query_params($sqlc, $sqlstr, array($sqid));
	if(!$sqlr)return false;
	$sqlr = pg_query_params($sqlc, $sqlstr2, array($sqid));
	if(!$sqlr)return false;
	else return true;
    }

    public static function add_user($sqlc, $uid, $sqid, $relationship)
    {
	//add user into user-square relation.
	//return false if failed.
	$sqlstr = 'INSERT INTO "us_sq" ("uid", "sqid", "relationship") VALUES ($1, $2, $3) RETURNING *;';
	$sqlarr = array($uid, $sqid, $relationship);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = pg_fetch_object($sqlr);
	pg_free_result($sqlr);
	if(!$ret)return false;
	else return true;
    }

    public static function del_user($sqlc, $uid, $sqid)
    {
	//delete user from user-square relation.
	//return false if failed.
	$sqlstr = 'DELETE FROM "us_sq" WHERE "uid"=$1 AND "sqid"=$2;';
	$sqlarr = array($uid, $sqid);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	if(!$sqlr)return false;
	else return true;
    }

    public static function set_user_relationship($sqlc, $uid, $sqid, $relationship)
    {
	//update user relationship.
	//relationship: SQUARE_USER_PENDING, SQUARE_USER_ACTIVE, SQUARE_USER_ADMIN
	//return false if failed.
	$sqlr = pg_query_params($sqlc, 'UPDATE "us_sq" SET "relationship"=$3 WHERE "uid"=$1 AND "sqid"=$2;', array($uid, $sqid, $relationship));
	if(!$sqlr)return false;
	else return true;
    }    
    
    public static function get_user_relationship($sqlc, $uid, $sqid)
    {
	//get the relationship of uid,sqid from user-square relation.
	//Return the relationship. SQUARE_USER_PENDING, SQUARE_USER_ACTIVE, SQUARE_USER_ADMIN
	//return false if no record in the table;
	$sqlr = pg_query_params($sqlc, 'SELECT "relationship" FROM "us_sq" WHERE "uid"=$1 AND "sqid"=$2;', array($uid, $sqid));
	$ret = pg_fetch_result($sqlr, 0);
	if(!$ret)return false;
	else return intval($ret);
    }

    public static function get_available_sq($sqlc, $uid, $minpub)
    {
	//get all available square for given uid and publicity at least minpub. (not includes entered ones)
	//Return array of object, which contains each sqid, start_time, end_time, publicity, sqname, sqmodname
	//return empty array if no record in the table;
	$sqlstr = 'SELECT "sqid", "start_time", "end_time", "publicity", "sqname", "sqmodname" FROM "square" WHERE "sqid" NOT IN (SELECT "sqid" FROM "us_sq" WHERE "uid"=$1) AND "publicity" >= $2 ORDER BY (CASE WHEN "square"."end_time" IS NULL THEN "square"."sqid" ELSE 0 END), "square"."start_time", "square"."sqid";';
	$sqlarr = array($uid, $minpub);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = array();
	while($row = pg_fetch_object($sqlr))
	{
	    $row->sqid = intval($row->sqid);
	    array_push($ret, $row);
	}
	return $ret;
    }

    public static function get_entered_sq($sqlc, $uid)
    {
	//gel all entered square for given uid.
	//Return array of object, which contains each sqid, start_time, end_time, publicity, sqname, sqmodname, relationship
	//return empty array if no record in the table;
	$sqlstr = 'SELECT "square"."sqid", "square"."start_time", "square"."end_time", "square"."publicity", "square"."sqname", "square"."sqmodname", "us_sq"."relationship" FROM "us_sq" INNER JOIN "square" ON "us_sq"."sqid"="square"."sqid" WHERE "us_sq"."uid"=$1 ORDER BY (CASE WHEN "square"."end_time" IS NULL THEN "square"."sqid" ELSE 0 END), "square"."start_time", "square"."sqid";';
	$sqlarr = array($uid);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = array();
	while($row = pg_fetch_object($sqlr))
	{
	    $row->sqid = intval($row->sqid);
	    array_push($ret, $row);
	}
	return $ret;
    }

    public static function del_pro($sqlc, $proid, $sqid)
    {
	//Delete $proid from square $sqid.
	//Return true if success, false if failed.
	$sqlstr = 'DELETE FROM "pro_sq" WHERE "proid"=$1 AND "sqid"=$2;';
	$sqlarr = array($proid, $sqid);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	if(!$sqlr)
	    return false;
	return true;
    }
    
    public static function add_pro($sqlc, $proid, $sqid)
    {
	//Add problem $proid into square $sqid.
	//Return true if success, false if failed.
	$sqlstr = 'INSERT INTO "pro_sq" ("proid", "sqid") VALUES ($1, $2) RETURNING *;';
	$sqlarr = array($proid, $sqid);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = pg_fetch_result($sqlr, 0);
	if(!$ret)
	    return false;
	return true;
    }

    public static function is_pro_in_sq($sqlc, $proid, $sqid)
    {
	//Return whether problem $proid is in square $sqid or not.
	$sqlstr = 'SELECT COUNT(*) FROM "pro_sq" WHERE "proid"=$1 AND "sqid"=$2;';
	$sqlarr = array($proid, $sqid);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = intval(pg_fetch_result($sqlr, 0));
	return $ret > 0;
    }

    public static function get_sqmod($sqlc, $sqid)
    {
	//Return the sqmodname of square $sqid.
	$sqlstr = 'SELECT "sqmodname" FROM "square" WHERE "sqid"=$1;';
	$sqlarr = array($sqid);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = pg_fetch_result($sqlr, 0);
	return $ret;
    }

    public static function get_pro_list($sqlc, $sqid)
    {
	//get problem list of square $sqid.
	$sqlstr = 'SELECT "problem"."proid", "problem"."proname", "problem"."hidden" FROM "problem" INNER JOIN "pro_sq" ON "problem"."proid"="pro_sq"."proid" WHERE "pro_sq"."sqid"=$1 ORDER BY "problem"."proid";';
	$sqlarr = array($sqid);
	$sqlr = pg_query_params($sqlc, $sqlstr, $sqlarr);
	$ret = array();
	while($obj = pg_fetch_object($sqlr))
	{
	    $obj->proid = intval($obj->proid);
	    $obj->hidden = ($obj->hidden=='t');
	    array_push($ret, $obj);
	}
	return $ret;
    }
}

?>
