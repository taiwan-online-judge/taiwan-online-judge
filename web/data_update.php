<?php
require_once('common.php');
require_once('status_submit_list.php');
require_once('square_list.php');
require_once('square_rank_list.php');
require_once('square_problem_list.php');
require_once('square_scoreboard_list.php');
require_once('problem_view.php');

set_time_limit(0);

$paramo = json_decode($_POST['param']);
if($paramo == null){
    exit('Eerror');
}
$laststamp = $paramo->laststamp;
if($laststamp == null){
    return 'Eerror';
}

$sqlc = pg_connect('host=localhost port=5432 dbname='.DB_NAME.' user='.DB_USER.' password='.DB_PASSWORD);

$retry = 8;
while(true){
    $sqlr = pg_query($sqlc,'SELECT "timestamp",array_to_string("status",\',\') AS status FROM "submit" ORDER BY "timestamp" DESC LIMIT 1;');
    $sqlo = pg_fetch_object($sqlr);

    $nowstamp = $sqlo->timestamp.'_'.$sqlo->status;
    pg_free_result($sqlr);

    if($nowstamp != $laststamp){
	break;
    }

    if(($retry--) > 0){
	sleep(1);
    }else{
	pg_close($sqlc);
	exit('Esame');
    }
}

$ret = array(
    'laststamp' => $nowstamp
);
if($paramo->status_submit_list != null){
    $ret['status_submit_list'] = status_submit_list($sqlc,$paramo->status_submit_list,false);
}
if($paramo->status_submit_userlist != null){
    $ret['status_submit_userlist'] = status_submit_list($sqlc,$paramo->status_submit_userlist,true);
}

if($paramo->problem_log_submit_acceptlist != null){
    $ret['problem_log_submit_acceptlist'] = status_submit_list($sqlc,$paramo->problem_log_submit_acceptlist,false);
}
if($paramo->problem_log_submit_alllist != null){
    $ret['problem_log_submit_alllist'] = status_submit_list($sqlc,$paramo->problem_log_submit_alllist,false);
}

if($paramo->square_list != null){
    $ret['square_list'] = square_list($sqlc,$paramo->square_list);
}

if($paramo->square_rank_list != null){
    $ret['square_rank_list'] = square_rank_list($sqlc,$paramo->square_rank_list);
}
if($paramo->square_problem_list != null){
    $ret['square_problem_list'] = square_problem_list($sqlc,$paramo->square_problem_list);
}
if($paramo->square_scoreboard_list != null){
    $ret['square_scoreboard_list'] = square_scoreboard_list($sqlc,$paramo->square_scoreboard_list);
}

if($paramo->problem_view != null){
    $ret['problem_view'] = problem_view($sqlc,$paramo->problem_view);
}

pg_close($sqlc);

echo json_encode($ret);
?>
