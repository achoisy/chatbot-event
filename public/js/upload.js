$("#close-btn").click(() => {
	console.log("Closing webview");
	MessengerExtensions.requestCloseBrowser(function success() {

      }, function error(err) {

      });
});
