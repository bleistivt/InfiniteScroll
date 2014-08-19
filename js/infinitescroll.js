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
	var LoadingBar = $('<span class="Progress"></span>');
	var DataListSelector = '#Content ul.DataList, main.page-content ul.DataList';//default, bootstrap
	var DataList = $(DataListSelector);
	if ($('.Pager').length > 0)
		$('#EndInfiniteScroll').show();
	//hide the pagers on both ends
	if ($('#PagerAfter a.Next').length === 0)
		$('#PagerAfter').hide();
	if ($('#PagerBefore a.Previous').length === 0)
		$('#PagerBefore').hide();
	function InfiniteScroll() {
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
				//extract the content
				$(DataListSelector, data).contents().appendTo(DataList);
				//extract the pager if it is not the last
				if ($('#PagerAfter a.Next', data).length > 0)
					PagerAfter.replaceWith($('#PagerAfter', data));
				else
					PagerAfter.remove();
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
				$(DataListSelector, data).contents().prependTo(DataList);
				//prepend the first post of a discussion
				$('div.ItemDiscussion', data).appendTo('div.MessageList.Discussion');
				if ($('#PagerBefore a.Previous', data).length > 0)
					PagerBefore.replaceWith($('#PagerBefore', data));
				else
					PagerBefore.remove();
				//the scroll position needs to be adjusted when prepending content
				$(document).scrollTop(OldScroll + $(document).height() - OldHeight);
			}).always(function() {
				ajax = false;
			});
			PagerBefore.html(LoadingBar);
		}
	}
	$(window).scroll(InfiniteScroll);
	//trigger for short content
	InfiniteScroll();
	//give users the ability to reply on very long topics
	$('#EndInfiniteScroll').click(function(e) {
		e.preventDefault();
		stopped = true;
		$('html, body').animate({scrollTop: $('#Form_Comment').offset().top}, 400);
		$(this).fadeOut();//todo
	});

});
