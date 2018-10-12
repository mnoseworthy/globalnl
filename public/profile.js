/******************************************************
 * Global variables
 ******************************************************/

var uid;
var memberDocRef;
var privateDocRef;
// For storing current location and hometown from Google Maps
var locationArray = {};

/*****************************************************
 * Firestore
 ******************************************************/

const settings = { timestampsInSnapshots: true };
firebase.firestore().settings(settings);

/*****************************************************
 * Register event callbacks & implement element callbacks
 ******************************************************/
// Start execution when page is done loading
$(document).ready(function() {});

function renderWithUser(user) {
  $("#mainPage").show();
  uid = user.uid;
  memberDocRef = firebase
    .firestore()
    .collection("members")
    .doc(uid);
  privateDocRef = firebase
    .firestore()
    .collection("private_data")
    .doc(uid);
  $("#display_name").val(user.displayName);
  initApp();
}

function renderWithoutUser() {
  $("#mainPage").hide();
}

gnl.auth.listenForStageChange(renderWithUser, renderWithoutUser, false);

// Prevent the enter key from submitting the form when uncomplete
$(window).keydown(function(event) {
  if (event.keyCode == 13) {
    event.preventDefault();
    return false;
  }
});
// MUN grad change event
$("#MUN").on("change", function() {
  if ($(this).val() === "Yes") {
    $("#grad_year").show();
  } else {
    $("#grad_year").hide();
  }
});
// Industry change event
function changeMUN() {
  if ($("#MUN").val() == "Yes") {
    document.getElementById("MUN_grad_year_box").required = true;
  } else {
    document.getElementById("MUN_grad_year_box").required = false;
  }
}
// Callback for google maps autocomplete for storing autocompleted location data into
// the new member objcet
function initAutocomplete() {
  gnl.location.bindAutocomplete(
    locationArray,
    "autocomplete_current",
    "current_address",
    function currentAddress() {
      $("#autocomplete_current").val();
    }
  );
  gnl.location.bindAutocomplete(
    locationArray,
    "autocomplete_hometown",
    "hometown_address",
    function hometownAddress() {
      $("#autocomplete_hometown").val();
    }
  );
}

$("#cancelButton").click(function() {
  event.preventDefault();
  window.location.replace("index.html");
});

// form submit callback
$("#profile_form").submit(function(event) {
  // prevent navigation out of page
  event.preventDefault();
  /* Store known fields into member objcet
    */
  //  var memberGeo = {
  //  };
  var member = {};
  member.display_name = $("#display_name").val();
  member.MUN = $("#MUN").val();
  member.privacy = $("input[name=privacy]:checked").val();
  member.date_updated = Date.now();
  // Conditional reads
  if (member.MUN == "Yes") {
    member["MUN_grad_year"] = parseInt($("#MUN_grad_year_box").val());
  }

  // checkif hometown address was given
  if (locationArray.hasOwnProperty("hometown_address")) {
    member["hometown_address"] = locationArray["hometown_address"];
    //	memberGeo.id = uid;
    //	memberGeo.hometownLat = locationArray["hometown_address"]["lat"];
    //	memberGeo.hometownLng = locationArray["hometown_address"]["lng"];
  }
  // checkif current address was given
  if (locationArray.hasOwnProperty("current_address")) {
    member["current_address"] = locationArray["current_address"];
    //	memberGeo.id = uid;
    //	memberGeo.currentLat = locationArray["current_address"]["lat"];
    //	memberGeo.currentLng = locationArray["current_address"]["lng"];
  }

  //if(memberGeo.id){
  //	$.post( "GeoUser", memberGeo , function(data, status, jqXHR) {console.log('status: ' + status + ', data: ' + data);})
  //}

  member.bio = $("#bio").val();

  var private_data = {};

  private_data["interests"] = {
    connect: document.getElementById("connect").checked,
    organize: document.getElementById("organize").checked,
    learn: document.getElementById("learn").checked,
    mentor: document.getElementById("mentor").checked,
    support: document.getElementById("support").checked
  };

  private_data.comments = $("#comments").text();

  const memberDatabaseTask = memberDocRef
    .set(member, { merge: true })
    .then(function() {
      console.log("Successfully wrote to public database");
    })
    .catch(function(error) {
      console.log(error);
      console.log("Error writing public database properties for ", uid);
    });

  const privateDatabaseTask = privateDocRef
    .set(private_data, { merge: true })
    .then(function() {
      console.log("Successfully wrote to private database");
    })
    .catch(function(error) {
      console.log(error);
      console.log("Error writing private database properties for ", uid);
    });

  return Promise.all([memberDatabaseTask, privateDatabaseTask]).then(() => {
    console.log("Completed both database writes");
    window.location.replace("index.html");
  });
});

/********************************
 * Main namespace and control flow
 *********************************/

function initApp() {
  var getMemberDoc = memberDocRef
    .get()
    .then(doc => {
      if (!doc.exists) {
        console.log("No such document!");
      } else {
        userData = doc.data();
        //console.log(userData);
        if (!userData["date_updated"]) {
          $("#alertbox").html(
            "Welcome to Global NL!<br/>We're looking forward to getting to know you better. Please complete your profile below."
          );
          $("#alertbox").show();
          $("#cancelButton").hide();
        } else if (userData["date_updated"] == "-1") {
          //Can change this to so many days back later
          $("#alertbox").html(
            "Welcome back to Global NL!<br/>It's been a while since you've logged in so please review your profile before continuing."
          );
          $("#alertbox").show();
          $("#cancelButton").hide();
        }
        if (userData["current_address"] != null) {
          if (userData["current_address"]["form_address"] != null)
            $("#autocomplete_current").val(
              userData["current_address"]["form_address"]
            );
          else
            $("#autocomplete_current").val(
              getLocationString(userData["current_address"])
            );
          locationArray["current_address"] = userData["current_address"];
        }
        if (userData["hometown_address"] != null) {
          if (userData["hometown_address"]["form_address"] != null)
            $("#autocomplete_hometown").val(
              userData["hometown_address"]["form_address"]
            );
          else
            $("#autocomplete_hometown").val(
              getLocationString(userData["hometown_address"])
            );
          locationArray["hometown_address"] = userData["hometown_address"];
        }
        if (userData["MUN"] != null) $("#MUN").val(userData["MUN"]);
        if (userData["MUN"] === "Yes") $("#grad_year").show();
        if (userData["MUN_grad_year"] != null)
          $("#MUN_grad_year_box").val(userData["MUN_grad_year"]);

        if (userData["bio"] != null) $("#bio").text(userData["bio"]);

        // Privacy
        if (userData["privacy"] === "public") {
          $(':input[value="public"]').prop("checked", true);
        } else {
          $(':input[value="members"]').prop("checked", true);
        }

        //Use LinkedIn location if current location not set
        /*
		if(userData["current_address"] != null && !userData["current_address"]["form_address"] && userData["current_address"]["LinkedInLocation"] && userData["current_address"]["LinkedInLocation"] != "Newfoundland And Labrador, Canada"){
			
			var linkedinLocation = userData["current_address"]["LinkedInLocation"].replace(' Area', '');

			var geocoder = new google.maps.Geocoder();

			// Look for these keys in the place object returned by google API
			// if found, their values are filled and written to our new member object
			var locationData = {
				street_number               : true,
				route                       : true,
				locality                    : true,
				administrative_area_level_1 : true,
				country                     : true,
				postal_code                 : true
			};

			geocoder.geocode( { "address": linkedinLocation }, function(results, status) {
				if (status == google.maps.GeocoderStatus.OK && results.length > 0) {
					// iterate over object and look for the keys in locationData
					$("#autocomplete_current").val( results[0].formatted_address );
					locationArray["current_address"] = {
						locality: null,
						administrative_area_level_1 : null,  
						country: null,  
						locality_short: null,
						administrative_area_level_1_short : null,  
						country_short: null, 
						postal_code: null,
						lat: null,  
						lng: null
					};
					for (var i = 0; i < results[0].address_components.length; i++) {
						var addressType = results[0].address_components[i].types[0];
						if (locationData.hasOwnProperty(addressType)) {
							locationArray["current_address"][addressType] = results[0].address_components[i]["long_name"];
							locationArray["current_address"][addressType + "_short"] = results[0].address_components[i]["short_name"];
						}
					}
					// Store geometry into new member object as well
					locationArray["current_address"]["lat"] = results[0].geometry.location.lat();
					locationArray["current_address"]["lng"] = results[0].geometry.location.lng();
					locationArray["current_address"]["form_address"] = $("#autocomplete_current").val();
				}
			});



		}
		*/
      }
    })
    .catch(err => {
      console.log("Error getting document", err);
    });

  var getPrivateDoc = privateDocRef
    .get()
    .then(doc => {
      if (!doc.exists) {
        console.log("No such document!");
      } else {
        userData = doc.data();
        // Iterate over interests and check respective fields
        if (userData["interests"] != null) {
          for (const [interest, value] of Object.entries(userData.interests)) {
            // Check if interst exists
            if (value && document.getElementById(interest)) {
              //Check the button
              $("#" + interest).prop("checked", true);
            }
          }
        }
        // Fill comments block
        if (userData["comments"] != null)
          $("#comments").text(userData["comments"]);
      }
    })
    .catch(err => {
      console.log("Error getting document", err);
    });
}

/*****************************************************
 * Utility Functions, only referenced in this file
 *****************************************************/
/* Build location string
    Concatonate the data in the location value from a member object
    into a formatted string
    @param locationObject (Object{}) - value from location field (Either past or current) from firebase
*/
function getLocationString(locationObject) {
  // Initalize empty array to work with
  var location = [];
  // Append all required data to array
  if (locationObject.locality_short)
    location.push(locationObject.locality_short);
  else if (locationObject.locality) location.push(locationObject.locality);
  if (locationObject.administrative_area_level_1_short)
    location.push(locationObject.administrative_area_level_1_short);
  else if (locationObject.administrative_area_level_1)
    location.push(locationObject.administrative_area_level_1);
  if (locationObject.country) location.push(locationObject.country);
  //location.push(locationObject.locality, locationObject.administrative_area_level_1, locationObject.country);
  // Filter array for unwanted data, then join with ', ' to create a comma separated string from data
  return location.filter(e => e !== "" && e !== undefined).join(", ");
}
