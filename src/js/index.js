'use strict'

var index = new function(){
    var that = this;
    var j_win;
    var j_menutag;
    var j_menu;
    var j_paneltag;
    var j_panel;
    var j_header;
    var j_alertbox;

    function active_menutag(){
        j_menutag.addClass('active');
    };
    function inactive_menutag(){
        if(j_win.scrollTop() > 8 && !j_menu.hasClass('active')){
            j_menutag.removeClass('active');
        }
    };
    function active_paneltag(){
        j_paneltag.addClass('active');
    };
    function inactive_paneltag(){
        if(j_win.scrollTop() > 8 && !j_panel.hasClass('active')){
            j_paneltag.removeClass('active');
        }
    };
    function active_menu(){
        j_menu.addClass('active');
        active_menutag();
    };
    function inactive_menu(){
        j_menu.removeClass('active');
        inactive_menutag();
    };
    function active_panel(){
        j_panel.addClass('active');
        active_paneltag();
    };
    function inactive_panel(){
        j_panel.removeClass('active');
        inactive_paneltag();
    };
    
    that.ready = function(){
        j_win = $(window);
        j_menutag = $('#index_menutag');
        j_menu = $('#index_menu');
        j_paneltag = $('#index_paneltag');
        j_panel = $('#index_panel');
        j_header = $('#index_header');
        j_alertbox = $('#index_alert');
        
        j_win.on('scroll',function(e){
            if(j_win.scrollTop() <= 8){
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
            if(j_panel.hasClass('active')){
                inactive_panel();
            }else{
                active_panel();
            }   
        });

        user.login_callback.add(function(){
            var j_li;
            
            j_li = j_menu.find('div.menu li.profile')
            j_li.find('a').attr('href','/toj/user:' + user.uid + '/main/'); 
            j_li.show();

            j_menu.find('div.menu li.mail').show();
        });
    };
    that.set_title = function(title){
        j_header.find('p.title').text(title); 
    };
    that.set_menu = function(tag){
        j_menutag.find('div.menu').text(tag); 
    };
    that.add_tabnav = function(text,link){
        var j_li = $('<li><a></a></li>');
        var j_a = j_li.find('a');
        
        j_a.text(text);
        j_a.attr('href',link);

        j_header.find('ul.tabnav').append(j_li);        

        j_li.active = function(){
            j_header.find('ul.tabnav > li.active').removeClass('active');
            j_li.addClass('active');
        };

        return j_li;
    };
    that.clear_tabnav = function(){
        j_header.find('ul.tabnav').empty();        
    };
    that.add_alert = function(type,title,content,autofade){
        var j_alert;

        j_alert = $('<div class="alert fade in"><button type="button" class="close" data-dismiss="alert">&times;</button><strong></strong>&nbsp<span></span></div>');

        j_alert.addClass(type);
        j_alert.find('strong').text(title);
        j_alert.find('span').text(content);

        if(autofade != false){
            setTimeout(function(){
                j_alert.alert('close');
            },10000);
        }

        j_alertbox.prepend(j_alert);
    };
};
