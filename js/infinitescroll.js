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
	var stopped; //true if the reply button was clicked
	var pagesLoaded = 1;
	var countComments = gdn.definition('InfiniteScroll_CountComments');
	var perPage = gdn.definition('InfiniteScroll_PerPage');
	var pagesBefore = gdn.definition('InfiniteScroll_Page') - 1;
	var inDiscussion = gdn.definition('InfiniteScroll_InDiscussion', false);
	var url = gdn.definition('InfiniteScroll_Url', false);
	var discussionUrl = url;
	var LoadingBar = $('<span class="Progress"></span>');
	var Dummy = $('<div/>');
	var LastInview;
	
	//selector for default theme and vanilla-bootstrap
	var DataListSelector = '#Content ul.DataList, main.page-content ul.DataList';
	var DataList = $(DataListSelector);
	var MessageList = $('div.MessageList.Discussion');
	var Content = $('#Content, main.page-content')
	
	if ($('.Pager').length > 0)
		$('#EndInfiniteScroll').show();//todo
	//hide the pagers on both ends
	if ($('#PagerAfter a.Next').length === 0) {
		$('#PagerAfter').hide();
		var pagerAfterhidden = true;
	}
	if ($('#PagerBefore a.Previous').length === 0) {
		$('#PagerBefore').hide();
		var pagerBeforehidden = true;
	}
	
	//to prevent page jumping on short content, extend the content area
	if (!(pagerBeforehidden && pagerAfterhidden) && inDiscussion) {
		var dummyHeight = $(window).height() - (Content.position().top + Content.outerHeight());
		if (dummyHeight > 0) {
			Dummy.css('min-height', dummyHeight);
			Content.prepend(Dummy);
		}
	}
	
	//create the header and progress bar
	if (inDiscussion) {
		var ProgressBar = new Nanobar({
			bg: gdn.definition('InfiniteScroll_ProgressBg'),
			id: 'ProgressBar'
		});
	}
	
	function infiniteScroll() {
		if (discussionUrl)
			updateUrl();
		if (inDiscussion)
			updateProgressBar();
		if (ajax || stopped)
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
				if ($('#PagerAfter a.Next', data).length > 0)
					PagerAfter.replaceWith($('#PagerAfter', data));
				else
					PagerAfter.remove();
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
	
	//use the helper <span> to update the url 
	function updateUrl() {
		LastInview = $('li.Item:inview', DataList).last()
		var page = LastInview.find('span.ScrollMarker').data('page');
		var newState = discussionUrl + '/p' + ((page !== null) ? page : 1);
		if (newState != url)
			{history.replaceState(null, null, newState);}
		url = newState;
	}
	
	function updateProgressBar() {
		if (!LastInview)
			LastInview = $('li.Item:inview', DataList).last();
		var index = pagesBefore * perPage + LastInview.index() + 1;
		ProgressBar.go(index / countComments * 99.9);
	}
	
	$(window).scroll(infiniteScroll);
	//trigger for short content
	infiniteScroll();

	
	//give users the ability to reply on very long topics
	$('#EndInfiniteScroll').click(function(e) {
		e.preventDefault();
		stopped = true;
		$('html, body').animate({scrollTop: $('#Form_Comment').offset().top}, 400);
		$(this).fadeOut();
	});
});
