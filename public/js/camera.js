
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

const senderid = $_GET('senderid');
const eventid = $_GET('eventid');
const storePath = eventid +'/'+ senderid + "/";

$(function() {
  $('#upload-form').transloadit({
    wait: true,
    params: {
      auth: { key: "036bc9a0954011e68fa62b9952eb5f8d" },
      template_id: "42a6d8f0954d11e69db1219efbd0fde2",
      steps: {
        store: {
          path: storePath,
        },
      },
    }
  });
});
