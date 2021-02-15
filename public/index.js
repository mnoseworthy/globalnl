/******************************************************
 * Global variables
 ******************************************************/


// Object with last returned database query to use for pagination
var last_read_doc = 0;

// Track status of request to add more member profiles during scroll
// Set to true after request is completed to avoid initiating a new query before the first one is returned
var scrollQueryComplete = false;

// Keep track of locations entered in search fields
var formDynamic = {};
var formStatic = {};

const members_per_page = 15;

// Track which buttons were pressed to know which pagination query to send when scrolled to bottom of page
var searchButtonStates = {};
searchButtonStates["name"] = false;
searchButtonStates["location"] = false;
searchButtonStates["industry"] = false;
searchButtonStates["hometown"] = false;
searchButtonStates["company"] = false;

// Firebase
const settings = { timestampsInSnapshots: true };
firebase.firestore().settings(settings);
var fbi = firebase.firestore().collection("members");
//var uid = firebase.auth().currentUser.uid;

function renderWithUser(user) {
  $("#members-list").empty();
  $("#mainPage").show();
  initLoad();
  showAdminToggle();
}

function renderWithoutUser() {
  $("#members-list").empty();
  $("#mainPage").hide();
}

gnl.auth.listenForStageChange(renderWithUser, renderWithoutUser, true);

function noop() {}

function createSendAMessageForm(id, toDisplayName, fromEmailAddress) {
  var sendAMessageContainer = document.getElementById("modalSendAMessageBody"),
    sendAMessageForm = document.createElement("form"),
    nameRow = document.createElement("div"),
    nameInputGroup = document.createElement("div"),
    nameLabel = document.createElement("label"),
    nameInput = document.createElement("input"),
    messageRow = document.createElement("div"),
    messageInputGroup = document.createElement("div"),
    messageLabel = document.createElement("label"),
    messageInput = document.createElement("textarea"),
    noteSmall = document.createElement("small"),
    submitForm = document.getElementById("modalSendAMessageSubmit");

  sendAMessageContainer.innerHTML = "";
  sendAMessageContainer.appendChild(sendAMessageForm);

  sendAMessageForm.appendChild(nameRow);

  nameRow.className = "row";
  nameRow.appendChild(nameInputGroup);

  nameInputGroup.className = "input-group col-xs-12 col-lg-12";
  nameInputGroup.appendChild(nameLabel);
  nameInputGroup.appendChild(nameInput);

  nameLabel.className = "col-xs-4 col-lg-3 col-form-label";
  nameLabel.innerText = "To";

  nameInput.className = "form-control py-2 border";
  nameInput.value = toDisplayName;
  nameInput.readOnly = true;

  sendAMessageForm.appendChild(messageRow);

  messageRow.className = "row";
  messageRow.appendChild(messageInputGroup);

  messageInputGroup.className = "input-group col-xs-12 col-lg-12";
  messageInputGroup.appendChild(messageLabel);
  messageInputGroup.appendChild(messageInput);

  messageLabel.className = "col-xs-4 col-lg-3 col-form-label";
  messageLabel.innerText = "Message";

  messageInput.className = "form-control py-2 border";
  messageInput.rows = 5;

  sendAMessageForm.appendChild(noteSmall);

  noteSmall.innerText = `The GlobalNL member receiving this message will be provided with your email address and will be able to respond to you at ${fromEmailAddress}`;

  submitForm.onclick = function () {
    submitForm.onclick = noop;

    $('#modalSendAMessage').modal('hide')

    var sendMessageToUser = firebase.functions().httpsCallable('sendMessageToUser');
    sendMessageToUser({
      toUserId: id,
      message: messageInput.value
    })
      .then(function (result) {
        console.log(result);
      })
      .catch(function (reason) {
        console.error("Send message failed", reason);
      })
  };
}

/*****************************************************
 * Register event callbacks & implement element callbacks
 ******************************************************/
// Init auth on load web page event
$(document).ready(function() {          
  $("#LIbadge").hide();
  $("#preloader").hide();
  initApp();
});

// Callback executed on page load
function initApp() {
  $(window).scroll(function() {
    if (scrollQueryComplete) {
      if (
        $(window).scrollTop() >
        $(document).height() - $(window).height() - $(window).height() / 6
      ) {
        $("#preloader").show();
        scrollQueryComplete = false;
        memberSearch();
      }
    }
  });

  $("#form_name").submit(function(event) {
    event.preventDefault();
    if ($("#inputFirstName").val() || $("#inputLastName").val()) {
      console.log("Searching by name...");
      $("#members-list").empty();
      $("#preloader").show();
      formStatic["name"] = [];
      formStatic["name"]["first"] =
        $("#inputFirstName")
          .val()
          .charAt(0)
          .toUpperCase() +
        $("#inputFirstName")
          .val()
          .slice(1)
          .toLowerCase();
      formStatic["name"]["last"] =
        $("#inputLastName")
          .val()
          .charAt(0)
          .toUpperCase() +
        $("#inputLastName")
          .val()
          .slice(1)
          .toLowerCase();
      last_read_doc = 0;
      searchButtonStates["name"] = true;
      searchButtonStates["company"] = false;
      searchButtonStates["industry"] = false;
      searchButtonStates["location"] = false;
      searchButtonStates["hometown"] = false;
      memberSearch();
    }
  });

  $("#form_company").submit(function(event) {
    event.preventDefault();
    if ($("#inputcompany").val()) {
      console.log("Searching by company...");
      $("#members-list").empty();
      $("#preloader").show();
      formStatic["company"] = $("#inputcompany").val().toLowerCase();
      last_read_doc = 0;
      searchButtonStates["name"] = false;
      searchButtonStates["company"] = true;
      searchButtonStates["industry"] = false;
      searchButtonStates["location"] = false;
      searchButtonStates["hometown"] = false;
      memberSearch();
    }
  });

  $("#form_industry").submit(function(event) {
    event.preventDefault();
    if ($("#inputIndustry").val()) {
      console.log("Searching by industry...");
      $("#members-list").empty();
      $("#preloader").show();
      formStatic["industry"] = $("#inputIndustry").val();
      last_read_doc = 0;
      searchButtonStates["industry"] = true;
      searchButtonStates["name"] = false;
      searchButtonStates["location"] = false;
      searchButtonStates["hometown"] = false;
      searchButtonStates["company"] = false;
      memberSearch();
    }
  });

  $("#form_location").submit(function(event) {
    event.preventDefault();
    if ($("#autocomplete_current").val()) {
      console.log("Searching by location...");
      $("#members-list").empty();
      $("#preloader").show();
      formStatic["location"] = [];
      formStatic["location"]["city"] =
        formDynamic["current_address"]["locality"];
      formStatic["location"]["prov"] =
        formDynamic["current_address"]["administrative_area_level_1"];
      formStatic["location"]["country"] =
        formDynamic["current_address"]["country"];
      last_read_doc = 0;
      searchButtonStates["location"] = true;
      searchButtonStates["name"] = false;
      searchButtonStates["industry"] = false;
      searchButtonStates["hometown"] = false;
      searchButtonStates["company"] = false;
      memberSearch();
    }
  });

  $("#form_hometown").submit(function(event) {
    event.preventDefault();
    if ($("#autocomplete_hometown").val()) {
      console.log("Searching by hometown / NL roots...");
      $("#members-list").empty();
      $("#preloader").show();
      formStatic["hometown"] = [];
      formStatic["hometown"]["city"] =
        formDynamic["hometown_address"]["locality"];
      formStatic["hometown"]["prov"] =
        formDynamic["hometown_address"]["administrative_area_level_1"];
      formStatic["hometown"]["country"] =
        formDynamic["hometown_address"]["country"];
      last_read_doc = 0;
      searchButtonStates["hometown"] = true;
      searchButtonStates["name"] = false;
      searchButtonStates["location"] = false;
      searchButtonStates["industry"] = false;
      searchButtonStates["company"] = false;
      memberSearch();
    }
  });

  $(".clear_button").click(function(event) {
    console.log("Clear search...");
    $("#preloader").show();
    $("#form_name")
      .get(0)
      .reset();
    $("#form_location")
      .get(0)
      .reset();
    $("#form_industry")
      .get(0)
      .reset();
    $("#form_hometown")
      .get(0)
      .reset();
    searchButtonStates["name"] = false;
    searchButtonStates["location"] = false;
    searchButtonStates["industry"] = false;
    searchButtonStates["hometown"] = false;
    searchButtonStates["company"] = false;
    last_read_doc = 0;
    $("#members-list").empty();
    memberSearch();
  });

  return true;
}
//end initApp
// Callback executed on page load
function initLoad() {
  var memberDocRef = fbi.doc(firebase.auth().currentUser.uid);

  var getMemberDoc = memberDocRef
    .get()
    .then(doc => {
      if (!doc.exists) {
        console.log("User does not exist in database");
        gnl.auth.logout();
      } else {
        if (!doc.data().date_updated || doc.data().date_updated == "-1") { // executes if user still did not update profile information
          if (!/firebasestorage/g.test(firebase.auth().currentUser.photoURL)) { // true if user account photoURL has not been updated with firebase storage url
            uploadPhotoOnFirebaseStorage(firebase.auth().currentUser.photoURL, doc.id).then(() => {
              // Create a reference to the file we want to download
              var profilePicRef = firebase.storage().ref("images/members/" + doc.id + "/profile_picture/" + doc.id + "_profile-picture");
              // Get the download URL
              profilePicRef.getDownloadURL()
              .then((url) => {
                firebase.auth().currentUser.updateProfile({ // updating user account photoURL with firebase storage url
                  photoURL: url,
                })
                .then(function() {
                  console.log("Successfully updated user account photoURL");
                  $("#user_photo").attr('src', url); // update the navbar user photo with the updated user account photoURL from firebase storage
                  window.location.href = "profile.html";
                })
                .catch(function(error) {
                  console.log(error);
                  console.log("Error updating user account photoURL for ", doc.id);
                });
              })
              .catch((error) => {
                // A full list of error codes is available at
                // https://firebase.google.com/docs/storage/web/handle-errors
                console.log("Profile Pic does not exist in the storage. Default photo will be used user account photoURL");
              });
            })
            .catch(err => {
              console.log(err);
            });
          } else if (/firebasestorage/g.test(firebase.auth().currentUser.photoURL)) { // update user account photoURL with new firebase storage url
              // Create a reference to the file we want to download
              var profilePicRef = firebase.storage().ref("images/members/" + doc.id + "/profile_picture/" + doc.id + "_profile-picture");
              // Get the download URL
              profilePicRef.getDownloadURL()
              .then((url) => {
                if (firebase.auth().currentUser.photoURL !== url) {
                  firebase.auth().currentUser.updateProfile({ // updating user account photoURL with new firebase storage url
                    photoURL: url,
                  })
                  .then(function() {
                    console.log("Successfully updated user account photoURL");
                    $("#user_photo").attr('src', url); // update the navbar user photo with the new user account photoURL from firebase storage
                    window.location.href = "profile.html";
                  })
                  .catch(function(error) {
                    console.log(error);
                    console.log("Error updating user account photoURL for ", doc.id);
                  });
                } else { // firebase storage url is still the same so no need to update user account photoURL 
                  $("#user_photo").attr('src', url); // set the navbar user photo with the user account photoURL from firebase storage
                  window.location.href = "profile.html";
                }
              })
              .catch((error) => {
                // A full list of error codes is available at
                // https://firebase.google.com/docs/storage/web/handle-errors
                console.log("Profile Pic does not exist in the storage. Default photo will be used user account photoURL");
              });
            }

        } else {
            var profileLink = doc.data().linkedin_profile;
            var vanityName = profileLink.substring(profileLink.indexOf('/in/')+4).replace('/','');
            var photoURL, companyLogo;

            $("#LIbadge").html(`<div class='LI-profile-badge'  data-version='v1' data-size='large' data-locale='en_US' data-type='horizontal' data-theme='light' data-vanity='${vanityName}'><a class='LI-simple-link' style='display: none' href='${profileLink}?trk=profile-badge'>LinkedIn badge</a></div>`);
            LIRenderAll();                        
            let uploadPhoto;
            let uploadCompanyLogo;
            setTimeout(function(){
              if (!$(".LI-name").length > 0) {
                  console.log("Failed to load badge. Database and Storage not updated.");
              } else {
                  //LinkedIn badge info
                  if ($(".LI-profile-pic").length>0) photoURL = $(".LI-profile-pic").attr("src");
                  
                  if ($(".LI-field-icon").length>0) companyLogo = $(".LI-field-icon").attr("src");

                  // checking if users photoURL in the database is valid
                  if (photoURL && doc.data().photoURL !== photoURL && !/ghost/gi.test(photoURL)) { // global, case-insensitive regex test
                    firebase.firestore().collection("members").doc(doc.id).update({
                      photoURL: photoURL
                    });
                    uploadPhoto = uploadPhotoOnFirebaseStorage(photoURL, doc.id);
                  } else {
                    console.log("No need to update photo");
                  }
                  // checking if users company_logo in the database is valid
                  if (companyLogo && doc.data().company_logo !== companyLogo && !/ghost/gi.test(companyLogo)) { // global, case-insensitive regex test
                    firebase.firestore().collection("members").doc(doc.id).update({
                      company_logo: companyLogo
                    });
                    uploadCompanyLogo = uploadCompanyLogoOnFirebaseStorage(companyLogo, doc.id);    
                  } else {
                    console.log("No need to update company logo.");
                  }

                  return Promise.all([uploadPhoto, uploadCompanyLogo]).then(() => {
                    console.log("Completed both storage uploads if it was required");                
                    $("#LIbadge").remove();
                    // Create a reference to the file we want to download
                    var profilePicRef = firebase.storage().ref("images/members/" + doc.id + "/profile_picture/" + doc.id + "_profile-picture");
                    // Get the download URL
                    profilePicRef.getDownloadURL()
                    .then((url) => {
                      firebase.auth().currentUser.updateProfile({
                        photoURL: url,
                      })
                      .then(function() {
                        console.log("Successfully updated user account photoURL");
                        $("#user_photo").attr('src', url); // update the navbar user photo with the updated user account photoURL from firebase storage
                        $(`#${doc.id}_photoURL`).attr('src', url); // update member display photo icon from firebase storage url
                        if (doc.data().company) {                     
                          var companyLogoRef = firebase.storage().ref("images/members/" + doc.id + "/company_logo/" + doc.id + "_company-logo");
                          // Get the download URL
                          companyLogoRef.getDownloadURL()
                          .then((url) => {
                            // Insert url into the companyLogo <img> tag to "download"
                            $(`#${doc.id}_companyLogo`).attr('src', url); // update member display company logo from firebase storage url
                          })
                          .catch((error) => {
                            // A full list of error codes is available at
                            // https://firebase.google.com/docs/storage/web/handle-errors
                            console.log("Company logo does not exist in the storage. Default logo will be used");
                          });
                        }
                      })
                      .catch(function(error) {
                        console.log(error);
                        console.log("Error updating user account photoURL for ", doc.id);
                      });
                    })
                    .catch((error) => {
                      // A full list of error codes is available at
                      // https://firebase.google.com/docs/storage/web/handle-errors
                      console.log("Profile Pic does not exist in the storage. Default photo will be used user account photoURL");
                    });
                  })
                  .catch(err => {
                    console.log(err);
                  });
              }
            }, 700); // if there are issues with valid profile links not loading the badge, try increasing this timeout            
        }

        formDynamic["current_address"] = doc.data().current_address;
        formDynamic["hometown_address"] = doc.data().hometown_address;

        formStatic["hometown"] = [];
        formStatic["hometown"]["city"] =
          formDynamic["hometown_address"]["locality"] || "";
        formStatic["hometown"]["prov"] =
          formDynamic["hometown_address"]["administrative_area_level_1"] || "";
        formStatic["hometown"]["country"] =
          formDynamic["hometown_address"]["country"] || "";

        formStatic["location"] = [];
        formStatic["location"]["city"] =
          formDynamic["current_address"]["locality"] || "";
        formStatic["location"]["prov"] =
          formDynamic["current_address"]["administrative_area_level_1"] || "";
        formStatic["location"]["country"] =
          formDynamic["current_address"]["country"] || "";

        if (formDynamic["current_address"] != null) {
          if (formDynamic["current_address"]["form_address"] != null)
            $("#autocomplete_current").val(
              formDynamic["current_address"]["form_address"]
            );
          else
            $("#autocomplete_current").val(
              getLocationString(formDynamic["current_address"])
            );
        }
        if (formDynamic["hometown_address"] != null) {
          if (formDynamic["hometown_address"]["form_address"] != null)
            $("#autocomplete_hometown").val(
              formDynamic["hometown_address"]["form_address"]
            );
          else
            $("#autocomplete_hometown").val(
              getLocationString(formDynamic["hometown_address"])
            );
        }
      }
    })
    .catch(err => {
      console.log("Error getting document", err);
    });

  fbi
    .orderBy("random")
    .limit(members_per_page)
    .get()
    .then(function(querySnapshot) {
      loadMembers(querySnapshot);
    });

  return true;
}

// profile load callback
function profile() {
  console.log("Nav profile.html");
  window.location.href = "profile.html";
}

// Promise function, will resolve if the profile picture is uploaded properly on firebase storage
function uploadPhotoOnFirebaseStorage(url, uid) {
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
function uploadCompanyLogoOnFirebaseStorage(url, uid) {
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

/* load members */
function loadMembers(querySnapshot) {
  if (querySnapshot.docs.length > 0) {
    last_read_doc = querySnapshot.docs[querySnapshot.docs.length - 1];
    querySnapshot.forEach(function(doc) {
      // doc.data() is never undefined for query doc snapshots

      // copied_account set if old account migrated over - need to manually delete these
      //if(!doc.data().){
      // Build argument's for memberElement
      var data = doc.data(),
        firstName = data.first_name,
        lastName = data.last_name,
        photoURL = "assets/ghost_person_200x200_v1.png",
        companyLogo = "assets/ghost_company_80x80_v1.png";

      var memberFields = {
        public_uid: doc.id,
        firstName: firstName,
        lastName: lastName,
        currentAddress: getLocationString(data.current_address),
        industry: data.industry,
        hometown: getLocationString(data.hometown_address),
        bio: data.bio || "",
        linkedin_profile: data.linkedin_profile,
        munAlumni: data.MUN,
        photoURL: "",
        headline: data.headline || "",
        company: data.company,
        companyLogo: ""
      };

      if (memberFields.bio !== null && memberFields.bio !== "") {
        var bio = memberFields.bio.replace(/\n/g, "<br/>"); // replacing any instances of newline with <br/> to be compatible with html
        memberFields.bio = bio;
      }
      // Build element and inject
      var linkSendAMessage = document.createElement("a");
      linkSendAMessage.setAttribute("data-toggle", "modal");
      linkSendAMessage.setAttribute("data-target", "#modalSendAMessage");
      linkSendAMessage.href = "#";
      linkSendAMessage.onclick = function() {
        firebase
          .firestore()
          .collection("private_data")
          .doc(firebase.auth().currentUser.uid)
          .get()
          .then(function (privateData) {
            const email = privateData.data().email;
            createSendAMessageForm(doc.id, data.display_name || `${firstName} ${lastName}`, email);
          });
      };
      linkSendAMessage.innerText = "Send a message";

      var spanSendAMessage = document.createElement("span");
      spanSendAMessage.className = "fas fa-globalnl fa-envelope";

      var headerSendAMessage = document.createElement("h5");
      headerSendAMessage.className = "card-title card-title-bottom";
      headerSendAMessage.appendChild(spanSendAMessage);
      headerSendAMessage.appendChild(linkSendAMessage);

      //Variable storing whether the memeber is a mun alumni or not
      var vis = memberFields.munAlumni === "Yes" ? "visible" : "hidden";
      var memberDomString;

      // adding spaces between multiple industries on profiles
      if (memberFields.industry) {
        var cardIndustry = memberFields.industry.toString().replace(",", ", ");
      }

      // checking if users photoURL in the database is valid and then adding it to the card
      // if (memberFields.photoURL && memberFields.photoURL !== "https://static-exp1.licdn.com/scds/common/u/images/themes/katy/ghosts/person/ghost_person_200x200_v1.png") {
      //   $.ajax({
      //     type: 'GET',
      //     url: memberFields.photoURL,
      //     async: true,
      //     success: function (data) {
      //       $(`#${memberFields.public_uid}_photoURL`).attr('src', memberFields.photoURL);
      //     },
      //     error: function(jqXHR, textStatus, ex) {
      //       console.log(textStatus + "," + ex + "," + jqXHR.responseText);
      //     }
      //   });
      // }

      // Create a reference to the file we want to download
      var profilePicRef = firebase.storage().ref("images/members/" + memberFields.public_uid + "/profile_picture/" + memberFields.public_uid + "_profile-picture");
      // Get the download URL
      profilePicRef.getDownloadURL()
      .then((url) => {
        memberFields.photoURL = url;
        // Insert url into the photoURL <img> tag to "download"
        $(`#${memberFields.public_uid}_photoURL`).attr('src', memberFields.photoURL);
      })
      .catch((error) => {
        // A full list of error codes is available at
        // https://firebase.google.com/docs/storage/web/handle-errors
        console.log("Profile Pic does not exist in the storage. Default photo will be used");
      });

      if (memberFields.company) {        
        // Create a reference to the file we want to download
        var companyLogoRef = firebase.storage().ref("images/members/" + memberFields.public_uid + "/company_logo/" + memberFields.public_uid + "_company-logo");
        // Get the download URL
        companyLogoRef.getDownloadURL()
        .then((url) => {
          memberFields.companyLogo = url;
          // Insert url into the companyLogo <img> tag to "download"
          $(`#${memberFields.public_uid}_companyLogo`).attr('src', memberFields.companyLogo);
        })
        .catch((error) => {
          // A full list of error codes is available at
          // https://firebase.google.com/docs/storage/web/handle-errors
          console.log("Company logo does not exist in the storage. Default logo will be used");
        });
      }

      if (
        memberFields.company &&
        memberFields.bio &&
        memberFields.linkedin_profile
      ) {
        showAdminButton();
        memberDomString = `<div class="col-auto p-1 card-col">
<div class="card card-gnl">
	<div>
	<div class="card-header card-header-gnl">
  <span class="fas fa-gnl-head">
  <img id="${memberFields.public_uid}_photoURL" src="${photoURL}" class="gnl-user-photo"></span>
  <div style="width: 195px">
  ${firstName} ${lastName}
  <div class="card-header-headline">
  ${memberFields.headline}</div>
  </div>
  </div>
	<div class="munLogoAdder" style="position: absolute; right: 10px; top: 5px; visibility: ${vis};"><img src="assets/MUN_Logo_Pantone_Border_Small.jpg" alt="MUN LOGO"></div>
	</div>
	<div class="card-body card-body-gnl">
    <h5 class="card-title"><span class="fas fa-globalnl"><img id="${memberFields.public_uid}_companyLogo" style="width: 100%" src="${companyLogo}"></span>${
      memberFields.company
    }</h5>
    <h5 class="card-title card-title-undercompany"><span class="fas fa-globalnl fa-industry"></span>${
      cardIndustry
    }</h5>
    <h5 class="card-title"><span class="fas fa-globalnl fa-map-marker-alt"></span>${
      memberFields.currentAddress
    }</h5>
    <h5 class="card-title"><span class="fas fa-globalnl fa-anchor"></span>${
      memberFields.hometown
    }</h5>
    <h5 class="card-title"><table><tr>
    <td class="fas fa-globalnl fa-info-circle"></td>
    <td style="padding-right:0.5rem"> ${memberFields.bio}</td>
    </tr></table></h5>
    <h5 class="card-title"><span class="fab fa-globalnl fa-linkedin-in" style="margin-right: 0rem"></span>
    <a href="${memberFields.linkedin_profile}" target="___blank">View LinkedIn Profile</a>
    </h5>
    <button id="${memberFields.public_uid}" type="button" class="btn btn-light adminButton" onclick="adminRedirect();"> Edit Profile as Administrator </button>
  </div>
</div>
</div>`;
        console.log(
          "Loaded profile: " +
            firstName +
            "  -  " +
            data.linkedin_profile +
            "  -  " +
            doc.id
        );
      }
      else if (
        memberFields.company &&
        memberFields.linkedin_profile
      ) {
        showAdminButton();
        memberDomString = `<div class="col-auto p-1 card-col">
<div class="card card-gnl">
	<div>
	<div class="card-header card-header-gnl">
  <span class="fas fa-gnl-head">
  <img id="${memberFields.public_uid}_photoURL" src="${photoURL}" class="gnl-user-photo"></span>
  <div style="width: 195px">
  ${firstName} ${lastName}
  <div class="card-header-headline">
  ${memberFields.headline}</div>
  </div>
  </div>
	<div class="munLogoAdder" style="position: absolute; right: 10px; top: 5px; visibility: ${vis};"><img src="assets/MUN_Logo_Pantone_Border_Small.jpg" alt="MUN LOGO"></div>
	</div>
	<div class="card-body card-body-gnl">
    <h5 class="card-title"><span class="fas fa-globalnl"><img id="${memberFields.public_uid}_companyLogo" style="width: 100%" src="${companyLogo}"></span>${
      memberFields.company
    }</h5>
    <h5 class="card-title card-title-undercompany"><span class="fas fa-globalnl fa-industry"></span>${
      cardIndustry
    }</h5>
    <h5 class="card-title"><span class="fas fa-globalnl fa-map-marker-alt"></span>${
      memberFields.currentAddress
    }</h5>
    <h5 class="card-title"><span class="fas fa-globalnl fa-anchor"></span>${
      memberFields.hometown
    }</h5>
    <h5 class="card-title"><span class="fab fa-globalnl fa-linkedin-in" style="margin-right: 0rem"></span>
    <a href="${memberFields.linkedin_profile}" target="___blank">View LinkedIn Profile</a>
    </h5>
    <button id="${memberFields.public_uid}" type="button" class="btn btn-light adminButton" onclick="adminRedirect();"> Edit Profile as Administrator </button>
  </div>
</div>
</div>`;
        console.log(
          "Loaded profile: " +
            firstName +
            "  -  " +
            data.linkedin_profile +
            "  -  " +
            doc.id
        );
      }
      else if (
        memberFields.bio &&
        memberFields.linkedin_profile
      ) {
        showAdminButton();
        memberDomString = `<div class="col-auto p-1 card-col">
      <div class="card card-gnl">
      <div>
      <div class="card-header card-header-gnl">
      <span class="fas fa-gnl-head">
      <img id="${memberFields.public_uid}_photoURL" src="${photoURL}" class="gnl-user-photo"></span>
      <div style="width: 195px">
      ${firstName} ${lastName}
      <div class="card-header-headline">
      ${memberFields.headline}</div>
      </div>
      </div>
      <div class="munLogoAdder" style="position: absolute; right: 10px; top: 5px; visibility: ${vis};"><img src="assets/MUN_Logo_Pantone_Border_Small.jpg" alt="MUN LOGO"></div>
      </div>
      <div class="card-body card-body-gnl">
      <h5 class="card-title"><span class="fas fa-globalnl fa-industry"></span>${
      cardIndustry
      }</h5>
      <h5 class="card-title"><span class="fas fa-globalnl fa-map-marker-alt"></span>${
      memberFields.currentAddress
      }</h5>
      <h5 class="card-title"><span class="fas fa-globalnl fa-anchor"></span>${
      memberFields.hometown
      }</h5>
      <h5 class="card-title"><table><tr>
      <td class="fas fa-globalnl fa-info-circle"></td>
      <td style="padding-right:0.5rem"> ${memberFields.bio}</td>
      </tr></table></h5>
      <h5 class="card-title"><span class="fab fa-globalnl fa-linkedin-in" style="margin-right: 0rem"></span>
      <a href="${memberFields.linkedin_profile}" target="___blank">View LinkedIn Profile</a>
      </h5>
      <button id="${memberFields.public_uid}" type="button" class="btn btn-light adminButton" onclick="adminRedirect();"> Edit Profile as Administrator </button>
      </div>
      </div>
      </div>`;
        console.log(
          "Loaded profile: " +
            firstName +
            "  -  " +
            data.linkedin_profile +
            "  -  " +
            doc.id
        );
      }
      else if (
        memberFields.linkedin_profile
      ) {
        showAdminButton();
        memberDomString = `<div class="col-auto p-1 card-col">
      <div class="card card-gnl">
      <div>
      <div class="card-header card-header-gnl">
      <span class="fas fa-gnl-head">
      <img id="${memberFields.public_uid}_photoURL" src="${photoURL}" class="gnl-user-photo"></span>
      <div style="width: 195px">
      ${firstName} ${lastName}
      <div class="card-header-headline">
      ${memberFields.headline}</div>
      </div>
      </div>
      <div class="munLogoAdder" style="position: absolute; right: 10px; top: 5px; visibility: ${vis};"><img src="assets/MUN_Logo_Pantone_Border_Small.jpg" alt="MUN LOGO"></div>
      </div>
      <div class="card-body card-body-gnl">
      <h5 class="card-title"><span class="fas fa-globalnl fa-industry"></span>${
      cardIndustry
      }</h5>
      <h5 class="card-title"><span class="fas fa-globalnl fa-map-marker-alt"></span>${
      memberFields.currentAddress
      }</h5>
      <h5 class="card-title"><span class="fas fa-globalnl fa-anchor"></span>${
      memberFields.hometown
      }</h5>
      <h5 class="card-title"><span class="fab fa-globalnl fa-linkedin-in" style="margin-right: 0rem"></span>
      <a href="${memberFields.linkedin_profile}" target="___blank">View LinkedIn Profile</a>
      </h5>
      <button id="${memberFields.public_uid}" type="button" class="btn btn-light adminButton" onclick="adminRedirect();"> Edit Profile as Administrator </button>
      </div>
      </div>
      </div>`;
        console.log(
          "Loaded profile: " +
            firstName +
            "  -  " +
            data.linkedin_profile +
            "  -  " +
            doc.id
        );
      }
      else if (
        memberFields.bio
      ) {
        showAdminButton();
        memberDomString = `<div class="col-auto p-1 card-col">
      <div class="card card-gnl">
      <div>
      <div class="card-header card-header-gnl">
      <span class="fas fa-gnl-head">
      <img id="${memberFields.public_uid}_photoURL" src="${photoURL}" class="gnl-user-photo"></span>
      <div style="width: 195px">
      ${firstName} ${lastName}
      <div class="card-header-headline">
      ${memberFields.headline}</div>
      </div>
      </div>
      <div class="munLogoAdder" style="position: absolute; right: 10px; top: 5px; visibility: ${vis};"><img src="assets/MUN_Logo_Pantone_Border_Small.jpg" alt="MUN LOGO"></div>
      </div>
      <div class="card-body card-body-gnl">
      <h5 class="card-title"><span class="fas fa-globalnl fa-industry"></span>${
      cardIndustry
      }</h5>
      <h5 class="card-title"><span class="fas fa-globalnl fa-map-marker-alt"></span>${
      memberFields.currentAddress
      }</h5>
      <h5 class="card-title"><span class="fas fa-globalnl fa-anchor"></span>${
      memberFields.hometown
      }</h5>
      <h5 class="card-title"><table><tr>
      <td class="fas fa-globalnl fa-info-circle"></td>
      <td style="padding-right:0.5rem"> ${memberFields.bio}</td>
      </tr></table></h5>
      <button id="${memberFields.public_uid}" type="button" class="btn btn-light adminButton" onclick="adminRedirect();"> Edit Profile as Administrator </button>
      </div>
      </div>
      </div>`;
        console.log(
          "Loaded profile: " +
            firstName +
            "  - no LinkedIn profile - " +
            doc.id
        );
      }
      else {
        showAdminButton();
        memberDomString = `<div class="col-auto p-1 card-col">
<div class="card card-gnl">
	<div>
	<div class="card-header card-header-gnl">
  <span class="fas fa-gnl-head">
  <img id="${memberFields.public_uid}_photoURL" src="${photoURL}" class="gnl-user-photo"></span>
  <div style="width: 195px">
  ${firstName} ${lastName}
  <div class="card-header-headline">
  ${memberFields.headline}</div>
  </div>
  </div>
	<div class="munLogoAdder" style="position: absolute; right: 10px; top: 5px; visibility: ${vis};"><img src="assets/MUN_Logo_Pantone_Border_Small.jpg" alt="MUN LOGO"></div>
	</div>
	<div class="card-body card-body-gnl">
    <h5 class="card-title"><span class="fas fa-globalnl fa-industry"></span>${
      cardIndustry
    }</h5>
    <h5 class="card-title"><span class="fas fa-globalnl fa-map-marker-alt"></span>${
      memberFields.currentAddress
    }</h5>
    <h5 class="card-title"><span class="fas fa-globalnl fa-anchor"></span>${
      memberFields.hometown
    }</h5>
    <button id="${memberFields.public_uid}" type="button" class="btn btn-light adminButton" onclick="adminRedirect();"> Edit Profile as Administrator </button>
  </div>
</div>
</div>`;
        console.log(
          "Loaded profile: " +
            firstName +
            "  - no LinkedIn profile - " +
            doc.id
        );
      }

      var memObj = $($.parseHTML(memberDomString));
      memObj.find(".card-body-gnl > .card-title:last").after($(headerSendAMessage));
      $("#members-list").append(memObj);
    });    
    showAdminButton();

    if (querySnapshot.docs.length === 15) scrollQueryComplete = true;
  } else {
    last_read_doc = 0;
  }
  $("#preloader").hide();
}

/* Searching
	Need to clean this up...
*/

function memberSearch() {
  if (searchButtonStates["name"] && last_read_doc) {
    if (formStatic["name"] == null) {
      alert("Please enter a name to search");
    } else if (formStatic["name"]["first"] && formStatic["name"]["last"]) {
      console.log("First name and last name entered");
      fbi
        .startAfter(last_read_doc)
        .where("last_name", "==", formStatic["name"]["last"])
        .where("first_name", "==", formStatic["name"]["first"])
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["name"]["last"]) {
      console.log("Last name only entered");
      fbi
        .startAfter(last_read_doc)
        .where("last_name", "==", formStatic["name"]["last"])
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["name"]["first"]) {
      console.log("First name only entered");
      fbi
        .orderBy("last_name")
        .startAfter(last_read_doc)
        .where("first_name", "==", formStatic["name"]["first"])
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else {
      console.log("Error");
    }
  } else if (searchButtonStates["name"]) {
    if (formStatic["name"] == null) {
      alert("Please enter a name to search");
    } else if (formStatic["name"]["first"] && formStatic["name"]["last"]) {
      console.log("First name and last name entered");
      fbi
        .where("last_name", "==", formStatic["name"]["last"])
        .where("first_name", "==", formStatic["name"]["first"])
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["name"]["last"]) {
      console.log("Last name only entered");
      fbi
        .where("last_name", "==", formStatic["name"]["last"])
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["name"]["first"]) {
      console.log("First name only entered");
      fbi
        .orderBy("last_name")
        .where("first_name", "==", formStatic["name"]["first"])
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else {
      console.log("Error");
    }
  } else if (searchButtonStates["company"] && last_read_doc) {
    if (formStatic["company"] == null) {
      alert("Please enter a company");
    }
    else if (formStatic["company"]) {
      console.log("Company entered");
      fbi
        .orderBy("company_lower")
        .startAfter(last_read_doc)
        .endAt(formStatic["company"] + "z")
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    }
    }
    else if (searchButtonStates["company"]) {
      if (formStatic["company"] == null) {
        alert("Please enter a company");
      }
      else if (formStatic["company"]) {
        console.log("Company entered");
        fbi
          .orderBy("company_lower")
          .startAt(formStatic["company"])
          .endAt(formStatic["company"] + "z")
          .limit(members_per_page)
          .get()
          .then(function(querySnapshot) {
            loadMembers(querySnapshot);
          });
      }
    }  else if (searchButtonStates["location"] && last_read_doc) {
    if (formStatic["location"] == null) {
      alert("Please enter a Current Location");
    } else if (formStatic["location"]["city"]) {
      console.log("Town entered");
      fbi
        .orderBy("random")
        .startAfter(last_read_doc)
        .where("current_address.locality", "==", formStatic["location"]["city"])
        .where(
          "current_address.administrative_area_level_1",
          "==",
          formStatic["location"]["prov"]
        )
        .where(
          "current_address.country",
          "==",
          formStatic["location"]["country"]
        )
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["location"]["prov"]) {
      console.log("Province/State entered");
      fbi
        .orderBy("random")
        .startAfter(last_read_doc)
        .where(
          "current_address.administrative_area_level_1",
          "==",
          formStatic["location"]["prov"]
        )
        .where(
          "current_address.country",
          "==",
          formStatic["location"]["country"]
        )
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["location"]["country"]) {
      console.log("Country entered");
      fbi
        .orderBy("random")
        .startAfter(last_read_doc)
        .where(
          "current_address.country",
          "==",
          formStatic["location"]["country"]
        )
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else {
      console.log("Error");
    }
  } else if (searchButtonStates["location"]) {
    if (formStatic["location"] == null) {
      alert("Please enter a Current Location 2");
    } else if (formStatic["location"]["city"]) {
      console.log("Town entered");
      fbi
        .orderBy("random")
        .where("current_address.locality", "==", formStatic["location"]["city"])
        .where(
          "current_address.administrative_area_level_1",
          "==",
          formStatic["location"]["prov"]
        )
        .where(
          "current_address.country",
          "==",
          formStatic["location"]["country"]
        )
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["location"]["prov"]) {
      console.log("Province/State entered");
      fbi
        .orderBy("random")
        .where(
          "current_address.administrative_area_level_1",
          "==",
          formStatic["location"]["prov"]
        )
        .where(
          "current_address.country",
          "==",
          formStatic["location"]["country"]
        )
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["location"]["country"]) {
      console.log("Country entered");
      fbi
        .orderBy("random")
        .where(
          "current_address.country",
          "==",
          formStatic["location"]["country"]
        )
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else {
      console.log("Error");
    }
  } else if (searchButtonStates["industry"] && last_read_doc) {
    if (formStatic["industry"] == null) {
      alert("Please enter an industry to search");
    } else {
      console.log("Industry entered");
      fbi
        .orderBy("random")
        .startAfter(last_read_doc)
        .where("industry", "array-contains", formStatic["industry"])
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    }
  } else if (searchButtonStates["industry"]) {
    if (formStatic["industry"] == null) {
      alert("Please enter an industry to search");
    } else {
      console.log("Industry entered");
      fbi
        .orderBy("random")
        .where("industry", "array-contains", formStatic["industry"])
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    }
  } else if (searchButtonStates["hometown"] && last_read_doc) {
    if (formDynamic["hometown_address"] == null) {
      alert("Please enter a location");
    } else if (formStatic["hometown"]["city"]) {
      console.log("Town entered");
      fbi
        .orderBy("random")
        .startAfter(last_read_doc)
        .where(
          "hometown_address.locality",
          "==",
          formStatic["hometown"]["city"]
        )
        .where(
          "hometown_address.administrative_area_level_1",
          "==",
          formStatic["hometown"]["prov"]
        )
        .where(
          "hometown_address.country",
          "==",
          formStatic["hometown"]["country"]
        )
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["hometown"]["prov"]) {
      console.log("Province/State entered");
      fbi
        .orderBy("random")
        .startAfter(last_read_doc)
        .where(
          "hometown_address.administrative_area_level_1",
          "==",
          formStatic["hometown"]["prov"]
        )
        .where(
          "hometown_address.country",
          "==",
          formStatic["hometown"]["country"]
        )
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["hometown"]["country"]) {
      console.log("Country entered");
      fbi
        .orderBy("random")
        .startAfter(last_read_doc)
        .where(
          "hometown_address.country",
          "==",
          formStatic["hometown"]["country"]
        )
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else {
      console.log("Error");
    }
  } else if (searchButtonStates["hometown"]) {
    if (formStatic["hometown"] == null) {
      alert("Please enter a location");
    } else if (formStatic["hometown"]["city"]) {
      console.log("Town entered");
      fbi
        .orderBy("random")
        .where(
          "hometown_address.locality",
          "==",
          formStatic["hometown"]["city"]
        )
        .where(
          "hometown_address.administrative_area_level_1",
          "==",
          formStatic["hometown"]["prov"]
        )
        .where(
          "hometown_address.country",
          "==",
          formStatic["hometown"]["country"]
        )
        .startAfter(last_read_doc)
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["hometown"]["prov"]) {
      console.log("Province/State entered");
      fbi
        .orderBy("random")
        .where(
          "hometown_address.administrative_area_level_1",
          "==",
          formStatic["hometown"]["prov"]
        )
        .where(
          "hometown_address.country",
          "==",
          formStatic["hometown"]["country"]
        )
        .startAfter(last_read_doc)
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["hometown"]["country"]) {
      console.log("Country entered");
      fbi
        .orderBy("random")
        .where(
          "hometown_address.country",
          "==",
          formStatic["hometown"]["country"]
        )
        .startAfter(last_read_doc)
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else {
      console.log("Error");
    }
  } else if (last_read_doc){
    fbi
      .orderBy("random")
      .startAfter(last_read_doc)
      .limit(members_per_page)
      .get()
      .then(function(querySnapshot) {
        loadMembers(querySnapshot);
      });
  } else {
    fbi
      .orderBy("random")
      .limit(members_per_page)
      .get()
      .then(function(querySnapshot) {
        loadMembers(querySnapshot);
      });
  }
}

/* Build location string
    Concatonate the data in the location value from a member object
    into a formatted string
    @param locationObject (Object{}) - value from location field (Either past or current) from firebase
*/
function getLocationString(locationObject) {
  if (locationObject) {
    // Initalize empty array to work with
    var location = [];

    if (
      locationObject.administrative_area_level_1 ==
        "Newfoundland and Labrador" &&
      locationObject.locality
    ) {
      // Append all required data to array
      location.push(locationObject.locality);
    } else if (
      locationObject.administrative_area_level_1 == "Newfoundland and Labrador"
    ) {
      // Append all required data to array
      location.push("Newfoundland and Labrador");
    } else if (
      locationObject.country == "Canada" ||
      locationObject.country == "United States"
    ) {
      if (
        !locationObject.locality &&
        locationObject.administrative_area_level_1
      ) {
        location.push(locationObject.administrative_area_level_1);
      } else if (!locationObject.administrative_area_level_1) {
        location.push(locationObject.country);
      } else {
        location.push(
          locationObject.locality,
          locationObject.administrative_area_level_1
        );
      }
    } else if (!locationObject.locality) {
      if (!locationObject.administrative_area_level_1) {
        location.push(locationObject.country);
      } else {
        location.push(
          locationObject.administrative_area_level_1,
          locationObject.country
        );
      }
    } else {
      location.push(
        locationObject.locality,
        locationObject.administrative_area_level_1,
        locationObject.country
      );
    }
    // Filter array for unwanted data, then join with ', ' to create a comma separated string from data
    return location.filter(e => e !== "" && e !== undefined).join(", ");
  } else {
    return "";
  }
}

// Callback for google maps autocomplete for storing autocompleted location data into
// the new member objcet
function initAutocomplete() {
  gnl.location.bindAutocomplete(
    formDynamic,
    "autocomplete_current",
    "current_address",
    false
  );
  gnl.location.bindAutocomplete(
    formDynamic,
    "autocomplete_hometown",
    "hometown_address",
    false
  );
}

// determines whether to show the admin button based on the admin toggle status
function showAdminButton() {
  // checks toggle status in sessionStorage for reload situations
  //Keeps edit buttons shown if page is refreshed, search is made, etc.
  if ((sessionStorage.getItem("adminToggle")) == "true") {
    $("#adminToggleState").prop("checked", true); // sets the toggle to be on after refresh if it was on before
    $('.adminButton').show();
  }
  // checks toggle status when it is changed and adjusts buttons accordingly
  $("#adminToggleState").change(function() {
    if ($("#adminToggleState:checked").val() == "on") {
      sessionStorage.setItem("adminToggle", true);
      $('.adminButton').show();
    }
    else {
      sessionStorage.setItem("adminToggle", false);
      $('.adminButton').hide();
    }
  });
}

// redirect to edit profile page from the admin buttons
function adminRedirect() {
  sessionStorage.setItem("uid", event.target.id);
  window.open("/profile.html", "_blank");
}

// Shows toggle for admins to see edit profile buttons
function showAdminToggle() {
  firebase.firestore().collection("moderators").doc(firebase.auth().currentUser.uid).get().then(doc => {
    // Show the admin toggle if moderator=true for the user
    if (doc.data().moderator) {
      $("#adminEditToggle").show();
    }
  })
  .catch(error => {
    console.log("User is not an admin");
  });
}

// Reloads members with/without edit button when toggle is switched
$("#adminToggleState").click(function() {
  loadMembers(querySnapshot);
});

function dbMigration() {
  firebase.firestore().collection("members").get().then(function(querySnapshot) {
    querySnapshot.forEach(function(doc) {
      let industry = doc.data().industry;
      if (industry) {
        if (typeof industry == "string") {
          firebase.firestore().collection("members").doc(doc.id).update({
            industry: [industry]
          });
        }
      }
      else {
        firebase.firestore().collection("members").doc(doc.id).update({
          industry: []
        });
      }
    });
  });
}

function profileLinkFix() {
  firebase.firestore().collection("members").get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      let url = doc.data().linkedin_profile;
      if(/www.linkedin.com\/in\//.test(url)){
        if (!/http/.test(url)) {
          url = "https://" + url;
          firebase.firestore().collection("members").doc(doc.id).update({
            linkedin_profile: url
          });
          console.log(doc.id + " Link updated to " + url);
        }
      }
      else {
        console.log(doc.id + " has an invalid profile link: " + url);
      }
    });
  });
}

function loadActiveMembers() {
  console.log("Searching by most recently active...")
  $("#members-list").empty();
  $("#preloader").show();
  fbi.orderBy("date_signedin", "desc").get().then((querySnapshot) => {
    loadMembers(querySnapshot);
  });
}
