'use strict'

var index = new function(){
    var that = this;
    var active_menutag = function(){
        $('#index_menutag').addClass('active');
    };
    var inactive_menutag = function(){
        if($(window).scrollTop() > 8 && !$('#index_menu').hasClass('active')){
            $('#index_menutag').removeClass('active');
        }
    };
    var active_paneltag = function(){
        $('#index_paneltag').addClass('active');
    };
    var inactive_paneltag = function(){
        if($(window).scrollTop() > 8 && !$('#index_panel').hasClass('active')){
            $('#index_paneltag').removeClass('active');
        }
    };
    var active_menu = function(){
        $('#index_menu').addClass('active');
        active_menutag();
    };
    var inactive_menu = function(){
        $('#index_menu').removeClass('active');
        inactive_menutag();
    };
    var active_panel = function(){
        $('#index_panel').addClass('active');
        active_paneltag();
    };
    var inactive_panel = function(){
        $('#index_panel').removeClass('active');
        inactive_paneltag();
    };
    
    that.ready = function(){
        var j_win = $(window);
        var j_menutag = $('#index_menutag');
        var j_menu = $('#index_menu');
        var j_paneltag = $('#index_paneltag');
        var j_panel = $('#index_panel');

        j_win.on('scroll',function(e){
            if($(window).scrollTop() <= 8){
                active_menutag();
                active_paneltag();
            }else{
                inactive_menutag();
                inactive_paneltag();
            }
        });
        j_win.on('mouseover',function(e){
            var j_e;
            
            j_e = $(e.target);
            if(!j_e.is(j_menutag) && j_e.parents('#index_menutag').length == 0 &&
               !j_e.is(j_menu) && j_e.parents('#index_menu').length == 0){

                inactive_menu();
            }
        });
        j_win.on('click',function(e){
            var j_e;
            
            j_e = $(e.target);
            if(!j_e.is(j_paneltag) && j_e.parents('#index_paneltag').length == 0 &&
               !j_e.is(j_panel) && j_e.parents('#index_panel').length == 0){

                inactive_panel();
            }
        });

        j_menutag.find('div.menu').on('mouseover',function(e){
            active_menu();
        });
        j_paneltag.find('div.notice').on('click',function(e){
            if($('#index_panel').hasClass('active')){
                inactive_panel();
            }else{
                active_panel();
            }   
        });

    };
};
