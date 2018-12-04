/******************************************************
 * Global variables
 ******************************************************/

// Disable LinkedIn banners via toggle button
var LinkedInEnable = true;

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

// Firebase
const settings = { timestampsInSnapshots: true };
firebase.firestore().settings(settings);
var fbi = firebase.firestore().collection("members");
//var uid = firebase.auth().currentUser.uid;

function renderWithUser(user) {
  $("#members-list").empty();
  $("#mainPage").show();
  initLoad();
  $("#linkedin_toggle").change(function() {
    if ($("#linkedin_toggle:checked").val() == "on") {
      LinkedInEnable = true;
    } else {
      LinkedInEnable = false;
    }
  });
}

function renderWithoutUser() {
  $("#members-list").empty();
  $("#mainPage").hide();
}

gnl.auth.listenForStageChange(renderWithUser, renderWithoutUser, true);

function createSendAMessageForm(id, firstName, lastName) {
  var sendAMessageContainer = document.getElementById("modalSendAMessageBody"),
    sendAMessageForm = document.createElement("form"),
    nameRow = document.createElement("div"),
    nameInputGroup = document.createElement("div"),
    nameLabel = document.createElement("label"),
    nameInput = document.createElement("input"),
    messageRow = document.createElement("div"),
    messageInputGroup = document.createElement("div"),
    messageLabel = document.createElement("label"),
    messageInput = document.createElement("textarea");

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
  nameInput.value = `${firstName} ${lastName}`;
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
}

/*****************************************************
 * Register event callbacks & implement element callbacks
 ******************************************************/
// Init auth on load web page event
$(document).ready(function() {
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
      searchButtonStates["location"] = false;
      searchButtonStates["industry"] = false;
      searchButtonStates["hometown"] = false;
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
        if (!doc.data().date_updated || doc.data().date_updated == "-1") {
          window.location.href = "profile.html";
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
    .orderBy("last_name")
    .where("copied_account", "==", false)
    .startAt("A")
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

/* load members */
function loadMembers(querySnapshot) {
  if (querySnapshot.docs.length > 0) {
    last_read_doc = querySnapshot.docs[querySnapshot.docs.length - 1];
    querySnapshot.forEach(function(doc) {
      // doc.data() is never undefined for query doc snapshots

      // copied_account set if old account migrated over - need to manually delete these
      //if(!doc.data().copied_account){
      // Build argument's for memberElement
      var data = doc.data(),
        firstName = data.first_name,
        lastName = data.last_name;

      var memberFields = {
        public_uid: doc.id,
        firstName: firstName,
        lastName: lastName,
        currentAddress: getLocationString(data.current_address),
        industry: data.industry,
        hometown: getLocationString(data.hometown_address),
        bio: data.bio || "",
        linkedin_profile: data.linkedin_profile
      };

      // Build element and inject
      var linkToContactMemberForm = `
          <h5 class="card-title card-title-bottom"><span class="fas fa-globalnl fa-envelope"></span><a data-toggle="modal" data-target="#modalSendAMessage" href="#" onclick="createSendAMessageForm('${
              doc.id
            }', '${
              firstName
            }', '${
              lastName
            }')">Send a message</a>
          </h5>
        `;

      var memberDomString;
      if (
        data.linkedin_profile &&
        data.linkedin_profile.length > 30 &&
        LinkedInEnable &&
        memberFields.bio
      ) {
        memberDomString = `<div class="col-auto p-1 card-col">
<div id="${memberFields.public_uid}" class="card card-gnl">
	<div class="card-header card-header-gnl"><span class="fas fa-gnl-head fa-portrait"></span>${firstName} ${lastName}</div>
	<div class="card-body card-body-gnl">
	<h5 class="card-title"><span class="fas fa-globalnl fa-map-marker-alt"></span>${
    memberFields.currentAddress
  }</h5>
	<h5 class="card-title"><span class="fas fa-globalnl fa-briefcase"></span>${
    memberFields.industry
  }</h5>
	<h5 class="card-title"><span class="fas fa-globalnl fa-anchor"></span>${
    memberFields.hometown
  }</h5>
	<h5 class="card-title"><span class="fas fa-globalnl fa-info-circle"></span>${
    memberFields.bio
  }</h5>
  ${linkToContactMemberForm}
	<div class="linkedin_profile_card">
	<script type="IN/MemberProfile" data-id="${
    memberFields.linkedin_profile
  }" data-format="inline" data-related="false"></script>
	</div>
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
      } else if (
        data.linkedin_profile &&
        data.linkedin_profile.length > 30 &&
        LinkedInEnable
      ) {
        memberDomString = `<div class="col-auto p-1 card-col">
<div id="${memberFields.public_uid}" class="card card-gnl">
	<div class="card-header card-header-gnl"><span class="fas fa-gnl-head fa-portrait"></span>${firstName} ${lastName}</div>
	<div class="card-body card-body-gnl">
	<h5 class="card-title"><span class="fas fa-globalnl fa-map-marker-alt"></span>${
    memberFields.currentAddress
  }</h5>
	<h5 class="card-title"><span class="fas fa-globalnl fa-briefcase"></span>${
    memberFields.industry
  }</h5>
	<h5 class="card-title"><span class="fas fa-globalnl fa-anchor"></span>${
    memberFields.hometown
  }</h5>
  ${linkToContactMemberForm}
	<div class="linkedin_profile_card">
	<script type="IN/MemberProfile" data-id="${
    memberFields.linkedin_profile
  }" data-format="inline" data-related="false"></script>
	</div>
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
      } else if (memberFields.bio) {
        memberDomString = `<div class="col-auto p-1 card-col">
<div id="{[0](public_uid)}" class="card card-gnl">
	<div class="card-header card-header-gnl"><span class="fas fa-gnl-head fa-portrait"></span>${firstName} ${lastName}</div>
	<div class="card-body card-body-gnl">
	<h5 class="card-title"><span class="fas fa-globalnl fa-map-marker-alt"></span>${
    memberFields.currentAddress
  }</h5>
	<h5 class="card-title"><span class="fas fa-globalnl fa-briefcase"></span>${
    memberFields.industry
  }</h5>
	<h5 class="card-title"><span class="fas fa-globalnl fa-anchor"></span>${
    memberFields.hometown
  }</h5>
	<h5 class="card-title"><span class="fas fa-globalnl fa-info-circle"></span>${
    memberFields.bio
  }</h5>
  ${linkToContactMemberForm}
  </div>
</div>
</div>`;
        console.log(
          "Loaded profile: " +
            firstName +
            "  -  No LinkedIn  -  " +
            doc.id
        );
      } else {
        memberDomString = `<div class="col-auto p-1 card-col">
<div id="{[0](public_uid)}" class="card card-gnl">
	<div class="card-header card-header-gnl"><span class="fas fa-gnl-head fa-portrait"></span>${firstName} ${lastName}</div>
	<div class="card-body card-body-gnl">
	<h5 class="card-title"><span class="fas fa-globalnl fa-map-marker-alt"></span>${
    memberFields.currentAddress
  }</h5>
	<h5 class="card-title"><span class="fas fa-globalnl fa-briefcase"></span>${
    memberFields.industry
  }</h5>
	<h5 class="card-title"><span class="fas fa-globalnl fa-anchor"></span>${
    memberFields.hometown
  }</h5>
  ${linkToContactMemberForm}
  </div>
</div>
</div>`;
        console.log(
          "Loaded profile: " +
            firstName +
            "  -  No LinkedIn  -  " +
            doc.id
        );
      }
      var memObj = $.parseHTML(memberDomString);
      $("#members-list").append(memObj);
      //}
      //else{
      //	console.log("Duplicate profile: " + doc.data().first_name + "  -  " + doc.id);
      //}
    });

    if (LinkedInEnable) {
      IN.parse();
      console.log("Parse LinkedIn badges...");
    }
    if (querySnapshot.docs.length === 15) scrollQueryComplete = true;
  } else {
    last_read_doc = 0;
  }
  $("#preloader").hide();
} // end loadMembers

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
        .where("copied_account", "==", false)
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
        .where("copied_account", "==", false)
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
        .where("copied_account", "==", false)
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
        .where("copied_account", "==", false)
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
        .where("copied_account", "==", false)
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
        .where("copied_account", "==", false)
        .where("first_name", "==", formStatic["name"]["first"])
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else {
      console.log("Error");
    }
  } else if (searchButtonStates["location"] && last_read_doc) {
    if (formStatic["location"] == null) {
      alert("Please enter a Current Location");
    } else if (formStatic["location"]["city"]) {
      console.log("Town entered");
      fbi
        .orderBy("last_name")
        .startAfter(last_read_doc)
        .where("copied_account", "==", false)
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
        .orderBy("last_name")
        .startAfter(last_read_doc)
        .where("copied_account", "==", false)
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
        .orderBy("last_name")
        .startAfter(last_read_doc)
        .where("copied_account", "==", false)
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
        .orderBy("last_name")
        .where("copied_account", "==", false)
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
        .startAfter(last_read_doc)
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["location"]["prov"]) {
      console.log("Province/State entered");
      fbi
        .orderBy("last_name")
        .where("copied_account", "==", false)
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
        .startAfter(last_read_doc)
        .limit(members_per_page)
        .get()
        .then(function(querySnapshot) {
          loadMembers(querySnapshot);
        });
    } else if (formStatic["location"]["country"]) {
      console.log("Country entered");
      fbi
        .orderBy("last_name")
        .where("copied_account", "==", false)
        .where(
          "current_address.country",
          "==",
          formStatic["location"]["country"]
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
  } else if (searchButtonStates["industry"] && last_read_doc) {
    if (formStatic["industry"] == null) {
      alert("Please enter an industry to search");
    } else {
      console.log("Industry entered");
      fbi
        .orderBy("last_name")
        .startAfter(last_read_doc)
        .where("copied_account", "==", false)
        .where("industry", "==", formStatic["industry"])
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
        .orderBy("last_name")
        .where("copied_account", "==", false)
        .where("industry", "==", formStatic["industry"])
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
        .orderBy("last_name")
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
        .orderBy("last_name")
        .startAfter(last_read_doc)
        .where("copied_account", "==", false)
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
        .orderBy("last_name")
        .startAfter(last_read_doc)
        .where("copied_account", "==", false)
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
        .orderBy("last_name")
        .where("copied_account", "==", false)
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
        .orderBy("last_name")
        .where("copied_account", "==", false)
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
        .orderBy("last_name")
        .where("copied_account", "==", false)
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
  } else {
    fbi
      .orderBy("last_name")
      .where("copied_account", "==", false)
      .startAfter(last_read_doc)
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
    "current_address"
  );
  gnl.location.bindAutocomplete(
    formDynamic,
    "autocomplete_hometown",
    "hometown_address"
  );
}
