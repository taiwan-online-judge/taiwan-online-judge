<?php
require_once('common.php');

function problem_view($sqlc,$paramo){
    $proid = $paramo->proid;
    $infoonly = $paramo->infoonly;

    if(gettype($proid) != 'integer' || $proid < 1){
	return null;
    }

    $sqlc = pg_connect('host=localhost port=5432 dbname='.DB_NAME.' user='.DB_USER.' password='.DB_PASSWORD);

    $proid = pg_escape_string($proid);
    $sqlr = pg_query_params($sqlc,'SELECT * FROM "problem" WHERE proid=$1 LIMIT 1;',
	    array($proid));
    if(($proo = pg_fetch_object($sqlr)) == null){
	pg_free_result($sqlr);
	return null;
    }

    if($infoonly){
	$proo = array(
	    'acceptcount' => $proo->acceptcount,
	    'submitcount' => $proo->submitcount);
    }else{
	$setting_info = parse_ini_file('pro/'.$proo->proid.'/'.$proo->proid.'_setting.txt',true);
	$proo = array(
	    'proid' => $proo->proid,
	    'proname' => $proo->proname,
	    'timelimit' => $setting_info['JUDGE']['timelimit'],
	    'memlimit' => $setting_info['JUDGE']['memlimit'],
	    'acceptcount' => $proo->acceptcount,
	    'submitcount' => $proo->submitcount,
	    'protext' => file_get_contents('pro/'.$proo->proid.'/'.$proo->proid.'_text.txt'));
    }

    pg_free_result($sqlr);
    return $proo;
}
?>
