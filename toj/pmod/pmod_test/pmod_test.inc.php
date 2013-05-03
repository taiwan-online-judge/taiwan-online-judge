<?php
require_once('problem.inc.php');
require_once('user.inc.php');

function event_create($proid)
{
    $sqlc = db_connect();

    $proid = intval($proid);
    $prodir = '/srv/http/toj/center/pro/'.$proid.'/';

    mkdir($prodir);
    mkdir($prodir.'public/');
    mkdir($prodir.'private/');

    $set = new stdClass();
    $set->timelimit = 0;
    $set->memlimit = 0;
    $set->count = 0;
    $set->score = array();
    $newstr = "jmod_test\njmod_test_check\n=====\n\n".json_encode($set);

    file_put_contents($prodir.'public/content', '');
    file_put_contents($prodir.'setting', $newstr);

    db_close($sqlc);
}

?>
