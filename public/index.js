/******************************************************
 * Global variables
 ******************************************************/

const defaultUserBar = `<li class="nav-item"><a class="nav-link" href="#" onClick="gnl.auth.loginLinkedIn();gnl.navBar.toggle();return false;" ><span class="fas fa-globalnl fa-user"></span><span>Sign in</span></a></li>`;

const loggedinUserBar = `<li class="nav-item" id="linkedin_nav">
			<a class="nav-link" style="padding:8px 8px 0px 0px;" href="#">
				<span style="vertical-align:top; margin-top:5px;" class="fab fa-globalnl fa-linkedin-in"></span>
		  	  	<label class="switch">
				  <input id="linkedin_toggle" checked type="checkbox">
				  <span class="slider round"></span>
				</label>
			</a>
		  </li>
			<li class="nav-item" id="login_name_nav"><a class="nav-link" href="#"><span class="fas fa-globalnl fa-user"></span><span id="login_name"></span></a></li>
			<li class="nav-item"><a class="nav-link" href="profile.html"><span class="fas fa-globalnl fa-edit"></span><span id="">Edit profile</span></a></li>
			<li id="button_logout" class="nav-item"><a class="nav-link" href="#"><span class="fas fa-globalnl fa-sign-out-alt"></span><span id="">Logout</span></a></li>`;

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

gnl.auth.listenForStageChange(renderWithUser, renderWithoutUser);

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
      var memberFields = {
        public_uid: doc.id,
        firstName: doc.data().first_name,
        lastName: doc.data().last_name,
        currentAddress: getLocationString(doc.data().current_address),
        industry: doc.data().industry,
        hometown: getLocationString(doc.data().hometown_address),
        bio: doc.data().bio || "",
        linkedin_profile: doc.data().linkedin_profile
      };

      // Build element and inject
      var memberDomString;
      if (
        doc.data().linkedin_profile &&
        doc.data().linkedin_profile.length > 30 &&
        LinkedInEnable &&
        memberFields.bio
      ) {
        memberDomString = `<div class="col-auto p-1 card-col">
<div id="${memberFields.public_uid}" class="card card-gnl">
	<div class="card-header card-header-gnl"><span class="fas fa-gnl-head fa-portrait"></span>${
    memberFields.firstName
  } ${memberFields.lastName}</div>
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
	<h5 class="card-title card-title-bottom"><span class="fas fa-globalnl fa-info-circle"></span>${
    memberFields.bio
  }</h5>
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
            doc.data().first_name +
            "  -  " +
            doc.data().linkedin_profile +
            "  -  " +
            doc.id
        );
      } else if (
        doc.data().linkedin_profile &&
        doc.data().linkedin_profile.length > 30 &&
        LinkedInEnable
      ) {
        memberDomString = `<div class="col-auto p-1 card-col">
<div id="${memberFields.public_uid}" class="card card-gnl">
	<div class="card-header card-header-gnl"><span class="fas fa-gnl-head fa-portrait"></span>${
    memberFields.firstName
  } ${memberFields.lastName}</div>
	<div class="card-body card-body-gnl">
	<h5 class="card-title"><span class="fas fa-globalnl fa-map-marker-alt"></span>${
    memberFields.currentAddress
  }</h5>
	<h5 class="card-title"><span class="fas fa-globalnl fa-briefcase"></span>${
    memberFields.industry
  }</h5>
	<h5 class="card-title card-title-bottom"><span class="fas fa-globalnl fa-anchor"></span>${
    memberFields.hometown
  }</h5>
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
            doc.data().first_name +
            "  -  " +
            doc.data().linkedin_profile +
            "  -  " +
            doc.id
        );
      } else if (memberFields.bio) {
        memberDomString = `<div class="col-auto p-1 card-col">
<div id="{[0](public_uid)}" class="card card-gnl">
	<div class="card-header card-header-gnl"><span class="fas fa-gnl-head fa-portrait"></span>${
    memberFields.firstName
  } ${memberFields.lastName}</div>
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
	<h5 class="card-title card-title-bottom"><span class="fas fa-globalnl fa-info-circle"></span>${
    memberFields.bio
  }</h5>
  </div>
</div>
</div>`;
        console.log(
          "Loaded profile: " +
            doc.data().first_name +
            "  -  No LinkedIn  -  " +
            doc.id
        );
      } else {
        memberDomString = `<div class="col-auto p-1 card-col">
<div id="{[0](public_uid)}" class="card card-gnl">
	<div class="card-header card-header-gnl"><span class="fas fa-gnl-head fa-portrait"></span>${
    memberFields.firstName
  } ${memberFields.lastName}</div>
	<div class="card-body card-body-gnl">
	<h5 class="card-title"><span class="fas fa-globalnl fa-map-marker-alt"></span>${
    memberFields.currentAddress
  }</h5>
	<h5 class="card-title"><span class="fas fa-globalnl fa-briefcase"></span>${
    memberFields.industry
  }</h5>
	<h5 class="card-title card-title-bottom"><span class="fas fa-globalnl fa-anchor"></span>${
    memberFields.hometown
  }</h5>
  </div>
</div>
</div>`;
        console.log(
          "Loaded profile: " +
            doc.data().first_name +
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
  // Register our autocomplete elements, see URL for more information
  // https://developers.google.com/maps/documentation/javascript/examples/places-autocomplete-addressform
  autocomplete_current = new google.maps.places.Autocomplete(
    /** @type {!HTMLInputElement} */ (document.getElementById(
      "autocomplete_current"
    )),
    { types: ["geocode"] }
  );
  autocomplete_hometown = new google.maps.places.Autocomplete(
    /** @type {!HTMLInputElement} */ (document.getElementById(
      "autocomplete_hometown"
    )),
    { types: ["geocode"] }
  );

  // Look for these keys in the place object returned by google API
  // if found, their values are filled and written to our new member object
  var locationData = {
    street_number: true,
    route: true,
    locality: true,
    administrative_area_level_1: true,
    country: true,
    postal_code: true
  };

  // define event callbacks for each element, these fire when the fields
  // are auto filled by google api and then the location data is stored in our member object
  autocomplete_current.addListener("place_changed", function() {
    try {
      // Get place object from google api
      var place = autocomplete_current.getPlace();
      if (place) {
        // iterate over object and look for the keys in locationData
        formDynamic["current_address"] = {
          administrative_area_level_1: null,
          country: null,
          lat: null,
          lng: null,
          locality: null
        };
        for (var i = 0; i < place.address_components.length; i++) {
          var addressType = place.address_components[i].types[0];
          if (locationData.hasOwnProperty(addressType)) {
            formDynamic["current_address"][addressType] =
              place.address_components[i]["long_name"];
          }
        }
        // Store geometry into new member object as well
        formDynamic["current_address"]["lat"] = place.geometry.location.lat();
        formDynamic["current_address"]["lng"] = place.geometry.location.lng();
        //console.log(formDynamic);
      }
    } catch (err) {
      console.log(err);
    }
  });

  // Second autocomplete callback, the repeated code kills me but im currently lazy
  // TODO: tear out the repeated code into a function above
  autocomplete_hometown.addListener("place_changed", function() {
    try {
      // Get place object from google api
      var place = autocomplete_hometown.getPlace();
      if (place) {
        // iterate over object and look for the keys in locationData
        formDynamic["hometown_address"] = {
          administrative_area_level_1: null,
          country: null,
          lat: null,
          lng: null,
          locality: null
        };

        for (var i = 0; i < place.address_components.length; i++) {
          var addressType = place.address_components[i].types[0];
          if (locationData.hasOwnProperty(addressType)) {
            formDynamic["hometown_address"][addressType] =
              place.address_components[i]["long_name"];
          }
        }
        // Store geometry into new member object as well
        formDynamic["hometown_address"]["lat"] = place.geometry.location.lat();
        formDynamic["hometown_address"]["lng"] = place.geometry.location.lng();
        //console.log(formDynamic);
      }
    } catch (err) {
      console.log(err);
    }
  });
}
