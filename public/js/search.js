
$(window).resize(function () {
    /*console.log($(window).width());*/
    if ($(window).width() > 500) {
        $('#sort-container').width('fit-content');
        $('.sort-section').show();
        $('.sort-section').css('opacity', '1');
        $('#close-button').hide();
        $('#sort-sidebar').css('overflow-y', 'visible');
        $('#sort-sidebar').css('max-height', 'unset');

    }
    if ($(window).width() <= 500 && $('#close-button').css('display') == 'none') {
        $('#sort-container').width('0');
        $('.sort-section').hide();
        $('.sort-section').css('opacity', '0');

    }
});

function setResize2() {
    /*console.log($(window).width());*/
    if ($(window).width() > 500) {
        $('.sort-section').show();

    }
    if ($(window).width() <= 500) {
        $('.sort-section').hide();

    }
}

setResize2();

$('#sort-main-title').click(function() {
    if ($('.sort-section').css('display') == 'none') {
        $('.sort-section').show(0).delay(10);
        $('#sort-sidebar').css('max-height', '500px');
        $('#sort-sidebar').css('overflow-y', 'scroll');
        $('.sort-section').css('opacity', '1');
    } else {
        $('.sort-section').delay(1000).hide(0);
        $('#sort-sidebar').css('overflow-y', 'hidden');
        $('#sort-sidebar').css('max-height', '58px');
        $('.sort-section').css('opacity', '0');
    }
});


console.log("search.js Loaded!");
