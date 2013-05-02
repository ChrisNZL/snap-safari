// Listen for message passing requests
safari.application.addEventListener('message', function(event){
	switch (event.name) {
		case 'Get credentials':
			event.target.page.dispatchMessage('credentials', {
				snapUsername: safari.extension.secureSettings.snapUsername,
				snapPassword: safari.extension.secureSettings.snapPassword
			});
			break;
		case 'Fetch data usage':
			fetchDataUsage();
			break;
		case 'Save these credentials':
			safari.extension.secureSettings.setItem('snapUsername', event.message.snapUsername);
			safari.extension.secureSettings.setItem('snapPassword', event.message.snapPassword);
			event.target.page.dispatchMessage('Credentials have been saved', null);
			break;
	}
}, false);

// Listen for toolbar button click commands
safari.application.addEventListener('command', function(event){
	switch (event.command) {
		case 'showPopover':
			if (credentialsLookOkay(safari.extension.secureSettings.snapUsername, safari.extension.secureSettings.snapPassword)) {
				// Safari popovers always exist, so update what they display before showing the popover
				safari.extension.popovers[0].contentWindow.displayUsageInfo();
				safari.extension.popovers[0].contentWindow.displayNetworkStatus();
				setTimeout(function(){
					safari.extension.toolbarItems[0].showPopover();
				}, 1);
			} else {
				safari.extension.toolbarItems[0].popover = safari.extension.popovers[1];
				safari.extension.toolbarItems[0].showPopover();
			}
			break;
	}
}, false);

// Function to fetch Network Status info
function fetchNetworkStatus () {
	var networkStatusUrl = 'http://www.snap.net.nz/support/network-status';
	var request = $.get(networkStatusUrl, function(){})
		.done(function(result){
			$('p', result).each(function(){
				switch ($(this).text()) {
				
					case 'Planned Events':
						var sendDoneMessage = function () {
							safari.extension.popovers[0].contentWindow.displayNetworkStatus();
						}
						var plannedEvents = [];
						var plannedEventsCount = 0;
						var plannedEvent;
						var ul = $(this).next('ul.phpmyfaq_ul');
						$('li', ul).each(function(){
							plannedEvent = {
								href: $('a', this).attr('href'),
								text: $('a', this).text()
							};
							plannedEventsCount++;
							plannedEvents.push(plannedEvent);
						});
						if (plannedEventsCount > 0) {
							// Determine whether to save these events or not
							var oldPlannedEvents = localStorage.oldPlannedEvents == null ? [] : JSON.parse(localStorage.oldPlannedEvents);
							var newPlannedEvents = [];
							for (var x in plannedEvents) {
								var plannedEvent = plannedEvents[x];
								var plannedEventIsOld = false;
								for (var y in oldPlannedEvents) {
									var oldPlannedEvent = oldPlannedEvents[y];
									if (oldPlannedEvent.href == plannedEvent.href) {
										plannedEventIsOld = true;
										break;
									}
								}
								if (plannedEventIsOld == false) {
									newPlannedEvents.push(plannedEvent);
								}
							}
							if (newPlannedEvents.length > 0) {
								localStorage.newPlannedEvents = JSON.stringify(plannedEvents);
							}
						} else {
							localStorage.newPlannedEvents = null;
							localStorage.oldPlannedEvents = null;
						}
						break;
						
					case 'Network Status':
						var ul = $(this).next('ul.phpmyfaq_ul');
						var a = $('a', ul);
						if (a.length == 1 && a.text() == 'OK - No Known Network Problems') {
							localStorage.networkIsOkay = null;
						} else {
							localStorage.networkIsOkay = false;
							safari.extension.popovers[0].contentWindow.displayNetworkStatus();
						}
						break;
				}
			});	
			
		})
		.fail(function(jqXHR, textStatus, errorThrown){
			console.warn('Oops! Snap Usage Monitor failed to fetch the network status page because:\n\n'+errorThrown);
		});
}

// Function to fetch data usage info from Snap
function fetchDataUsage () {

	// Only fetch data if credentials are stored
	if (credentialsLookOkay(safari.extension.secureSettings.snapUsername, safari.extension.secureSettings.snapPassword)) {
		safari.extension.toolbarItems[0].popover = safari.extension.popovers[0];
	
		// Reset interval to get data usage again in 15 minutes
		resetDataFetchingInterval();
		
		// POST user's credentials to the login URL with attribute names that match Snap's login form
		var loginUrl = 'https://myaccount.snap.net.nz/login/?next='+encodeURI('/summary');
		var postData = {
			form_Username: safari.extension.secureSettings.snapUsername,
			form_Password: safari.extension.secureSettings.snapPassword,
			action: 'Login'
		};
		var request = $.post(loginUrl, postData)
		.done(function(result){
			if ($('div.error', result).length > 0) {
				console.warn('Oops! Snap\'s server returned the following error:\n\n"'+$('div.error', result).text()+'"\n\nPlease ensure your username and password are correct.');
			} else if ($('h2:contains("Data Services")', result).length != 1) {
				console.warn('Oops! Snap Usage Monitor logged into your account okay, but no Data Services were found.');
			} else {
				// Logged in successfully!
				// Parse the fetched HTML
				var tableRow = $('div.service tbody tr', result).first();
				var cell_0 = $('td', tableRow).first();
				var planName = $('a', cell_0).text();
				var billingPeriodDates = $('span', cell_0).text().split('-');
				var billingPeriodStartDate = $.trim(billingPeriodDates[0]);
				var billingPeriodEndDate = $.trim(billingPeriodDates[1]);
				var gigabyteLimit = $('td', tableRow).last().text().split(' ')[0];
				var gigabytesRemaining = $('td', tableRow).last().prev().text().split(' ')[0];
				
				// Record the time that this was fetched
				localStorage.timeDataWasLastFetched = time();
				
				// Save the data and finish
				var dataService = {
					planName: planName,
					billingPeriodStartDate: billingPeriodStartDate,
					billingPeriodEndDate: billingPeriodEndDate,
					gigabyteLimit: gigabyteLimit,
					gigabytesRemaining: gigabytesRemaining
				};
				localStorage.dataService = JSON.stringify(dataService);
				fetchNetworkStatus();
				safari.extension.popovers[0].contentWindow.displayUsageInfo();
			}
		})
		.fail(function(jqXHR, textStatus, errorThrown){
			console.warn('Oops! Snap Usage Monitor failed to log in because:\n\n'+errorThrown);
		});
	}
}

// Function to fetch data usage in 15 minutes
function resetDataFetchingInterval () {
	clearInterval(window.fetchDataInterval);
	window.fetchDataInterval = setInterval(fetchDataUsage, 900000); // 1000 milliseconds * 60 seconds * 15 minutes
}

$(document).ready(function(){

	// Enable the data usage popover if user has credentials stored
	if (credentialsLookOkay(safari.extension.secureSettings.snapUsername, safari.extension.secureSettings.snapPassword)) {
		safari.extension.toolbarItems[0].popover = safari.extension.popovers[0];
	} else {
		var newTab = safari.application.activeBrowserWindow.openTab();
		newTab.url = safari.extension.baseURI + 'html/options.html';
	}

	// Check if data should be fetched
	if (localStorage.timeDataWasLastFetched == null || time() >= parseInt(localStorage.timeDataWasLastFetched) + (60 * 15)) {
		fetchDataUsage();
	} else {
		resetDataFetchingInterval();
	}
	
});
