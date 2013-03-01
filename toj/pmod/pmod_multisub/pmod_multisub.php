<?php
require_once('../../php/problem.inc.php');

const PMODNAME = 'pmod_multisub';

function get_set($prodir)
{
    $fd = fopen($prodir.'setting','r');
    while($line = fgets($fd))
    {
	if($line[0] == '=')break;
    }
    $set = '';
    while(($line = fgets($fd)))
    {
	$set = $set.$line;
    }
    fclose($fd);
    return json_decode($set);
}

$sqlc = db_connect();

$proid = json_decode($_POST['proid']);
if(gettype($proid) != 'integer' || $proid < 1){
    exit('Eproid');
}

if(!problem::is_available($sqlc, $proid)){
    exit('Epermission');
}

$pro = problem::get($sqlc, $proid);
if($pro->pmodname != PMODNAME)
    exit('Ewrong_pmod');

$prodir = '/srv/http/toj/center/pro/';

$redir = file_get_contents($prodir.$proid.'/redirect');
if($redir)
{
    $ret = new stdClass();
    $ret->redirect = intval($redir);
    exit(json_encode($ret));
}

$ret = new stdClass();

$mfile = file_get_contents($prodir.$proid.'/multiset');
$multiset = json_decode($mfile);

$main_cont = file_get_contents($prodir.$proid.'/public/main_content');
$ret->main_content = $main_cont;
$ret->pro = array();
$ret->proname = $multiset->proname;

foreach($multiset->prolist as $spro)
{
    $apro = new stdClass();
    $apro->proid = $spro->proid;
    $apro->score = $spro->score;
    $apro->partname = $spro->partname;

    $apro->content = file_get_contents($prodir.$apro->proid.'/public/content');
    $setting = get_set($prodir.$apro->proid.'/');
    $apro->timelimit = $setting->timelimit;
    $apro->memlimit = $setting->memlimit;
    $apro->partition = new stdClass();
    $apro->partition->count = $setting->count;
    $apro->partition->score = $setting->score;

    array_push($ret->pro, $apro);
}

echo(json_encode($ret));
db_close($sqlc);
?>
