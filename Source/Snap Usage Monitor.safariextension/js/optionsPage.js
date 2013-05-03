// Save the user's login credentials to Chrome's local storageArea
function saveCredentials () {
	safari.self.tab.dispatchMessage('Save these credentials', {
		snapUsername: $('#username').val(),
		snapPassword: $('#password').val()
	});
}

// Function to unfreeze the input fields
function unfreezeInputFields () {
	$('input').prop('disabled', false);
	$('#loginButton').val('Save');
}

function logIn () {
	// POST user's credentials to the login URL with attribute names that match Snap's login form
	jQuery.ajax({
		cache: false,
		data: {
			form_Username: $('#username').val(),
			form_Password: $('#password').val(),
			action: 'Login'
		},
		type: 'POST',
		url: 'https://myaccount.snap.net.nz/login/'
	})
	.done(function(result){					
		// If Snap's page returns an error, display the error
		if ($('div.error', result).length > 0) {
			alert('Oops! Snap\'s server returned the following error:\n\n"'+$('div.error', result).text()+'"\n\nPlease ensure your username and password are correct.');
			unfreezeInputFields();
		} else if ($('h2:contains("Data Services")', result).length != 1) {
			if ($('div.package.login', result).length == 1) {
				// PHPSESSID cookie does not exist for snap.net.nz; we need to visit the page in Safari, then try this again. Ask global page to open a tab and set a cookie
				$('#loginButton').val('Just a moment...');
				safari.self.addEventListener('message', function(event){
					if (event.name == 'Cookie has been set') {
						logIn();
					}
				});
				safari.self.tab.dispatchMessage('Need to set cookie', null);
			} else {
				saveCredentials();
				alert('Oops! Snap Usage Monitor logged into your account okay, but no Data Services were found.');
				console.log(result);
				unfreezeInputFields();
			}
		} else {
			// Otherwise we have logged in successfully!
			// Listen for when the globalPage has saved our credentials
			safari.self.addEventListener('message', function(event){
				if (event.name == 'Credentials have been saved') {
					safari.self.tab.dispatchMessage('Fetch data usage', null);
					$('#loginButton').val('Saved!');
					setTimeout(function(){
						$('#mainContent, #footer').fadeOut();
						$('div#allSet').fadeIn();
					}, 1000);
				}
			}, false);
			saveCredentials();
		}
	})
	.fail(function(jqXHR, textStatus, errorThrown){
		alert('Oops! Snap Usage Monitor failed to log in because:\n\n'+errorThrown);
		unfreezeInputFields();
	});
}

// When the options page has loaded...
$(document).ready(function(){

	// Looks like Apple abandoned Safari for Windows, so I'm unable to debug anything on Windows for this extension (and there are bugs), so stop here and tell user that Safari for Windows is unsupported.
	if (navigator.userAgent.split('Windows').length > 1) {
		$('body').html('Oops! &nbsp;Snap Usage Monitor for Safari only works for Safari on Mac, not for Safari on Windows.');
		return;
	}

	// When options page first loads, check if we have user's login credentials.
	safari.self.tab.dispatchMessage('Get credentials', null);
	safari.self.addEventListener('message', function(event){
		switch (event.name) {
			case 'credentials':
				var snapUsername = event.message.snapUsername;
				var snapPassword = event.message.snapPassword;
				$('#username').val(snapUsername);
				$('#password').val(snapPassword);
				break;
		}
	}, false);
	
	// Insert version number
	jQuery.get(safari.extension.baseURI + 'Info.plist', function(data){
		$('dict > key', data).each(function(){
			if ($(this).text() == 'CFBundleShortVersionString') {
				var versionNumber = $(this).next().text();
				$('span#version').text(versionNumber);
			}
		});
	});
	
	// Handle submitting the login form
	$('form#login').submit(function(){
	
		// Freeze the input fields
		$(':focus').blur();
		$('input').prop('disabled', true);
		$('#loginButton').val('Saving...');
		
		// Require both username and password fields
		if ($('#username').val().length == 0 || $('#password').val().length == 0) {
			alert('Oops! Please enter your Snap username and password.');
			unfreezeInputFields();
			$('#username').val().length == 0 ? $('#username').focus() : $('#password').focus();
			return false;
		}
		setTimeout(logIn, 400);
		return false;
	});
	
});
