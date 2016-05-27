jQuery(function ($) {
    'use strict';

    var progressColor = $('#Form_InfiniteScroll-dot-ProgressColor'),
        changeColor = function () {
            var $this = $(this);
            $this.css('background-color', $this.val());
        },
        updateColor = changeColor.bind(progressColor);

    updateColor();
    progressColor.on('keyup', changeColor);

    $('#Form_InfiniteScroll-dot-NavStyle').change(function () {
        progressColor.val($(this).val() === '1' ? '#86EA86' : '#38ABE3');
        updateColor();
    });

});
