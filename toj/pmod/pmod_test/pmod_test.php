<?php
require_once('problem.inc.php');
require_once('user.inc.php');

const PMODNAME = 'pmod_test';

function get_setting($prodir)
{
    $fd = fopen($prodir.'setting','r');
    $prestr = array();
    while($line = fgets($fd)){
        if($line[0] == '='){
	    break;
        }
        array_push($prestr, $line);
    }
    $set = '';
    while(($line = fgets($fd))){
        $set = $set.$line;
    }
    fclose($fd);

    return array($prestr, json_decode($set));
}

$action = $_POST['action'];
$data = json_decode($_POST['data']);

$proid = intval($data->proid);
if(gettype($proid) != 'integer' || $proid < 1){
    exit('Eproid');
}

$sqlc = db_connect();
if(!problem::is_available($sqlc,$proid)){
    exit('Epermission');
}

$pro = problem::get($sqlc, $proid);
if($pro->pmodname != PMODNAME)
    exit('Ewrong_pmod');

$prodir = '/srv/http/toj/center/pro/'.$proid.'/';

if($action=='get_pro_data')
{
    $content = file_get_contents($prodir.'public/content');

    echo(json_encode(array(
	'set' => get_setting($prodir)[1],
	'content' => $content
    )));
}
if($action=='set_pro_data')
{
    if(!sec_check_level($sqlc, USER_LEVEL_SUPERADMIN))
        die('Epermission_denied');

    $obj = get_setting($prodir);
    $prestr = $obj[0];
    $set = $obj[1];
    $set->timelimit = $data->timelimit;
    $set->memlimit = $data->memlimit;
    file_put_contents($prodir.'public/content', $data->content);

    $newstr = '';
    foreach($prestr as $s)
    {
        $newstr = $newstr.$s;
    }
    $newstr = $newstr."=====\n\n";
    $newstr = $newstr.json_encode($set);
    file_put_contents($prodir.'setting', $newstr);
}
if($action=='update_pro_testdata')
{
    if(!sec_check_level($sqlc, USER_LEVEL_SUPERADMIN))
	die('Epermission_denied');

    $count = $data->count;
    $score = $data->score;

    $obj = get_setting($prodir);
    $prestr = $obj[0];
    $set = $obj[1];
    $set->count = $count;
    $set->score = $score;

    $newstr = '';
    foreach($prestr as $s)
    {
        $newstr = $newstr.$s;
    }
    $newstr = $newstr."=====\n\n";
    $newstr = $newstr.json_encode($set);
    file_put_contents($prodir.'setting', $newstr);

    $tddir = $prodir.'/private/';
    for($idx = 0;$idx < $count;$idx++){
	$dst = $tddir.strval($idx + 1);
	mkdir($dst);

	$key = 'infile_'.strval($idx);
	if(array_key_exists($key,$_FILES)){
	    move_uploaded_file($_FILES[$key]["tmp_name"],$dst.'/in');
	}

	$key = 'ansfile_'.strval($idx);
	if(array_key_exists($key,$_FILES)){
	    move_uploaded_file($_FILES[$key]["tmp_name"],$dst.'/ans');
	}
    }
}

db_close($sqlc);
?>
