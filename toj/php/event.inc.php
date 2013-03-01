<?php
class event
{
    private static $white_list;

    private static function init()
    {
	event::$white_list = array('10.8.0.2');
    }

    // execute function $name in file $fname
    // if want to call a function of a class, have 2 choice:
    // 1. pass an array as $name, put every level of class in it, like:
    //   A::B::C() should be passed like array("A", "B", "C").
    // 2. pass a string with :: directly, it will be automatically 
    //   translated.
    // return value will be FALSE on failure, return value of target
    // function otherwise. NULL when no return value.
    public static function exec_func($fname, $name, $arg)
    {
	if(!file_exists($fname))
	{
	    return false;
	}
	require_once($fname);
	if(is_string($name) && strpos($name, ":") !== FALSE)
	{
	    $name = preg_split("/::/", $name);
	}
	if(is_string($name) && !is_callable($name))
	{
	    return false;
	}
	if(is_array($name) && !is_callable(join($name, "::")))
	{
	    return false;
	}
	if($arg == NULL)
	{
	    $res = call_user_func($name);
	}
	else
	{
	    $res = call_user_func_array($name, $arg);
	}
	if($res === false)
	{
	    return false;
	}
	return $res;
    }

    public static function validate_ip()
    {
	event::init();
	if (!empty($_SERVER['HTTP_CLIENT_IP']))
	{
	    $ip=$_SERVER['HTTP_CLIENT_IP'];
	}
	else if (!empty($_SERVER['HTTP_X_FORWARDED_FOR']))
	{
	    $ip=$_SERVER['HTTP_X_FORWARDED_FOR'];
	}
	else
	{
	    $ip=$_SERVER['REMOTE_ADDR'];
	}
	return in_array($ip, event::$white_list);
    }
}
?>
