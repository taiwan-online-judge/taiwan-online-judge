<?php
//
require_once('common.inc.php');

function get_teamid($msqlc, $term, $uid)
{
    $sqlstr = 'SELECT "teamid" FROM "sqmod_sprout_team" WHERE "term"=$1 AND "uid"=$2;';
    $sqlarr = array($term, $uid);
    $res = pg_query_params($sqlstr, $sqlarr);
    $teamid = pg_fetch_result($res, 0);
    return $teamid;
}

function get_team_member($msqlc, $term, $teamid)
{
    $sqlstr = 'SELECT "uid", "level" FROM "sqmod_sprout_team" WHERE "term"=$1 AND "teamid"=$2 ORDER BY "level" DESC, "uid";';
    $sqlarr = array($term, $teamid);
    $res = pg_query_params($sqlstr, $sqlarr);
    $ret = array();
    while($obj = pg_fetch_object($res))
    {
	array_push($ret, $obj);
    }
    return $ret;
}


?>
