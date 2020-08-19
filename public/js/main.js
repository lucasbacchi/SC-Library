
$(document).ready(function(){
    if ($(document).width() <= 500) {
        $('#hamburger-button').click(function() {
            $('nav').width('60%');
            $('nav > li > a').show();
            $('nav > li > a').css('opacity', '1');
            $('#close-button').css('display', 'block');
            $('#close-button').css('opacity', '1');

        });

        $('#close-button').click(function() {
            $('nav').width('0');
            $('#close-button').delay(400).hide(0);
            $('nav > li > a').css('opacity', '0');
            $('#close-button').css('opacity', '0');
            $('nav > li > a').delay(400).hide(0);
        })
    }


    $(document).resize(function() {
        if ($(document).width() > 500) {
            $('nav').width('60%');
            $('nav > li > a').show();
            $('nav > li > a').css('opacity', '1');

        }
    });

});


console.log("main.js Loaded!");
