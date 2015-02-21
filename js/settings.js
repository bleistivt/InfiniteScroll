jQuery(function ($) {
    'use strict';

    var oldColor = false,
        green = '#86EA86',
        progressColor = $('#Form_InfiniteScroll-dot-ProgressColor'),
        changeColor = function () {
            var $this = $(this);
            $this.css('background-color', $this.val());
        },
        updateColor = changeColor.bind(progressColor);

    updateColor();
    progressColor.on('keyup', changeColor);

    $('#Form_InfiniteScroll-dot-NavStyle').change(function () {
        if ($(this).val() === '1') {
            oldColor = progressColor.val();
            progressColor.val(green);
        } else if (progressColor.val() === green && oldColor) {
            progressColor.val(oldColor);
        }
        updateColor();
    });

});
