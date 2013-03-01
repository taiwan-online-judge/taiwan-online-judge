<?php

require_once('../../php/common.inc.php');

const TEAM_TYPE_BOY = 1;
const TEAM_TYPE_GIRL = 2;
const TEAM_TYPE_COL = 3;
const TEAM_TYPE_TEA = 4;

function get_teamid($msqlc, $term, $uid)
{
    //Return the teamid of $uid. False if not exists.
    $sqlstr = 'SELECT "teamid" FROM "sqmod_sprout_team" WHERE "term"=$1 AND "uid"=$2;';
    $sqlarr = array($term, $uid);
    $res = pg_query_params($msqlc, $sqlstr, $sqlarr);
    $teamid = pg_fetch_result($res, 0);
    return $teamid;
}

function get_team_member($msqlc, $term, $teamid)
{
    //Return all team member uid, level of team $teamid. False if not exists.
    $sqlstr = 'SELECT "sqmod_sprout_team"."uid", "sqmod_sprout_team"."level", "sqmod_sprout_student"."name" FROM "sqmod_sprout_team" INNER JOIN "sqmod_sprout_student" ON "sqmod_sprout_team"."uid"="sqmod_sprout_student"."uid" WHERE "sqmod_sprout_team"."term"=$1 AND "sqmod_sprout_team"."teamid"=$2 ORDER BY "sqmod_sprout_team"."level" DESC, "sqmod_sprout_team"."uid";';
    $sqlarr = array($term, $teamid);
    $res = pg_query_params($msqlc, $sqlstr, $sqlarr);
    $ret = array();
    while($obj = pg_fetch_object($res))
    {
	$obj->uid = intval($obj->uid);
	$obj->level = intval($obj->level);
	array_push($ret, $obj);
    }
    return $ret;
}


?>
