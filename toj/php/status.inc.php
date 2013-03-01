<?php
require_once('common.inc.php');
require_once('user.inc.php');
require_once('problem.inc.php');

const SUBMIT_COUNT_MAX = 100;
const SUBMIT_SLEEP_TIME = 2;
const SUBMIT_WAIT_MAX = 10;

class status
{
    public static function get_submit($sqlc, $filter, $sort, $count, $last_update, $admin)
    {
	//get submit from submit table. 
	//return an array with every entry an object of submission.
	$condstr = '';
	$ordstr = '';

	if($admin != true)
	{
	    $uid = $_COOKIE['uid'];
	    if(!sec_is_login())
		$uid = 0;
	    $condstr = $condstr.'("problem"."admin_uid"='.intval($uid).' OR "problem"."hidden"=\'f\') AND ';
	}

	if($last_update != null)
	{
	    $condstr = $condstr.'"last_update">\''.pg_escape_string($last_update).'\' AND ';
	}

	if($filter->userid != null)
	{
	    $condstr = $condstr.'"uid"='.pg_escape_string($filter->userid).' AND ';
	}
	if($filter->result != null)
	{
	    $condstr = $condstr.'"result"='.pg_escape_string($filter->result).' AND ';
	}
	if($filter->proid != null)
	{
	    $condstr = $condstr.'"proid"='.pg_escape_string($filter->proid).' AND ';
	}	
	if($filter->lang != null)
	{
	    $condstr = $condstr.'"lang"='.pg_escape_string($filter->lang).' AND ';
	}
	if($sort->score != null)
	{
	    $relstr = $sort->score[0]==0 ? '<=' : '>=';  
	    $condstr = $condstr.'"score"'.$relstr.pg_escape_string($sort->score[1]).' AND ';
	    $ordstr = $ordstr.'"score" '.($sort->score[0]==0 ? 'DESC' : 'ASC').' ,';
	}
	if($sort->runtime != null)
	{
	    $relstr = $sort->runtime[0]==0 ? '<=' : '>=';  
	    $condstr = $condstr.'"runtime"'.$relstr.pg_escape_string($sort->runtime[1]).' AND ';
	    $ordstr = $ordstr.'"runtime" '.($sort->runtime[0]==0 ? 'DESC' : 'ASC').' ,';
	}	
	if($sort->maxmem != null)
	{
	    $relstr = $sort->maxmem[0]==0 ? '<=' : '>=';  
	    $condstr = $condstr.'"memory"'.$relstr.pg_escape_string($sort->maxmem[1]).' AND ';
	    $ordstr = $ordstr.'"memory" '.($sort->maxmem[0]==0 ? 'DESC' : 'ASC').' ,';
	}
	if($sort->subid != null)
	{
	    $relstr = $sort->subid[0]==0 ? '<' : '>';  
	    $condstr = $condstr.'"subid"'.$relstr.pg_escape_string($sort->subid[1]);
	    $ordstr = $ordstr.'"subid" '.($sort->subid[0]==0 ? 'DESC' : 'ASC');
	}


	$sqlstr = 'SELECT "submit".*, "user"."nickname" FROM ("submit" INNER JOIN "user" ON "submit"."uid"="user"."uid") INNER JOIN "problem" ON "submit"."proid"="problem"."proid" WHERE '.$condstr.' ORDER BY '.$ordstr.' LIMIT '.pg_escape_string($count).';';

	//echo($sqlstr.'<br>'); 
	$sqlr = pg_query($sqlc, $sqlstr);
	//return pg_fetch_object($sqlr);	
	$ret = array();
	while($obj = pg_fetch_object($sqlr))
	{
	    $obj->subid = intval($obj->subid);
	    $obj->uid = intval($obj->uid);
	    $obj->proid = intval($obj->proid);
	    $obj->result = intval($obj->result);
	    $obj->runtime = intval($obj->runtime);
	    $obj->memory = intval($obj->memory);
	    $obj->score = intval($obj->score);
	    $obj->lang = intval($obj->lang);

	    array_push($ret, $obj);
	}
	
	return $ret;
    }
    
    public static function get_by_subid($sqlc, $subid)
    {
	//get submit information by subid.
	//return submit information.

	$sqlstr = 'SELECT "submit".*, "mod"."smodname" FROM ("submit" INNER JOIN "problem" ON "submit"."proid"="problem"."proid") INNER JOIN "mod" ON "problem"."modid"="mod"."modid" WHERE "subid"=$1;';
	$sqlarr = array($subid);
	$sqlr = pg_query_params($sqlstr, $sqlarr);
	$ret = pg_fetch_object($sqlr);
	if(!$ret)
	    die('Eno_such_subid');
	$ret->subid = intval($ret->subid);
	$ret->proid = intval($ret->proid);
	$ret->uid = intval($ret->uid);
	$ret->result = intval($ret->result);
	$ret->memory = intval($ret->memory);
	$ret->score = intval($ret->score);
	$ret->lang = intval($ret->lang);

	return $ret;
    }
    
    public static function subid_is_available($sqlc, $subid)
    {
	//decide whether subid is visible or not.
	//Return true if OK, false if permission denied or failed.
	$sub = status::get_by_subid($sqlc, $subid);
	if(!$sub)
	    return false;
	$ret = problem::is_available($sqlc, $sub->proid);
	if(!$ret)
	    return false;
	return true;
    }
}

?>
