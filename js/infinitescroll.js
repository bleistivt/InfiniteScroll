//check if an element is inside the viewport
function infScrollInview(el, offset) {
	if (el === null)
		return false;
	var wt = window.pageYOffset || document.documentElement.scrollTop,
		wb = wt;
	if (typeof(window.innerHeight) == 'number')
		wb = wt + window.innerHeight;
	else if (document.documentElement && document.documentElement.clientHeight)
		wb = wt + document.documentElement.clientHeight;
	var et = 0, ell = el;
	while (ell && !isNaN(ell.offsetTop)) {
		et += ell.offsetTop;
		ell = ell.offsetParent;
	}
	var eb = et + el.clientHeight;
	return eb >= wt - offset && et <= wb + offset;
}
//extend jQuery with :infscrollinview selector
jQuery.extend(jQuery.expr[':'], {
	infscrollinview: function(el) {return infScrollInview(el, 0);}
});

jQuery(function($) {
	var ajax, //true if new content is being loaded right now
		pagesLoaded = 1,
		pagesBefore = gdn.definition('InfiniteScroll_Page') - 1,
		totalPages = gdn.definition('InfiniteScroll_Pages', 1),
		pageNext = pagesBefore + 2,
		countComments = gdn.definition('InfiniteScroll_CountComments'),
		perPage = gdn.definition('InfiniteScroll_PerPage'),
		inDiscussion = gdn.definition('InfiniteScroll_InDiscussion', false),
		treshold = gdn.definition('InfiniteScroll_Treshold', 300),
		url = gdn.definition('InfiniteScroll_Url', false),
		discussionUrl = url,
		isLastPage, isFirstPage,
		LoadingBar = $('<span class="Progress"/>'),
		Dummy = $('<div/>'),
		LastInview,
		navOpen = !inDiscussion,
		throttle = 0;
	//selector for default theme and vanilla-bootstrap
	var DataListSelector = '#Content ul.DataList, main.page-content ul.DataList',
		ContentSelector = '#Content, main.page-content',
		NavIndex = $('#NavIndex'),
		Panel = $('#Panel, aside.page-sidebar'),
		InfScrollJT = $('#InfScrollJT'),
		panelTop = Panel.offset().top,
		panelHeight = Panel.height(),
		DataList, MessageList, Content, CommentForm;

	function preparation(page) {
		isLastPage = isFirstPage = false;
		pagesBefore = page - 1;
		pageNext = page + 1;
		DataList = $(DataListSelector);
		MessageList = $('div.MessageList.Discussion');
		Content = $(ContentSelector);
		CommentForm = Content.find('.CommentForm');
		DataList.children().data('page', page);
		DataList.children().first().prepend('<a id="Page_' + page + '"/>');
		var checkDom = (page === false);
		//hide the pagers on both ends
		if (page == totalPages || (checkDom && !$('#PagerAfter a.Next').length)) {
			$('#PagerAfter').hide();
			isLastPage = true;
		}
		if (page == 1 || (checkDom && !$('#PagerBefore a.Previous').length)) {
			$('#PagerBefore').hide();
			isFirstPage = true;
		}
		//to prevent page jumping on short content, extend the content area
		if (isLastPage && !isFirstPage && inDiscussion) {
			var dummyHeight = $(window).height() -
				(Content.position().top + Content.outerHeight());
			if (dummyHeight > 0) {
				Dummy.css('min-height', dummyHeight);
				Content.prepend(Dummy);
			}
		}
		//don't show the comment form (yet)
		if (!isLastPage)
			CommentForm.hide();
	}

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
		var PagerAfter = document.getElementById('PagerAfter'),
			PagerBefore = document.getElementById('PagerBefore'),
			PagerAfterInView = infScrollInview(PagerAfter, treshold),
			PagerBeforeInView = infScrollInview(PagerBefore, treshold);
		if (!(PagerAfterInView || PagerBeforeInView))
			return;
		var PagerAfterA = $('a.Next', PagerAfter),
			PagerBeforeA = $('a.Previous', PagerBefore);
		//scrolling down
		if (PagerAfterInView && PagerAfterA.length > 0) {
			ajax = true; //block new requests
			PagerAfter = $(PagerAfter);
			//DeliveryType=Asset can not be used as it doesn't include the pager
			$.get(PagerAfterA.attr('href'), function(data) {
				//extract and append the content
				$(DataListSelector, data)
					.children()
					.appendTo(DataList)
					.addClass('InfScrollHighlight')
					.data('page', pageNext)
					.first()
					.prepend('<a id="Page_' + pageNext + '"/>');
				//extract the pager if it is not the last
				if ($('#PagerAfter a.Next', data).length > 0) {
					PagerAfter.replaceWith($('#PagerAfter', data));
				} else {
					PagerAfter.remove();
					CommentForm.show();
				}
				pagesLoaded++;
				pageNext++;
			}).always(function() {
				//allow new requests, even if this request failed somehow
				ajax = false;
			});
			//show a loading indicator
			PagerAfter.html(LoadingBar);
		//scrolling up
		} else if (PagerBeforeInView && PagerBeforeA.length > 0) {
			ajax = true;
			PagerBefore = $(PagerBefore);
			$.get(PagerBeforeA.attr('href'), function(data) {
				var OldHeight = $(document).height();
				var OldScroll = $(window).scrollTop();
				$(DataListSelector, data)
					.children()
					.prependTo(DataList)
					.addClass('InfScrollHighlight')
					.data('page', pagesBefore)
					.first()
					.prepend('<a id="Page_' + pagesBefore + '"/>');
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
		LastInview = $('li.Item:infscrollinview', DataList).last();
		//use the added data to update the url
		var page = LastInview.data('page');
		page = (page !== null) ? page : 1;
		var newState = discussionUrl + '/p' + page;
		if (newState != url)
			history.replaceState(null, null, newState);
		url = newState;
		if (!(navOpen && InfScrollJT.is(':focus')))
			InfScrollJT.val(page);
	}

	function updateIndex() {
		if (!LastInview)
			LastInview = $('li.Item:infscrollinview', DataList).last();
		//calculate the actual index of last comment visible in viewport
		var index = pagesBefore * perPage + LastInview.index() + 2;
		if (!LastInview.length) {
			var wt = window.pageYOffset || document.documentElement.scrollTop;
			index = (wt > CommentForm.offset().top + 100) ? countComments : 1;
		}
		NavIndex.text(index);
		//prevent nanobar-bug (also prevent the bar from disappearing completely)
		ProgressBar.go(index / countComments * 99.9);
	}

	function jumpTo(page) {
		if (ajax)
			return;
		//0,1 = top; -1 = CommentForm; >1 = page
		var jumpto = false,
			bottom = (page == -1) ? true : false;
		if (page < 2) {
			jumpto = (page == -1) ? CommentForm.offset().top : 0;
			page = (page == -1) ? totalPages : 1;
		}
		//check if we can just scroll
		if ((pagesLoaded == totalPages) || (pagesBefore < page && page < pageNext)) {
			if (jumpto === false)
				jumpto = $('#Page_' + page).offset().top;
			$('html, body').animate({scrollTop: jumpto}, 400, 'swing',
				function() {
					updateUrl();
					updateIndex();
				});
			return;
		}
		if (ajax)
			return;
		ajax = true;
		Content.css('opacity', 0);
		$('#PageProgress').show();
		$.get(discussionUrl + '/p' + page, function(data) {
		//drop everything and just load the first/last set of posts
			Content.replaceWith($(ContentSelector, data));
			preparation(page);
			pagesLoaded = 1;
			pagesBefore = page - 1;
			pageNext = pagesBefore + 2;
			if (jumpto === false)
				jumpto = $('#Page_' + page).offset().top;
			else if (bottom)
				jumpto = CommentForm.offset().top;
			$('html, body').animate({scrollTop: jumpto})
				.promise()
				.always(function() {
					ajax = false;
					infiniteScroll();
				});
		}).always(function() {
			Content.css('opacity', 1);
			$('#PageProgress').hide();
		});
	}

	if (gdn.definition('InfiniteScroll_Active', false)) {
		preparation(gdn.definition('InfiniteScroll_Page', false));
		$(window).scroll(infiniteScroll);
		//trigger for short content
		infiniteScroll();
		$('#InfScrollJTT').click(function(e) {e.preventDefault(); jumpTo(0);});
		$('#InfScrollJTB').click(function(e) {e.preventDefault(); jumpTo(-1);});
		//jump to page navigation input box
		$(document).click(function(e) {
			var Nav = $('#InfScrollNav');
			if (!$(e.target).closest(Nav).length) {
				Nav.removeClass('active');
				navOpen = false;
			} else if ($(e.target).closest('#InfScrollPageCount').length) {
				Nav.addClass('active');
				navOpen = true;
				InfScrollJT.focus().select();
			}
		});
		InfScrollJT.click(function() {InfScrollJT.select();});
		$('#InfScrollJumpTo').submit(function() {
			var page = parseInt(InfScrollJT.val(), 10);
			if (0 < page && page <= totalPages)
				jumpTo(page);
			return false;
		});
		//increment comment count when a new comment was added
		$(document).on('CommentAdded', function() {
			countComments++;
			$('#InfScrollPageCount span.small').text('/' + countComments);
			updateUrl();
			updateIndex();
			DataList.children().last().data('page', pageNext - 1);
		});
	} else {
		Content = $(ContentSelector);
	}

	//Sticky Panel
	var difference, track, panelScrollActive;
	function panelScrollInit() {
		difference = Panel.height() - $(window).height();
		track = 0;
		Panel.css('margin-top', 0);
		panelScrollActive = false;
		if (difference > 0) {
			difference += 30;
			panelScrollActive = true;
		}
	}
	if (gdn.definition('InfiniteScroll_FixedPanel', false)) {
		//make the viewport "pick up" the Panel when scrolling down
		$(window).scroll(function() {
			var st = $(this).scrollTop();
			if (st >= panelTop && Content.height() > panelHeight)
				Panel.addClass('InfScrollFixed');
			else
				Panel.removeClass('InfScrollFixed').css('margin-top', 0);
		});
		//if the panel is too high for the viewport, add "fake" scrolling
		$(window).resize(panelScrollInit);
		panelScrollInit();
		//overflow: auto; cannot be used as it cuts off the notifications popup
		Panel.on('DOMMouseScroll mousewheel', function(e) {
			if (!panelScrollActive || !Panel.hasClass('InfScrollFixed'))
				return;
			if ((e.originalEvent.detail > 0 || e.originalEvent.wheelDelta < 0) &&
				track > -difference) {
				track -= (track < 50 - difference) ? 0 : 50;
				Panel.stop().animate({marginTop: track + 'px'}, 'fast', 'easeOutCirc');
			} else if (track < 0) {
				track += (track > -50) ? 0 : 50;
				Panel.stop().animate({marginTop: track + 'px'}, 'fast', 'easeOutCirc');
			}
			return false;
		});
	}
});
