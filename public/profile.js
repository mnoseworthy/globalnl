/******************************************************
 * Global variables
 ******************************************************/

var uid;
var adminEdit = false;
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
$(document).ready(function() {  
  if (navigator.userAgent.indexOf('gonative') > -1) { // for the mobile app
    $('#LImodal_btn').text('Update Profile URL'); // changing the modal button text for the mobile app
    var profileUsername = getUrlParameter('profileURL');
    if (profileUsername) { // true if user comes back properly from their linkedin page
    // start loading the linkedin badge
      $("#linkedin").val('https://www.linkedin.com/in/' + profileUsername);
      $("#LIbadge").html(`<div class='LI-profile-badge'  data-version='v1' data-size='large' data-locale='en_US' data-type='horizontal' data-theme='light' data-vanity='${profileUsername}'><a class='LI-simple-link' style="display: none" href='https://www.linkedin.com/in/${profileUsername}?trk=profile-badge'>LinkedIn badge</a></div>`);
      LIRenderAll();
      $("#badgeLoading").hide();
      setTimeout(function(){
        if (!$(".LI-name").length > 0) {
          $("#LIbadge").html(`<div class="badge-error-message">Error loading LinkedIn profile!</div><div class="badge-error-message">Please check your profile link.</div>`)
        }
      }, 1000); // if there are issues with valid profile links not loading the badge, try increasing this timeout
    }

    // fill up the input forms with anything the users may have typed in before they were redirected to linkedin
    if (sessionStorage.getItem("currentLocation") != null)
      $('#autocomplete_current').val(sessionStorage.getItem("currentLocation"));
    if (sessionStorage.getItem("hometown") != null)
      $('#autocomplete_hometown').val(sessionStorage.getItem("hometown"));
    if (sessionStorage.getItem("industry") != null) {
      $("#industry").val(JSON.parse(sessionStorage.getItem("industry"))).trigger('change'); 
      $("#industry").select2({
        tags: true,
        placeholder: "Select all you have experience within"
      });
    }
    if (sessionStorage.getItem("munStudent") != null) {      
      $("#MUN").val(sessionStorage.getItem("munStudent"));
      $("#grad_year").show();
      if (sessionStorage.getItem("graduateYear") != null)
        $("#MUN_grad_year_box").val(sessionStorage.getItem("graduateYear"));
    }
    if (sessionStorage.getItem("bio") != null)
      $("#bio").val(sessionStorage.getItem("bio"));
    if (sessionStorage.getItem("comments") != null)
      $("#comments").val(sessionStorage.getItem("comments"));
  }
});

/* 
* Following comment out code is used on GoNative application platform to grab user's LinkedIn profile
  var linkedinURL = document.getElementById('self-profile-logo').href;
  var pName = linkedinURL.substring(linkedinURL.indexOf('/in/')+4).replace('/','');
  window.location.replace('https://app.globalnl.com/profile.html?profileURL=' + pName);
*/

function renderWithUser(user) {
  // Set uid to be the users uid by default
  uid = user.uid;
  // Database query to check if user has admin permissions
  firebase.firestore().collection("moderators").doc(firebase.auth().currentUser.uid).get().then(doc => {
    // Check if moderator=true for the user and if session storage contains a uid
    if (doc.data().moderator && sessionStorage.getItem("uid") != null) {
      // Use the uid set in session storage by the admin button to edit the desired profile
      adminEdit = true;
      uid = sessionStorage.getItem("uid");
      // change the profile page title when admin is editing another profile
      if (document.title == "Global NL - Member Profile") {   // check the page to prevent the title from changing on DBTable too
        document.title = "Global NL - Member Profile (Admin Edit)"
      }
    }
  })
  // Catch error caused by the doc not existing in moderators collection
  .catch(error => {
    console.log("User does not have admin permissions, reverting to edit user profile");
  })
  // create references with the set uid
  .finally(() => {
    memberDocRef = firebase
      .firestore()
      .collection("members")
      .doc(uid);
    privateDocRef = firebase
      .firestore()
      .collection("private_data")
      .doc(uid);
    $("#mainPage").show();
    //$("#display_name").val(user.displayName);     
    if (navigator.userAgent.indexOf('gonative') > -1) {
      if (getUrlParameter('profileURL')) { // user has already returned from linkedin profile so do nothing
        ;
    } else { // show LinkedIn Modal for the mobile app for users who have never provided their info upon signing in
      memberDocRef
      .get()
      .then(doc => {
        if (!doc.exists) {
          console.log("User does not exist in database");
          gnl.auth.logout();
        } else {
          if (!doc.data().date_updated || doc.data().date_updated == "-1") {        
            $('#LImodalMobileApp').show();              
          }
        }
      })
      .catch(err => {
        console.log("Error getting document", err);
      });
    }
    }
    initApp();
  });
}

function renderWithoutUser() {   
  if (navigator.userAgent.indexOf('gonative') > -1) { // for the mobile app     
    window.location.replace("index.html"); // redirect to index.html when mobile app users are not signed in
  } else {
    $("#mainPage").hide();
  }
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

$('input[type="radio"]').click(function() {
  if($(this).attr('id') == 'public') {
       $('#MUN_Privacy').show();           
  }
  else if($(this).attr('id') == 'members'){
       $('#MUN_Privacy').hide();   
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

// Promise function, will resolve if the profile picture is uploaded properly on firebase storage
function uploadPhotoOnFirebaseStorage(url) {
  return new Promise(function (resolve, reject) {    
    // First, download the file:
    fetch(url).then(function(response) {
      return response.blob();
    })
    .then(function(blob) {
      // Define where to store the picture:
      var picRef = firebase.storage().ref("images/members/" + uid + "/profile_picture/" + uid + "_profile-picture");

      // Store the picture:
      picRef.put(blob).then(function(snapshot) {
        console.log('Profile Picture uploaded!');
        resolve();
      })
      .catch(function(err) {    
        console.log('Profile Picture upload failed.');
        reject();
      });
    })
    .catch(function() {
      // handle any errors
      console.log("Error getting image blob from URL");
    })
    .catch(function() {
      // handle any errors
      console.log("Error getting response from URL");
    });
  });
}

// Promise function, will resolve if the company logo is uploaded properly on firebase storage
function uploadCompanyLogoOnFirebaseStorage(url) {
  // First, download the file:
  return new Promise(function (resolve, reject) {
    fetch(url).then(function(response) {
      return response.blob();
    })
    .then(function(blob) {
      // Define where to store the picture:
      var picRef = firebase.storage().ref("images/members/" + uid + "/company_logo/" + uid + "_company-logo");

      // Store the picture:
      picRef.put(blob).then(function(snapshot) {
      console.log('Company Logo uploaded!');
      resolve();
      })
      .catch(function(err) {    
      console.log('Company Logo upload failed.');
      reject();
      });
    })
    .catch(function() {
      // handle any errors
      console.log("Error getting image blob from URL");
    })
    .catch(function() {
      // handle any errors
      console.log("Error getting response from URL");
    });
  });
}

// To get the profileURL parameter when mobile app users come back from their linkedin profile
function getUrlParameter(sParam) {
  var sPageURL = window.location.search.substring(1),
      sURLVariables = sPageURL.split('&'),
      sParameterName,
      i;

  for (i = 0; i < sURLVariables.length; i++) {
      sParameterName = sURLVariables[i].split('=');

      if (sParameterName[0] === sParam) {
          return typeof sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
      }
  }
  return false;
};

// Callback for google maps autocomplete for storing autocompleted location data into
// the new member objcet
function initAutocomplete() {
  gnl.location.bindAutocomplete(
    locationArray,
    "autocomplete_current",
    "current_address",
    true,
    function currentAddress() {
      $("#autocomplete_current").val();
    }
  );
  gnl.location.bindAutocomplete(
    locationArray,
    "autocomplete_hometown",
    "hometown_address",
    true,
    function hometownAddress() {
      $("#autocomplete_hometown").val();
    }
  );
}

$("#cancelButton").click(function() {
  //event.preventDefault();
  window.location.replace("index.html");
});

// form submit callback
$("#submitButton").click(function(event) {
  // prevent navigation out of page
  //event.preventDefault();
  /* Store known fields into member objcet
    */
  //  var memberGeo = {
  //  };
  var member = {};
  member.display_name = $("#display_name").val();
  member.MUN = $("#MUN").val();
  member.privacy = $("input[name=privacy]:checked").val();
  member.date_updated = Date.now();
  member.random = 0; // Push new/updated profiles to the top of the directory
  member.badge_transfer = "new"; // marking new users for badge data review
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
  //To store industry to database
  member.industry = $("#industry").val();

  //member.linkedin_profile = $("#linkedin").val();
  var url = $("#linkedin").val();
  if(/linkedin.com\/in\//.test(url)){
    if (!/http/.test(url)) {
      url = "https://" + url;
    }
    member.linkedin_profile = url;
  }
  else {
    $("#alertbox").html(
      "Invalid LinkedIn profile link. Please enter your link in this format:<br>www.linkedin.com/in/YOUR-PROFILE-URL/"
    );
    $("#alertbox").show();
    window.scrollTo(0, 0);
    $("#linkedin").toggleClass("linkedinBorder");
    setTimeout(() => { $("#linkedin").toggleClass("linkedinBorder"); }, 2000)
    return
  }

  //LinkedIn badge info
  if ($(".LI-profile-pic").length>0) member.photoURL = $(".LI-profile-pic").attr("src");
  if ($(".LI-title").length>0) member.headline = $(".LI-title").text();
  member.company = '';
  member.company_lower = '';
  if ($(".LI-field").length>0 && $(".LI-field > img")) { // grabbing the first img tag
    member.company = $(".LI-field > img").attr("alt"); // getting the first img tag's alt attribute, which contains the name of the company
    member.company_lower = member.company.toLowerCase();
  }
  if ($(".LI-field-icon").length>0) member.company_logo = $(".LI-field-icon").attr("src");

  var private_data = {};

  private_data["interests"] = {
    connect: document.getElementById("connect").checked,
    organize: document.getElementById("organize").checked,
    learn: document.getElementById("learn").checked,
    mentor: document.getElementById("mentor").checked,
    support: document.getElementById("support").checked
  };

  private_data.comments = $("#comments").val();

  const memberDatabaseTask = memberDocRef
    .set(member, { merge: true })
    .then(function() {
      console.log("Successfully wrote to public database");
      // removing the mobile app specific session storage items as they should not be needed anymore (submit pressed, info saved in db)
    if (navigator.userAgent.indexOf('gonative') > -1) { 
      sessionStorage.removeItem("currentLocation");
      sessionStorage.removeItem("hometown");
      sessionStorage.removeItem("industry");
      sessionStorage.removeItem("munStudent");
      sessionStorage.removeItem("graduateYear");
      sessionStorage.removeItem("bio");
      sessionStorage.removeItem("comments");
    }
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

    let uploadPhoto;
    let uploadCompanyLogo;
    // only upload profile photo on firebase storage if it is not the default ghost profile photo
    if (member.photoURL && !/ghost/gi.test(member.photoURL)) {
      uploadPhoto = uploadPhotoOnFirebaseStorage(member.photoURL);
    }     
    // only upload company logo on firebase storage if it is not the default ghost company logo
    if (member.company_logo && !/ghost/gi.test(member.company_logo)) {
      uploadCompanyLogo = uploadCompanyLogoOnFirebaseStorage(member.company_logo);
    }
    return Promise.all([memberDatabaseTask, privateDatabaseTask, uploadPhoto, uploadCompanyLogo]).then(() => {
      if (adminEdit === false) { // update user account photoURL
        // Create a reference to the file we want to download
        var profilePicRef = firebase.storage().ref("images/members/" + uid + "/profile_picture/" + uid + "_profile-picture");
        // Get the download URL
        profilePicRef.getDownloadURL()
        .then((url) => {
          firebase.auth().currentUser.updateProfile({
            photoURL: url,
          })
          .then(function() {
            console.log("Successfully updated user account photoURL");            
            console.log("Completed both database writes");
            $("#user_photo").val(url); // update the navbar user photo with the updated user account photoURL from firebase storage
            window.location.replace("index.html");
          })
          .catch(function(error) {
            console.log(error);
            console.log("Error updating user account photoURL for ", uid);
          });
        })
        .catch((error) => {
          // A full list of error codes is available at
          // https://firebase.google.com/docs/storage/web/handle-errors
          console.log("Profile Pic does not exist in the storage. Default photo will be used for user account photoURL");        
          console.log("Completed both database writes");
          window.location.replace("index.html");
        });
      } else { // admin edit mode. user acount photoURL for the desired user will be updated once they log in to the member portal
          console.log("Completed both database writes");
          window.location.replace("index.html");
      }
    })
    .catch(err => {
      console.log(err);
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
        var userData = doc.data();
        //console.log(userData);

        // Shows display name for new users and sets it in the database
        if (typeof userData["display_name"] === "undefined"){
          let newDisplayName = userData["first_name"] + " " + userData["last_name"]
          $("#display_name").val(newDisplayName);
          firebase.firestore().collection("members").doc(doc.id).update({
            display_name: newDisplayName
          });
        }
        else{
          $("#display_name").val(userData["display_name"]);
        }

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
        if (userData["industry"] != null) { //Case to deal with if any of the fields are empty
          $("#industry").val(userData["industry"]);
          $("#industry").select2({
            tags: true,
            placeholder: "Select all you have experience within"
          });
        }
        else {
          if (sessionStorage.getItem("industry") == null) {
            $("#industry").select2({
              placeholder: "Select all you have experience within"
            });
          }
        }
        if (userData["MUN"] != null) $("#MUN").val(userData["MUN"]);
        if (userData["MUN"] === "Yes") $("#grad_year").show();
        if (userData["MUN_grad_year"] != null)
          $("#MUN_grad_year_box").val(userData["MUN_grad_year"]);

        if (userData["bio"] != null) $("#bio").text(userData["bio"]);

    		if (userData["linkedin_profile"] != null) {
          $("#linkedin").val(userData["linkedin_profile"]);
          $("#LIbadge").html(`<div class='LI-profile-badge'  data-version='v1' data-size='large' data-locale='en_US' data-type='horizontal' data-theme='light' data-vanity='${userData["linkedin_profile"].substring(userData["linkedin_profile"].indexOf('/in/')+4).replace('/','')}'><a class='LI-simple-link' style="display: none" href='${userData["linkedin_profile"]}?trk=profile-badge'>LinkedIn badge</a></div>`);
          LIRenderAll();
          $("#badgeLoading").hide();
          setTimeout(function(){
            if (!$(".LI-name").length > 0) {
              $("#LIbadge").html(`<div class="badge-error-message">Error loading LinkedIn profile!</div><div class="badge-error-message">Please check your profile link.</div>`)
            }
          }, 600); // if there are issues with valid profile links not loading the badge, try increasing this timeout
        }

        // Privacy
        if (userData["privacy"] === "public") {
          $(':input[value="public"]').prop("checked", true);
          $('#MUN_Privacy').show();     
        } else {
          $(':input[value="members"]').prop("checked", true);
          $('#MUN_Privacy').hide();     
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
        var userData = doc.data();
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


//highlights any text in the LI link form
$('#linkedin').on("focus", function () {
   $(this).select();
});


// LI link modal stuff
// Open the modal
$("#LImodal_btn").click(function() {
  if (navigator.userAgent.indexOf('gonative') > -1) {        
    $('#LImodalMobileApp').show();
  } else {
    $('#LImodal').show();
  }
});
// Close the modal with the x
$("#LImodal_exit").click(function() {
  $('#LImodal').hide();
});

// Close the mobile modal with the x
$("#LImodalMobileApp_exit").click(function() {
  $('#LImodalMobileApp').hide();
});

// Close the modal when user clicks outside of it
window.onclick = function(event) {
  if (event.target == $('#LImodal')) {
    $('#LImodal').hide();
  } else if (event.target == $('#LImodalMobileApp')) {
    $('#LImodalMobileApp').hide();
  }
}

// Profile link in the modal
$("#LI_btnprofile").click(function() {  
if(confirm('Click OK to open LinkedIn in a new window.\nCopy your profile URL and return here to paste.')){
  window.open("https://www.linkedin.com/public-profile/settings", "_blank"); // Redirect to the profile
  $('#LImodal').hide(); //close modal
  $('#linkedin').focus(); //focus on LI link form
}
});

// Profile link in the mobile app modal
$("#LImodalMobileApp_btnprofile").click(function() {  
  if (navigator.userAgent.indexOf('gonative') > -1) {
    // saving the form inputs as sessionStorage so that they can be retrieved when users return from their linkedin profile
    if ($('#autocomplete_current').val())
        sessionStorage.setItem("currentLocation", $('#autocomplete_current').val());
    if ($('#autocomplete_hometown').val())
      sessionStorage.setItem("hometown", $('#autocomplete_hometown').val());
    if($("#industry").val() && $("#industry").val().length) // check if not empty industry selection
      sessionStorage.setItem("industry", JSON.stringify($("#industry").val()));
    if ($("#MUN").val() == "Yes") {      
      sessionStorage.setItem("munStudent", $("#MUN").val());
      if ($("#MUN_grad_year_box").val())
        sessionStorage.setItem("graduateYear", $("#MUN_grad_year_box").val());
    }
    if ($("#bio").val())
      sessionStorage.setItem("bio", $("#bio").val());    
    if ($("#comments").val())
      sessionStorage.setItem("comments", $("#comments").val());
    $('#LImodalMobileApp').hide(); //close modal  
    window.location.href = 'https://www.linkedin.com/in/me/'; // redirecting users to their linkedin profiles
  }
});

// Displays badge when LinkedIn link is edited
$('#linkedin').change(() => {
  $("#badgeLoading").show();
  let profileLink = $("#linkedin").val();
  let vanityName = profileLink.substring(profileLink.indexOf('/in/')+4).replace('/','');
  $("#LIbadge").html(`<div class='LI-profile-badge'  data-version='v1' data-size='large' data-locale='en_US' data-type='horizontal' data-theme='light' data-vanity='${vanityName}'><a class='LI-simple-link' style='display: none' href='${profileLink}?trk=profile-badge'>LinkedIn badge</a></div>`);
  LIRenderAll();
  $("#badgeLoading").hide();
  setTimeout(function(){
    if (!$(".LI-name").length > 0) {
      $("#LIbadge").html(`<div class="badge-error-message">Error loading LinkedIn profile!</div><div class="badge-error-message">Please check your profile link.</div>`)
    }
  }, 600); // if there are issues with valid profile links not loading the badge, try increasing this timeout
});

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
