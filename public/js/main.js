
$(document).ready(function(){
    if ($(document).width() <= 500) {
        $('#hamburger-button').click(function() {
            $('nav').width('60%');
            $('nav > li > a').show();
            $('#close-button').css('display', 'block');

        });

        $('#close-button').click(function() {
            $('nav').width('0');
            $('#close-button').hide();
            $('nav > li > a').hide();
        })
    }


    $(docuemnt).resize(function() {
        if ($(docuemnt).width() > 500) {
            $('nav').width('60%');
        }
    });

});


console.log("main.js Loaded!");
