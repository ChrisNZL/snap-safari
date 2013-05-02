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

try {

	// When the options page has loaded...
	$(document).ready(function(){

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
			
			setTimeout(function(){
				// POST user's credentials to the login URL with attribute names that match Snap's login form
				var loginUrl = 'https://myaccount.snap.net.nz/login/?next='+encodeURI('/summary');
				var postData = {
					form_Username: $('#username').val(),
					form_Password: $('#password').val(),
					action: 'Login'
				};
				console.log(postData);
				$.post(loginUrl, postData)
					.done(function(result){
						// If Snap's page returns an error, display the error
						if ($('div.error', result).length > 0) {
							alert('Oops! Snap\'s server returned the following error:\n\n"'+$('div.error', result).text()+'"\n\nPlease ensure your username and password are correct.');
							unfreezeInputFields();
						} else if ($('h2:contains("Data Services")', result).length != 1) {
							saveCredentials();
							alert('Oops! Snap Usage Monitor logged into your account okay, but no Data Services were found.');
							$('body').append('<textarea></textarea>');
							$('textarea').val(result);
							unfreezeInputFields();
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
				}, 400);
			return false;
		});
		
	});
}
catch (e) {
	// Send any errors to the global console, since Safari doesn't let you inspect popover consoles :/
	safari.extension.globalPage.contentWindow.console.log('Popover error: '+e);
}
