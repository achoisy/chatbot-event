function $_GET(param) {
	var vars = {};
	window.location.href.replace( location.hash, '' ).replace(
		/[?&]+([^=&]+)=?([^&]*)?/gi, // regexp
		function( m, key, value ) { // callback
			vars[key] = value !== undefined ? value : '';
		}
	);

	if ( param ) {
		return vars[param] ? vars[param] : null;
	}
	return vars;
}

const eventid = $_GET('eventid');

window.extAsyncInit = function() {
    // the Messenger Extensions JS SDK is done loading
    MessengerExtensions.getUserID(function success(uids) {
      var psid = uids.psid;
      document.getElementById("event_id").innerHTML = eventid;
      document.getElementById("user_id").innerHTML = eventid;
    }, function error(err) {      

    });
  };
