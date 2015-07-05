/*jslint browser: true, white: true */
/*global window, jQuery, gdn, Nanobar*/

jQuery(function ($) {
    'use strict';

    ///////////////////////////////////////////////////////////////////////////
    // Variables
    ///////////////////////////////////////////////////////////////////////////


    // Shorthand method for gdn.definition
    function def(definition, defaultVal) {
        return gdn.definition('InfiniteScroll.' + definition, defaultVal);
    }

    // Initialize variables and get the plugins configuration from the definitions.
    var $window = $(window),
        $document = $(document),
        historySupport = !!(window.history && window.history.replaceState),
        ajax,
        pagesBefore = def('Page', 1) - 1,
        totalPages = def('TotalPages', 1),
        pageNext = pagesBefore + 2,
        countItems = def('CountItems'),
        perPage = def('PerPage'),
        inDiscussion = def('InDiscussion', false),
        hideHead = def('HideHead', true),
        treshold = def('Treshold', 300),
        baseUrl = def('Url', false),
        Dummy = $('<div/>'),
        throttle = 0,
        scrollstop = null,
        ProgressBar,
        // Selectors for default theme, Bitter Sweet and Bootstrap
        DataListSelector = '#Content ul.DataList.Comments, ' +
            'main.page-content ul.DataList.Comments, ' +
            '#Content ul.DataList.Discussions, ' +
            'main.page-content ul.DataList.Discussions, ' +
            '#Content table.DataTable.DiscussionsTable tbody, ' +
            'main.page-content table.DataTable.DiscussionsTable tbody',
        ContentSelector = '#Content, main.page-content',
        NavIndex = $('#InfScrollNav .NavIndex'),
        HeadElemsSelector = '#Head, .BreadcrumbsWrapper, #Item_0, h2.CommentHeading, ' +
            'div.PageDescription, h1.HomepageTitle, nav.navbar-static-top, .ChildCategoryList, ' +
            'span.Breadcrumbs, #Content .DismissMessage, main.page-content .DismissMessage, ' +
            '#Frame > .Banner, #Frame > .Top, .well.search-form, .Top .Button.NewDiscussion',
        Panel = $('#Panel, aside.page-sidebar'),
        InfScrollJT = $('#InfScrollJT'),
        Frame = $('#Frame'),
        PageProgress = $('#PageProgress'),
        HeadElems,
        DataList,
        DataListOffset,
        MessageList,
        Content;


    if (!Frame.length && $.fn.spin) {
        Frame = $('body > *');
        PageProgress.spin({lines: 11, radius: 10, length: 10, width: 4});
    }

    // Create the progress bar using the Nanobar plugin.
    ProgressBar = new Nanobar({
        bg: countItems !== 1 ? def('ProgressBg') : 'transparent',
        id: 'ProgressBar',
        target: def('NavStyle', 0) !== 0 ? $('#InfScrollNav .PageCount')[0] : null
    });


    ///////////////////////////////////////////////////////////////////////////
    // Functions
    ///////////////////////////////////////////////////////////////////////////


    // The core logic to check if an element is (nearly) visible in the viewport.
    function inview(element, offset) {
        if (element === null || element === undefined) {
            return false;
        }
        offset = offset || 0;

        var windowTop = window.pageYOffset,
            windowBottom = windowTop + window.innerHeight,
            elementTop = 0,
            elementBottom,
            traverse = element;

        while (traverse && !isNaN(traverse.offsetTop)) {
            elementTop += traverse.offsetTop;
            traverse = traverse.offsetParent;
        }
        elementBottom = elementTop + element.clientHeight;

        return elementBottom > windowTop - offset && elementTop <= windowBottom + offset;
    }


    // Toggles the visibility of elements that should only be shown on the first page.
    function toggleHead(toggle) {
        if (hideHead) {
            HeadElems.css('visibility', toggle ? 'visible' : 'hidden');
            Panel.toggle(toggle);
        }
    }


    // Prepares the page for infinite scrolling and can be called repeatedly.
    function preparation(page) {
        var isLastPage = false,
            isFirstPage = false,
            dummyHeight;
        pagesBefore = page - 1;
        pageNext = page + 1;
        HeadElems = $(HeadElemsSelector);
        DataList = $(DataListSelector);
        MessageList = $('div.MessageList.Discussion');
        Content = $(ContentSelector);

        DataList
            .children().first().find(':not(tr)')
            .first().prepend('<a id="Page_' + page + '"/>');

        // Remove the pagers on both ends.
        if (page === totalPages) {
            $('#PagerAfter').remove();
            isLastPage = true;
        }
        if (page === 1) {
            $('#PagerBefore').remove();
            isFirstPage = true;
        }
        $('.Pager').css('visibility', 'hidden');
        if (!isLastPage) {
            Content.find('.CommentForm').hide();
        }

        // Hide the Head elements and the Panel.
        toggleHead(isFirstPage);

        // To prevent page jumping on short content, extend the content area.
        if (isLastPage && !isFirstPage) {
            dummyHeight = $window.height();
            if (dummyHeight > 0) {
                Dummy.css('min-height', dummyHeight);
                Content.prepend(Dummy);
            }
        }

        // Make sure the offset is never undefined.
        DataListOffset = DataList.offset() || Content.offset();
        if (!isFirstPage && !location.hash) {
            $document.scrollTop(DataListOffset.top);
        }
    }


    // Updates the navigation index and browser history state.
    function updateIndex() {
        if (ajax) {
            return;
        }
        // Get first and last comment visible in the viewport.
        var ItemsInview = $('.Item', DataList).filter(function (ignore, element) {
                return inview(element);
            }),
            FirstInview = ItemsInview.first(),
            LastInview = ItemsInview.last(),

            // Calculate the actual index of the last comment currently visible.
            listIndex = LastInview.index('.DataList.Comments > .Item, .DataList.Discussions > .Item, tbody > .Item') + 1,
            index = pagesBefore * perPage + listIndex + (inDiscussion ? 1 : 0),
            page = pagesBefore + Math.floor((listIndex - ItemsInview.length) / perPage) + 1,

            // Don't add the hash on the first discussion post.
            item0Inview = (pagesBefore === 0) ? inview(MessageList[0]) : false,
            hash = (inDiscussion && FirstInview[0] && !item0Inview) ? '#' + FirstInview[0].id : '',
            newState;

        if (!LastInview.length) {
            if (window.pageYOffset > DataListOffset.top) {
                index = countItems;
                page = totalPages;
            } else {
                index = 1;
                page = 1;
            }
        }

        newState = (page !== 1 || inDiscussion) ? baseUrl + '/p' + page + hash : baseUrl;
        if (newState !== window.location.href && historySupport) {
            history.replaceState(null, null, newState);
        }
        if (!InfScrollJT.is(':focus')) {
            InfScrollJT.val(page).data('page', page.toString());
        }
        NavIndex.text(index);
        // 99.9% to prevent the progress bar from disappearing completely.
        ProgressBar.go(index / countItems * 99.9);
    }


    // Show a loading indicator
    function showLoading(elem) {
        elem = $('<div class="ScrollProgress"/>').insertBefore(elem);

        if ($.fn.spin) {
            elem.spin({lines: 9, radius: 6, length: 6, width: 3});
        } else {
            elem.html('<span class="Progress"/>');
        }
    }


    // Load the next page. Called by InfiniteScroll().
    function loadNext(PagerAfter) {
        // Block new requests.
        ajax = true;
        showLoading(PagerAfter);

        $.get(baseUrl + '/p' + pageNext + '?DeliveryType=VIEW&InnerList=1', function (data) {
            // Extract and append the content.
            $(data)
                .appendTo(DataList)
                .first().addClass('InfScrollHighlight')
                .find(':not(tr)').first().prepend('<a id="Page_' + pageNext + '"/>');

            pageNext += 1;

            // Show the comment form if we have reached the last page.
            if (pageNext > totalPages) {
                Content.find('.CommentForm').show();
                $(PagerAfter).remove();
            }

            $document.trigger('CommentPagingComplete');
        }).always(function () {
            // Allow new requests, even if this request failed somehow.
            ajax = false;
            $('.ScrollProgress').remove();
            updateIndex();
        });
    }


    // Load the previous page. Called by InfiniteScroll().
    function loadPrevious(PagerBefore) {
        ajax = true;
        showLoading(PagerBefore);

        // DeliveryType=VIEW can not be used here as it doesn't include the first post.
        $.get(baseUrl + '/p' + pagesBefore, function (data) {
            var OldHeight = $document.height(),
                OldScroll = $window.scrollTop();

            $(DataListSelector, data)
                .children().prependTo(DataList)
                .last().addClass('InfScrollHighlight')
                .end()
                .first().find(':not(tr)')
                .first().prepend('<a id="Page_' + pagesBefore + '"/>');


            // Prepend the first post of a discussion.
            $('div.ItemDiscussion', data).appendTo(MessageList);

            pagesBefore -= 1;

            if (pagesBefore === 0) {
                $(PagerBefore).remove();
                toggleHead(true);
            }

            Dummy.remove();
            // The scroll position needs to be adjusted when prepending content.
            $document.scrollTop(OldScroll + $document.height() - OldHeight);
            // Recalculate the DataList offset.
            DataListOffset = DataList.offset();

            $document.trigger('CommentPagingComplete');
        }).always(function () {
            ajax = false;
            $('.ScrollProgress').remove();
            updateIndex();
        });
    }


    // Main scroll handler: loads new content if the end of the page is reached.
    function infiniteScroll() {
        var PagerAfter,
            PagerBefore,
            now = Date.now();

        // Throttle event handling for expensive functions.
        if (now > throttle + 100) {
            throttle = now;
            updateIndex();
        }

        // Is a new request possible?
        if (ajax || (pagesBefore < 1 && totalPages < pageNext)) {
            return;
        }

        // Check if we are close enough to the pagers.
        PagerAfter = document.getElementById('PagerAfter');
        PagerBefore = document.getElementById('PagerBefore');

        // Scrolling down
        if (inview(PagerAfter, treshold) && pageNext <= totalPages) {
            loadNext(PagerAfter);
        // Scrolling up
        } else if (inview(PagerBefore, treshold) && pagesBefore > 0) {
            loadPrevious(PagerBefore);
        }
    }


    // Scroll to any page. Used by jumpTo().
    function scrollTo(page) {
        if (page === -1) {
            page = DataListOffset.top + DataList.height();
        } else if (page < 2) {
            page = inDiscussion ? $('#Item_0').offset().top : 0;
            toggleHead(true);
        } else {
            page = $('#Page_' + page).offset().top;
        }
        return $('html, body').animate({scrollTop: page});
    }


    // Jump to any page. This is used for the navigation.
    function jumpTo(page) {
        if (ajax) {
            return;
        }
        // 0,1 = Item_0; -1 = CommentForm; >1 = page
        var scrollPage = page;
        if (page < 2) {
            page = (page === -1) ? totalPages : 1;
        }

        // Check if we can just scroll.
        if (pagesBefore < page && page < pageNext) {
            scrollTo(scrollPage).promise().always(function () {
                infiniteScroll();
            });
            return;
        }

        // We can't scroll. Drop all content and load the requested page.
        ajax = true;
        Content.css('visibility', 'hidden');
        PageProgress.show();

        $.get(baseUrl + '/p' + page, function (data) {
            Content.replaceWith($(ContentSelector, data));
            preparation(page);
            scrollTo(scrollPage)
                .promise()
                .always(function () {
                    ajax = false;
                    infiniteScroll();
                });
        }).always(function () {
            Content.css('visibility', 'visible');
            PageProgress.hide();
        });
    }


    ///////////////////////////////////////////////////////////////////////////
    // document.ready (like everything before)
    ///////////////////////////////////////////////////////////////////////////


    // Prevent the browser from jumping between hashes on the first load.
    ajax = true;
    setTimeout(function () {
        if (location.hash) {
            location.hash = location.hash.toString();
        }
        ajax = false;
        infiniteScroll();
    }, 500);

    // Prepare the page and attach the scroll handler.
    preparation(def('Page', 1));
    $window.scroll(infiniteScroll);

    // Update the url when scrolling abruptly stops.
    $window.scroll(function () {
        if (scrollstop !== null) {
            clearTimeout(scrollstop);
        }
        scrollstop = setTimeout(infiniteScroll, 100);
    });


    // Navigation box
    $('#InfScrollNav .JTT').click(function (e) {
        e.preventDefault();
        jumpTo(0);
    });
    $('#InfScrollNav .JTB').click(function (e) {
        e.preventDefault();
        jumpTo(-1);
    });

    // Jump box
    $document.click(function (e) {
        var Nav = $('#InfScrollNav');
        if (!$(e.target).closest(Nav).length) {
            Nav.removeClass('active');
        } else if ($(e.target).closest('#InfScrollNav .PageCount').length) {
            Nav.addClass('active');
            // Don't bring up the numpad on touch devices
            if (!def('Mobile', false) || def('NavStyle', 0) !== 1) {
                InfScrollJT.focus();
            }
        }
    });

    // Hotkey to jump between pages.
    $document.keypress(function (e) {
        if ($(e.target).is('input, textarea')) {
            return;
        }
        var charCode = (e.which === 'undefined') ? e.keyCode : e.which;
        if (String.fromCharCode(charCode) === def('Hotkey', 'j').charAt(0)) {
            $('#InfScrollNav .PageCount').click();
        } else if (charCode === 13 && $('#InfScrollNav').is('.active')) {
            $('#InfScrollNav form.JumpTo').submit();
        }
    });

    InfScrollJT.focus(function () {
        InfScrollJT.one('mouseup', function () {
            InfScrollJT.select();
            return false;
        }).select();
    }).focusout(function () {
        // Mobile Chrome does not autosubmit a number input.
        if (InfScrollJT.data('page') !== InfScrollJT.val() && def('Mobile', false)) {
            InfScrollJT.data('page', InfScrollJT.val()).parent().submit();
        }
    });

    $('#InfScrollNav form.JumpTo').submit(function () {
        var page = parseInt(InfScrollJT.val(), 10);
        if (0 < page && page <= totalPages) {
            jumpTo(page);
        }
        return false;
    });

    // Increment comment count when a new comment was added.
    $document.on('CommentAdded', function () {
        countItems += 1;
        $('#InfScrollNav .PageCount span.small').text(countItems);
        infiniteScroll();
    });

});
