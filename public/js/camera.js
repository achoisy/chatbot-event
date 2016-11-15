$("#fileUpload").on('change', function () {

    //Get count of selected files
    var countFiles = $(this)[0].files.length;

    var imgPath = $(this)[0].value;
    var extn = imgPath.substring(imgPath.lastIndexOf('.') + 1).toLowerCase();
    var image_holder = $("#image-holder");
		const selectButton = $("#select-image");
    image_holder.empty();

    if (extn == "gif" || extn == "png" || extn == "jpg" || extn == "jpeg") {
        if (typeof (FileReader) != "undefined") {

            //loop for each file selected for uploaded.
            for (var i = 0; i < countFiles; i++) {

                var reader = new FileReader();
                reader.onload = function (e) {
                    $("<img />", {
                        "src": e.target.result,
                            "class": "responsive-img"
                    }).appendTo(image_holder);
										//selectButton.addClass("hidden");
                }

                image_holder.show();
                reader.readAsDataURL($(this)[0].files[i]);
            }

        } else {
            alert("This browser does not support FileReader.");
						$('<img src="https://monmagazine.fr/images/square/add_photo.png" class="responsive-img" />').replaceAll("#image-holder");
        }
    } else {
        alert("Pls select only images");
				$('<img src="https://monmagazine.fr/images/square/add_photo.png" class="responsive-img" />').replaceAll("#image-holder");
    }
});
let message ='';



// transloadit script !
$(function() {
	// const senderid = $_GET('senderid');
	const senderid = $("input[name='senderid']").val();
	const eventid = $("input[name='eventid']").val();
	const storePath = eventid;

	console.log('Eventid: ', eventid);
	console.log('senderid: ', senderid);

	$("button[name='action']").click(() => {
		message = $("textarea#message").val().substr(0, 120);
		$('#upload-form').transloadit({
	    wait: true,
	    params: {
	      auth: { key: "036bc9a0954011e68fa62b9952eb5f8d" },
	      template_id: "42a6d8f0954d11e69db1219efbd0fde2",
	      steps: {
	        store: {
	          path: storePath + '/${assembly.id}.${file.ext}',
	        },
	        storethumb: {
	          path: storePath + '/thumb/${assembly.id}.${file.ext}',
	        },
	      },
	      fields: {
	        eventid_pic: eventid,
	        senderid_pic: senderid,
					message_pic: message,
	      },
	    },
	  });
	});
});
