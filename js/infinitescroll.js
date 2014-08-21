//jQuery :inview selector by https://github.com/luis-almeida
$.extend($.expr[':'], {
	inview: function(el) {
		var $e = $(el),
			$w = $(window),
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
	var countComments = gdn.definition('InfiniteScroll_CountComments');
	var perPage = gdn.definition('InfiniteScroll_PerPage');
	var pagesBefore = gdn.definition('InfiniteScroll_Page') - 1;
	var inDiscussion = gdn.definition('InfiniteScroll_InDiscussion', false);
	var url = gdn.definition('InfiniteScroll_Url', false);
	var discussionUrl = url;
	var pagerAfterHidden, pagerBeforeHidden;
	var LoadingBar = $('<span class="Progress"></span>');
	var Dummy = $('<div/>');
	var LastInview;
	
	//selector for default theme and vanilla-bootstrap
	var DataListSelector = '#Content ul.DataList, main.page-content ul.DataList';
	var ContentSelector = '#Content, main.page-content';
	var NavIndex = $('#NavIndex');//todo
	var Panel = $('#Panel')
	var panelTop = $('#Panel').offset().top;
	var DataList, MessageList, Content, CommentForm;
	
	function preparation() {
		pagerAfterHidden = pagerBeforeHidden = false;
		DataList = $(DataListSelector);
		MessageList = $('div.MessageList.Discussion');
		Content = $(ContentSelector);
		CommentForm = Content.find('.CommentForm');
		//hide the pagers on both ends
		if ($('#PagerAfter a.Next').length === 0) {
			$('#PagerAfter').hide();
			pagerAfterHidden = true;
		}
		if ($('#PagerBefore a.Previous').length === 0) {
			$('#PagerBefore').hide();
			pagerBeforeHidden = true;
		}
		//to prevent page jumping on short content, extend the content area
		if (!(pagerBeforeHidden && pagerAfterHidden) && inDiscussion) {
			var dummyHeight = $(window).height() - (Content.position().top + Content.outerHeight());
			if (dummyHeight > 0) {
				Dummy.css('min-height', dummyHeight);
				Content.prepend(Dummy);
			}
		}
		//don't show the comment form (yet)
		if (!pagerAfterHidden)
			CommentForm.hide();
	}
	preparation();
	
	//create the header and progress bar
	if (inDiscussion) {
		var ProgressBar = new Nanobar({
			bg: gdn.definition('InfiniteScroll_ProgressBg'),
			id: 'ProgressBar'
		});
		if (gdn.definition('InfiniteScroll_Header'));
	}
	
	function infiniteScroll() {
		if (discussionUrl)
			updateUrl();
		if (inDiscussion)
			updateIndex();
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
		LastInview = $('li.Item:inview', DataList).last()
		//use the helper <span> to update the url 
		var page = LastInview.find('span.ScrollMarker').data('page');
		var newState = discussionUrl + '/p' + ((page !== null) ? page : 1);
		if (newState != url)
			{history.replaceState(null, null, newState);}
		url = newState;
	}
	
	function updateIndex() {
		if (!LastInview)
			LastInview = $('li.Item:inview', DataList).last();
		//calculate the actual index of last comment visible in viewport
		var index = pagesBefore * perPage + LastInview.index() + 1;
		NavIndex.text(index);
		//prevent nanobar-bug (also prevent the bar from disappearing completely)
		ProgressBar.go(index / countComments * 99.9);
	}
	
	function jumpToEnd(direction) {
		//check if we can just scroll
		if (pagesLoaded == gdn.definition('InfiniteScroll_Pages'))
			var full = true;
		if (!direction && (pagerBeforeHidden || full)) {
			$('html, body').animate({scrollTop: 0}, 400);
			return;
		} else if (direction && (pagerAfterHidden || full)) {
			$('html, body').animate({scrollTop: $('#Form_Comment').offset().top}, 400);
			return;
		}
		if (ajax)
			return;
		ajax = true; //block any other requests
		var pageNo = (direction) ? gdn.definition('InfiniteScroll_Pages') : 1;
		Content.css('opacity', 0);
		$('#PageProgress').show();
		$.get(discussionUrl + '/p' + pageNo, function(data) {
				Content.replaceWith($(ContentSelector, data));
				preparation();
				pagesBefore = pageNo - 1;
				if (!direction)
					$('html, body').animate({scrollTop: 0}, 400);
				else
					$('html, body').animate({scrollTop: $('#Form_Comment').offset().top}, 400);
				pagesLoaded = 1;
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
	
	if (gdn.definition('InfiniteScroll_FixedPanel'))
		$(window).scroll(function () {
			var st = $(this).scrollTop();
			if (st >= panelTop)
				Panel.addClass('InfScrollFixed');
			else
				Panel.removeClass('InfScrollFixed');
		});
	
	$('#InfScrollJTT').click(function(e) {e.preventDefault(); jumpToEnd(false)});
	$('#InfScrollJTB').click(function(e) {e.preventDefault(); jumpToEnd(true)});

});
