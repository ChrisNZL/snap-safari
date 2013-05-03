// Function to display usage info in popover
function displayUsageInfo () {
	// Populate popover with data
	var dataService = JSON.parse(localStorage.dataService);
	var u = getUsageInfoObject(dataService);

	// Function to display a number nicely in GB
	var gbFormat = function (number) {
		return number_format(number, 2) + ' GB';
	}
	
	$('#planName a').text(u.planName);
	$('#dataLimit').text(gbFormat(u.dataLimit));
	$('#dataUsed').text(gbFormat(u.dataUsed));
	$('#dataRemaining').text(gbFormat(u.dataRemaining));

	$('#averageDailyUsage').text(gbFormat(u.averageDailyUsage));
	$('#monthlyEstimate').text(gbFormat(u.monthlyEstimate));
	$('#suggestedDailyUsage').text(gbFormat(u.suggestedDailyUsage));
	
	// Percentage bar
	$('#unfilledPortion').css('width', (100 - (u.dataUsedPercentage * 100)) + '%');
	$('#percentageBar').removeClass();
	$('#percentageBar').addClass(u.barColor);
	var percentageBarPixelWidth = $('#percentageBar').width();
	var notchMarginLeft = -3 + (percentageBarPixelWidth * u.daysElapsedPercentage);
	if (notchMarginLeft >= percentageBarPixelWidth - 3) {
		notchMarginLeft = percentageBarPixelWidth - 4;
	}
	$('#notch').css('margin-left', notchMarginLeft + 'px');
	
	// You have used X% of your monthly limit and are Y% through the current month
	var barTooltipText = Math.round(u.dataUsedPercentage * 100) + '% of your data limit has been used ('+u.barColor+' bar).\n'
		+ Math.round(u.daysElapsedPercentage * 100) + '% of the billing period has elapsed (black notch).';
	$('#percentageBar').attr('title', barTooltipText);
	
	// Time remaining
	if (u.daysRemaining >= 1) {
		$('#timeRemaining').text(number_format(Math.floor(u.daysRemaining), 0) + ' days');
	} else {
		if (u.hoursRemaining >= 1) {
			var hoursRemainingFormatted = number_format(Math.floor(u.hoursRemaining), 0)
			$('#timeRemaining').text(hoursRemainingFormatted + ' ' + (hoursRemainingFormatted == 1 ? 'hour' : 'hours'));
		} else {
			$('#timeRemaining').text('< 1 hour');
		}
	}
	// You are on day X of Y
	var timeTooltipText = 'You are on day ' + Math.ceil(u.daysElapsed) + ' of ' + u.daysInBillingPeriod + ' in the current billing period.';
	$('#timeRemaining').html('<span class="tooltip" title="'+timeTooltipText+'">'+$('#timeRemaining').text()+'</span>');
	
	// Time last updated
	var minutesUpdatedAgo = (time() - localStorage.timeDataWasLastFetched) / 60;
	var tooltipDate = date('j F Y @ g:ia', localStorage.timeDataWasLastFetched);
	if (minutesUpdatedAgo < 1) {
		$('#lastUpdated').html('Updated <span class="tooltip" title="'+tooltipDate+'">&lt; 1 min ago</span>');
	} else {
		var minsAgoText = number_format(minutesUpdatedAgo, 0);
		if (minsAgoText < 60) {
			$('#lastUpdated').html('Updated <span class="tooltip" title="'+tooltipDate+'">' + minsAgoText + ' min' + (minsAgoText == 1 ? '' : 's') + ' ago</span>');
		} else {
			var hoursAgoText = number_format(Math.floor(minsAgoText / 60), 0);
			$('#lastUpdated').html('Updated <span class="tooltip" title="'+tooltipDate+'">' + hoursAgoText + ' hour' + (hoursAgoText == 1 ? '' : 's') + ' ago</span>');
		}
	}
	
	// Add white space for readability
	$('tr.data').last().addClass('addWhiteSpaceBelow');
	$('tr.estimates').last().addClass('addWhiteSpaceBelow');
	
	resizePopover();
}

// Function to display Network Status details
function displayNetworkStatus () {
	var newPlannedEvents = JSON.parse(localStorage.newPlannedEvents);
	var networkIsOkay = localStorage.networkIsOkay;
	var plannedEventsExist = newPlannedEvents != null && newPlannedEvents.length > 0;
	var networkHasProblems = networkIsOkay != null && networkIsOkay == false;
	if (plannedEventsExist || networkHasProblems) {
		var networkStatusHtml = '<tr id="plannedEventsContainerRow"><td id="networkStatus" colspan="2"><div>\n';
		if (networkHasProblems) {
			networkStatusHtml += '<div class="networkStatusTitle"><a href="http://www.snap.net.nz/support/network-status" target="_blank">Snap\'s network is not OK &ndash; click here for details</a></div>\n';
		} else if (plannedEventsExist) {
			networkStatusHtml += '<img id="dismiss" src="../img/stop.png" title="Dismiss" onclick="dismissNetworkMessages()" />\n';
			networkStatusHtml += '<div class="networkStatusTitle"><a href="http://www.snap.net.nz/support/network-status" target="_blank" onclick="launchUrl(this.href)">Upcoming network events:</a></div>\n';
			networkStatusHtml += '<div id="plannedEvents">';
			for (var x in newPlannedEvents) {
				var newPlannedEvent = newPlannedEvents[x];
				networkStatusHtml += '<a href="http://www.snap.net.nz'+newPlannedEvent.href+'" target="_blank" onclick="launchUrl(this.href)">'+newPlannedEvent.text+'</a><br />\n';
			}
			networkStatusHtml += '</div>\n';
		}
		networkStatusHtml += '</div></td></tr>\n';
		$('tr#plannedEventsContainerRow').remove();
		$('tr#mainRow').after(networkStatusHtml);
		if (networkHasProblems) {
			$('td#networkStatus').addClass('networkIsNotOkay');
		}
		$('td#lastUpdated').parent('tr').addClass('addWhiteSpaceBelow');
		resizePopover();
	}
}

// Function to hide network events, and prevent them from showing again (though new events will still show up)
function dismissNetworkMessages () {
	var oldPlannedEvents = [];
	var newPlannedEvents = JSON.parse(localStorage.newPlannedEvents);
	for (var x in newPlannedEvents) {
		var newPlannedEvent = newPlannedEvents[x];
		oldPlannedEvents.push(newPlannedEvent);
	}
	localStorage.oldPlannedEvents = JSON.stringify(oldPlannedEvents);
	localStorage.newPlannedEvents = null;
	$('tr#plannedEventsContainerRow').remove();
	resizePopover();
}

// Function to resize the popover
function resizePopover () {
	safari.extension.popovers[0].width = $('#mainTable').width() + 20;
	safari.extension.popovers[0].height = $('#mainTable').height() + 20;
}

// Function to get updated usage info
function refreshDataUsage () {
	$('#lastUpdated').text('Updating...');
	setTimeout(function(){
		safari.extension.globalPage.contentWindow.fetchDataUsage(true);
	}, 400);
}

try {
	$(document).ready(function(){
		displayUsageInfo();
		displayNetworkStatus();
	});
} catch (e) {
	// Send any errors to the global console, since Safari doesn't let you inspect popover consoles :/
	safari.extension.globalPage.contentWindow.console.log('Popover error: '+e);
}
