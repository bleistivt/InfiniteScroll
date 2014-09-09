//check if an element is inside the viewport
function infScrollInview(el, offset) {
	if (el === null || el === undefined)
		return false;
	var wt = window.pageYOffset || document.documentElement.scrollTop,
		wb = wt;
	if (typeof(window.innerHeight) == 'number')
		wb = wt + window.innerHeight;
	else if (document.documentElement && document.documentElement.clientHeight)
		wb = wt + document.documentElement.clientHeight;
	var et = 0,
		ell = el;
	while (ell && !isNaN(ell.offsetTop)) {
		et += ell.offsetTop;
		ell = ell.offsetParent;
	}
	var eb = et + el.clientHeight;
	return eb > wt - offset && et <= wb + offset;
}
//extend jQuery with :infscrollinview selector
jQuery.extend(jQuery.expr[':'], {
	infscrollinview: function(el) {
		return infScrollInview(el, 0);
	}
});

jQuery(function($) {
	var $window = $(window),
		$document = $(document),
		ajax, //true if new content is being loaded right now
		pagesLoaded = 1,
		pagesBefore = gdn.definition('InfiniteScroll_Page') - 1,
		totalPages = gdn.definition('InfiniteScroll_Pages', 1),
		pageNext = pagesBefore + 2,
		countComments = gdn.definition('InfiniteScroll_CountComments'),
		perPage = gdn.definition('InfiniteScroll_PerPage'),
		inDiscussion = gdn.definition('InfiniteScroll_InDiscussion', false),
		shortkey = gdn.definition('InfiniteScroll_Shortkey', 'j'),
		hideHead = gdn.definition('InfiniteScroll_HideHead', true),
		fixedPanel = gdn.definition('InfiniteScroll_FixedPanel', false),
		treshold = gdn.definition('InfiniteScroll_Treshold', 300),
		url = gdn.definition('InfiniteScroll_Url', false),
		baseUrl = url,
		isLastPage, isFirstPage,
		LoadingBar = $('<span class="Progress"/>'),
		Dummy = $('<div/>'),
		FirstInview,
		LastInview,
		navOpen = !inDiscussion,
		throttle = 0,
		unload = false;
	//selector for default theme and vanilla-bootstrap
	var DataListSelector = '#Content ul.DataList, main.page-content ul.DataList',
		ContentSelector = '#Content, main.page-content',
		NavIndex = $('#NavIndex'),
		HeadElemsSelector = '#Head, .BreadcrumbsWrapper, #Item_0, h2.CommentHeading, ' +
		'div.PageDescription, h1.HomepageTitle, nav.navbar-static-top, span.Breadcrumbs',
		HeadElems = $(HeadElemsSelector),
		Panel = $('#Panel, aside.page-sidebar'),
		InfScrollJT = $('#InfScrollJT'),
		panelTop = Panel.offset().top,
		panelHeight = Panel.height(),
		DataList, dataListTop, MessageList, Content, CommentForm;

	function preparation(page) {
		isLastPage = isFirstPage = false;
		pagesLoaded = 1;
		pagesBefore = page - 1;
		pageNext = page + 1;
		DataList = $(DataListSelector);
		dataListTop = DataList.offset().top;
		MessageList = $('div.MessageList.Discussion');
		Content = $(ContentSelector);
		CommentForm = Content.find('.CommentForm');
		if (!CommentForm.length)
		//dummy CommentForm, in case the discussion is closed
			CommentForm = $('<div class="CommentForm"/>').insertAfter(DataList);
		DataList.children().data('page', page);
		DataList.children().first().prepend('<a id="Page_' + page + '"/>');
		var checkDom = (page === false);
		//remove the pagers on both ends
		if (page == totalPages || (checkDom && !$('#PagerAfter a.Next').length)) {
			$('#PagerAfter').remove();
			isLastPage = true;
		}
		if (page == 1 || (checkDom && !$('#PagerBefore a.Previous').length)) {
			$('#PagerBefore').remove();
			isFirstPage = true;
		}
		//hide the Head elements and the Panel
		if (hideHead) {
			if (!fixedPanel && !isFirstPage) {
				HeadElems.css('visibility', 'hidden');
				Panel.hide();
			} else if (!isFirstPage) {
				HeadElems.css('visibility', 'hidden');
			} else {
				HeadElems.css('visibility', 'visible');
				Panel.show();
			}
		}
		//to prevent page jumping on short content, extend the content area
		if (isLastPage && !isFirstPage && inDiscussion) {
			var dummyHeight = $window.height() -
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
			if (baseUrl)
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
			PagerBackup = PagerAfter.clone();
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
				$document.trigger('CommentAdded');
			}).fail(function() {
				//bring back the pager if something went wrong
				PagerAfter.replaceWith(PagerBackup);
			}).always(function() {
				//allow new requests, even if this request failed somehow
				ajax = false;
				updateUrl();
				updateIndex();
			});
			//show a loading indicator
			PagerAfter.html(LoadingBar);
			//scrolling up
		} else if (PagerBeforeInView && PagerBeforeA.length > 0) {
			ajax = true;
			PagerBefore = $(PagerBefore);
			PagerBackup = PagerBefore.clone();
			$.get(PagerBeforeA.attr('href'), function(data) {
				var OldHeight = $document.height();
				var OldScroll = $window.scrollTop();
				$(DataListSelector, data)
					.children()
					.prependTo(DataList)
					.addClass('InfScrollHighlight')
					.data('page', pagesBefore)
					.first()
					.prepend('<a id="Page_' + pagesBefore + '"/>');
				//prepend the first post of a discussion
				$('div.ItemDiscussion', data).appendTo(MessageList);
				HeadElems = $(HeadElemsSelector);
				if ($('#PagerBefore a.Previous', data).length > 0) {
					PagerBefore.replaceWith($('#PagerBefore', data));
					HeadElems.css('visibility', 'hidden');
				} else {
					PagerBefore.remove();
					if (hideHead) {
						HeadElems.css('visibility', 'visible');
						Panel.show();
					}
				}
				Dummy.remove();
				//the scroll position needs to be adjusted when prepending content
				$document.scrollTop(OldScroll + $document.height() - OldHeight);
				pagesLoaded++;
				pagesBefore--;
				$document.trigger('CommentAdded');
			}).fail(function() {
				PagerBefore.replaceWith(PagerBackup);
			}).always(function() {
				ajax = false;
				updateUrl();
				updateIndex();
			});
			PagerBefore.html(LoadingBar);
		}
	}

	function updateUrl() {
		if (unload || !baseUrl)
			return;
		//get first and last comment visible in the viewport
		LastInview = $('li.Item:infscrollinview', DataList);
		FirstInview = LastInview.first();
		LastInview = LastInview.last();
		//use the added data to update the url
		var page = FirstInview.data('page');
		//don't add the hash on the first discussion post
		var item0Inview = (pagesBefore === 0) ? infScrollInview(MessageList[0], 0) : false;
		var hash = (inDiscussion && FirstInview[0] && !item0Inview) ? '#' + FirstInview[0].id : '';
		if (!page) {
			var wt = window.pageYOffset || document.documentElement.scrollTop;
			page = (wt > dataListTop) ? totalPages : 1;
		}
		var newState = baseUrl + '/p' + page + hash;
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
			index = (wt > dataListTop) ? countComments : 1;
		}
		NavIndex.text(index);
		if (inDiscussion)
			//prevent nanobar-bug (also prevent the bar from disappearing completely)
			ProgressBar.go(index / countComments * 99.9);
	}

	function jumpTo(page) {
		if (ajax)
			return;
		//0,1 = Item_0; -1 = CommentForm; >1 = page
		var jumpto = false,
			bottom = (page == -1) ? true : false;
		if (page < 2) {
			jumpto = (page == -1) ?
				CommentForm.offset().top : $('#Item_0').offset().top;
			page = (page == -1) ? totalPages : 1;
		}
		//check if we can just scroll
		if ((pagesLoaded == totalPages) || (pagesBefore < page && page < pageNext)) {
			if (jumpto === false)
				jumpto = $('#Page_' + page).offset().top;
			$('html, body').animate({
					scrollTop: jumpto
				}, 400, 'swing',
				function() {
					updateUrl();
					updateIndex();
				});
			if (page == 1 && hideHead) {
				HeadElems.css('visibility', 'visible');
				Panel.show();
			}
			return;
		}
		ajax = true;
		Content.css('opacity', 0);
		$('#PageProgress').show();
		$.get(baseUrl + '/p' + page, function(data) {
			//drop everything and just load the first/last set of posts
			Content.replaceWith($(ContentSelector, data));
			HeadElems = $(HeadElemsSelector);
			preparation(page);
			if (jumpto === false)
				jumpto = $('#Page_' + page).offset().top;
			else if (bottom)
				jumpto = CommentForm.offset().top;
			$('html, body').animate({
					scrollTop: jumpto
				})
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
		//prevent the browser from jumping between hashes on first load
		unload = true;
		setTimeout(function() {
			unload = false;
		}, 500);
		preparation(gdn.definition('InfiniteScroll_Page', false));
		$window.scroll(infiniteScroll);
		//trigger for short content
		infiniteScroll();
		//update the url when scrolling abruptly stops
		var scrollstop = null;
		$window.scroll(function() {
			if (scrollstop !== null)
				clearTimeout(scrollstop);		 
			scrollstop = setTimeout(infiniteScroll, 150);
		});
		$('#InfScrollJTT').click(function(e) {
			e.preventDefault();
			jumpTo(0);
		});
		$('#InfScrollJTB').click(function(e) {
			e.preventDefault();
			jumpTo(-1);
		});
		//jump to page navigation input box
		$document.click(function(e) {
			var Nav = $('#InfScrollNav');
			if (!$(e.target).closest(Nav).length) {
				Nav.removeClass('active');
				navOpen = false;
			} else if ($(e.target).closest('#InfScrollPageCount').length) {
				Nav.addClass('active');
				navOpen = true;
				InfScrollJT.focus();
			}
		});
		//shortkey to jump between pages
		$document.keypress(shortkey, function(e) {
			if ($(e.target).is('input, textarea'))
				return;
			var charCode = (typeof e.which == 'undefined') ? e.keyCode : e.which;
			if (String.fromCharCode(charCode) == shortkey)
				$('#InfScrollPageCount').click();
		});
		InfScrollJT.focus(function() {
			InfScrollJT.one('mouseup', function() {
				InfScrollJT.select();
				return false;
			}).select();
		});
		$('#InfScrollJumpTo').submit(function() {
			var page = parseInt(InfScrollJT.val(), 10);
			if (0 < page && page <= totalPages)
				jumpTo(page);
			return false;
		});
		//increment comment count when a new comment was added
		$document.on('CommentAdded', function() {
			countComments++;
			$('#InfScrollPageCount span.small').text('/' + countComments);
			DataList.children().last().data('page', pageNext - 1);
			updateUrl();
			updateIndex();
		});
		//prevent the browser trying to "restore" the scroll position
		$window.on('beforeunload', function() {
			if (pagesBefore === 0 || !inDiscussion)
				return;
			$('#Frame').css('opacity', 0);
			unload = true;
			$window.scrollTop(0);
		});
	} else {
		Content = $(ContentSelector);
	}

	//Sticky Panel
	var difference, track, panelScrollActive;

	function panelScrollInit() {
		difference = Panel.height() - $window.height();
		track = 0;
		Panel.css('margin-top', 0);
		panelScrollActive = false;
		if (difference > 0) {
			difference += 40;
			panelScrollActive = true;
		}
	}
	if (fixedPanel) {
		//make the viewport "pick up" the Panel when scrolling down
		$window.scroll(function() {
			var st = $(this).scrollTop();
			if (st >= panelTop && Content.height() > panelHeight)
				Panel.addClass('InfScrollFixed');
			else if (pagesBefore === 0 && hideHead)
				Panel.removeClass('InfScrollFixed').css('margin-top', 0);
			else if (!hideHead)
				Panel.removeClass('InfScrollFixed').css('margin-top', 0);
		});
		//if the panel is too high for the viewport, add "fake" scrolling
		$window.resize(panelScrollInit);
		panelScrollInit();
		//overflow: auto; cannot be used as it cuts off the notifications popup
		Panel.on('DOMMouseScroll mousewheel', function(e) {
			if (!panelScrollActive || !Panel.hasClass('InfScrollFixed'))
				return;
			if ((e.originalEvent.detail > 0 || e.originalEvent.wheelDelta < 0) &&
				track > -difference) {
				track -= (track < 50 - difference) ? 0 : 50;
				Panel.stop().animate({
					marginTop: track + 'px'
				}, 'fast', 'easeOutCirc');
			} else if (track < 0) {
				track += (track > -50) ? 0 : 50;
				Panel.stop().animate({
					marginTop: track + 'px'
				}, 'fast', 'easeOutCirc');
			}
			return false;
		});
	}
});
