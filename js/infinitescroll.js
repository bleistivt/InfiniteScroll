//jQuery :inview selector by https://github.com/luis-almeida
$w = $(window);
$.extend($.expr[':'], {
	inview: function(el) {
		var $e = $(el),
			wt = $w.scrollTop(),
			wb = wt + $w.height(),
			et = $e.offset().top,
			eb = et + $e.height();
		return eb >= wt && et <= wb;
	}
});

jQuery(function($) {
	var ajax; //true if new content is being loaded right now
	var pagesLoaded = 1;
	var pagesBefore = gdn.definition('InfiniteScroll_Page') - 1;
	var totalPages = gdn.definition('InfiniteScroll_Pages', 1);
	var countComments = gdn.definition('InfiniteScroll_CountComments');
	var perPage = gdn.definition('InfiniteScroll_PerPage');
	var inDiscussion = gdn.definition('InfiniteScroll_InDiscussion', false);
	var url = gdn.definition('InfiniteScroll_Url', false);
	var discussionUrl = url;
	var isLastPage, isFirstPage;
	var LoadingBar = $('<span class="Progress"></span>');
	var Dummy = $('<div/>');
	var LastInview;
	var throttle = 0;

	//selector for default theme and vanilla-bootstrap
	var DataListSelector = '#Content ul.DataList, main.page-content ul.DataList';
	var ContentSelector = '#Content, main.page-content';
	var NavIndex = $('#NavIndex');
	var Panel = $('#Panel, aside.page-sidebar');
	var panelTop = Panel.offset().top;
	var DataList, MessageList, Content, CommentForm;

	function preparation(page) {
		isLastPage = isFirstPage = false;
		DataList = $(DataListSelector);
		MessageList = $('div.MessageList.Discussion');
		Content = $(ContentSelector);
		CommentForm = Content.find('.CommentForm');
		var checkDom = (page === false);
		//hide the pagers on both ends
		if (page == totalPages || (checkDom && $('#PagerAfter a.Next').length === 0)) {
			$('#PagerAfter').hide();
			isLastPage = true;
		}
		if (page == 1 || (checkDom && $('#PagerBefore a.Previous').length === 0)) {
			$('#PagerBefore').hide();
			isFirstPage = true;
		}
		//to prevent page jumping on short content, extend the content area
		if (isLastPage && !isFirstPage && inDiscussion) {
			var dummyHeight = $(window).height() - (Content.position().top + Content.outerHeight());
			if (dummyHeight > 0) {
				Dummy.css('min-height', dummyHeight);
				Content.prepend(Dummy);
			}
		}
		//don't show the comment form (yet)
		if (!isLastPage)
			CommentForm.hide();
	}
	preparation(gdn.definition('InfiniteScroll_Page', false));

	//create the progress bar
	if (inDiscussion) {
		var ProgressBar = new Nanobar({
			bg: gdn.definition('InfiniteScroll_ProgressBg'),
			id: 'ProgressBar'
		});
	}

	function infiniteScroll() {
		//throttle the event handling
		var now = Date.now();
		if (now > throttle + 100) {
			throttle = now;
			if (discussionUrl)
				updateUrl();
			if (inDiscussion)
				updateIndex();
		}
		if (ajax)
			return;
		var PagerAfterA = $('#PagerAfter:inview a.Next');
		var PagerBeforeA = $('#PagerBefore:inview a.Previous');
		//scrolling down
		if (PagerAfterA.length > 0) {
			ajax = true; //block new requests
			PagerAfter = PagerAfterA.parent();
			//DeliveryType=Asset can not be used as it doesn't include the pager
			$.get(PagerAfterA.attr('href'), function(data) {
				//extract and append the content
				$(DataListSelector, data)
					.contents()
					.appendTo(DataList)
					.effect('highlight', {}, 'slow');
				//extract the pager if it is not the last
				if ($('#PagerAfter a.Next', data).length > 0) {
					PagerAfter.replaceWith($('#PagerAfter', data));
				} else {
					PagerAfter.remove();
					CommentForm.show();
				}
				pagesLoaded++;
			}).always(function() {
				//allow new requests, even if this request failed somehow
				ajax = false;
			});
			//show a loading indicator
			PagerAfter.html(LoadingBar);
		//scrolling up
		} else if (PagerBeforeA.length > 0) {
			ajax = true;
			PagerBefore = PagerBeforeA.parent();
			$.get(PagerBeforeA.attr('href'), function(data) {
				var OldHeight = $(document).height();
				var OldScroll = $(window).scrollTop();
				$(DataListSelector, data)
					.contents()
					.prependTo(DataList)
					.effect("highlight", {}, "slow");
				//prepend the first post of a discussion
				$('div.ItemDiscussion', data).appendTo(MessageList);
				if ($('#PagerBefore a.Previous', data).length > 0)
					PagerBefore.replaceWith($('#PagerBefore', data));
				else
					PagerBefore.remove();
				Dummy.remove();
				//the scroll position needs to be adjusted when prepending content
				$(document).scrollTop(OldScroll + $(document).height() - OldHeight);
				pagesLoaded++;
				pagesBefore--;
			}).always(function() {
				ajax = false;
			});
			PagerBefore.html(LoadingBar);
		}
	}

	function updateUrl() {
		//last comment that is visible in the viewport
		LastInview = $('li.Item:inview', DataList).last();
		//use the helper <span> to update the url
		var page = LastInview.find('span.ScrollMarker').data('page');
		var newState = discussionUrl + '/p' + ((page !== null) ? page : 1);
		if (newState != url)
			{history.replaceState(null, null, newState);}
		url = newState;
	}

	function updateIndex(force) {
		if (!LastInview || force)
			LastInview = $('li.Item:inview', DataList).last();
		//calculate the actual index of last comment visible in viewport
		var index = pagesBefore * perPage + LastInview.index() + 1;
		NavIndex.text(index);
		//prevent nanobar-bug (also prevent the bar from disappearing completely)
		ProgressBar.go(index / countComments * 99.9);
	}

	function jumpToEnd(direction) {
		//check if we can just scroll
		var full;
		if (pagesLoaded == totalPages)
			full = true;
		if (!direction && (isFirstPage || full)) {
			$('html, body').animate({scrollTop: 0},
				400, 'swing', function() {updateIndex(true);});
			return;
		} else if (direction && (isLastPage || full)) {
			$('html, body').animate({scrollTop: $('#Form_Comment').offset().top},
				400, 'swing', function() {updateIndex(true);});
			return;
		}
		if (ajax)
			return;
		ajax = true;
		//true = jump to bottom, false = jump to top
		var pageNo = (direction) ? totalPages : 1;
		Content.css('opacity', 0);
		$('#PageProgress').show();
		$.get(discussionUrl + '/p' + pageNo, function(data) {
		//drop everything and just load the first/last set of posts
				Content.replaceWith($(ContentSelector, data));
				preparation((direction) ? totalPages : 1);
				pagesLoaded = 1;
				pagesBefore = pageNo - 1;
				if (!direction)
					$('html, body').animate({scrollTop: 0},
						400, 'swing', function() {updateIndex(true);});
				else
					$('html, body').animate(
						{scrollTop: $('#Form_Comment').offset().top},
						400, 'swing', function() {updateIndex(true);});
		}).always(function() {
			ajax = false;
			Content.css('opacity', 1);
			$('#PageProgress').hide();
			infiniteScroll();
		});
	}

	$(window).scroll(infiniteScroll);
	//trigger for short content
	infiniteScroll();

	if (gdn.definition('InfiniteScroll_FixedPanel', false)) {
		//make the viewport "pick up" the Panel when scrolling down
		$(window).scroll(function () {
			var st = $(this).scrollTop();
			if (st >= panelTop)
				Panel.addClass('InfScrollFixed');
			else
				Panel.removeClass('InfScrollFixed').css('margin-top', 0);
		});
		//if the panel is too high for the viewport, add "fake" scrolling
		var difference = Panel.height() - $(window).height();
		if (difference > 0) {
			difference += 50;
			var track = 0;
			Panel.on('DOMMouseScroll mousewheel', function(e) {
				if (!Panel.hasClass('InfScrollFixed'))
					return false;
				if ((e.originalEvent.detail > 0 || e.originalEvent.wheelDelta < 0) && track > -difference) {
					track -= 50;
					Panel.stop().animate({marginTop: track + 'px'}, 'fast', 'easeOutCirc');
				} else if (track < 0) {
					track += 50;
					Panel.stop().animate({marginTop: track + 'px'}, 'fast', 'easeOutCirc');
				}
				return false;
			});
		}
	}

	$('#InfScrollJTT').click(function(e) {e.preventDefault(); jumpToEnd(false);});
	$('#InfScrollJTB').click(function(e) {e.preventDefault(); jumpToEnd(true);});

});
