<?php

require_once('common.inc.php');
require_once('square.inc.php');
require_once('sqlib_scoreboard.inc.php');

function get_prob_stat_uid($sqlc, $msqlc, $sqid, $sboard_id, $uid)
{
    $sq = square::get($sqlc, $sqid);
    if(!$sq)die('Eno_such_sq');
    
    $data = sqlib_scoreboard::get_scoreboard_uid($sqlc, $msqlc, $sqid, $sboard_id, null, $sq->start_time, $sq->end_time, $uid);

    return $data[0];
}

?>
