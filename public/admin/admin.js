// Initialize Firebase
var config = {
  apiKey: "AIzaSyBDf7OWORlKoMM6Y9ly5ftxAw6QYjY_ulw",
  authDomain: "globalnl-database.firebaseapp.com",
  databaseURL: "https://globalnl-database.firebaseio.com",
  projectId: "globalnl-database",
  storageBucket: "globalnl-database.appspot.com",
  messagingSenderId: "331545031788"
};
firebase.initializeApp(config);


// Global Variables
var rootRef = firebase.database().ref();
var db_obj;
var public_obj;
var private_obj;
var moderators_obj;

var members_private_table_data = [];
var members_shared_table_data = [];
var members_public_table_data = [];
var companies_table_data = [];
var jobs_table_data = [];
var mod_table_data = [];

var map;
var gmap_obj;
var gmap_default_lat = 0;
var gmap_default_lng = 0;
var gmap_default_zoom = 1;

var members_private_table_headers = ["Name", "Email", "Approved", "Privacy", "Current Address",
  "Hometown Address", "LinkedIn Profile", "Industry", "Status", "Private UID", "Public UID", "Comments"];

var members_public_table_headers = ["Name", "LinkedIn Profile", "Current Address",
  "Hometown Address", "Industry", "Status", "Public UID"];

// Member JSON Object Template
var member_template = {
  first_name:"",
  last_name:"",
  email:"",
  ambassador:"",
  linkedin_profile:"",
  industry:"",
  comments:"",
  current_address: {
    lat:0,
    lng:0
  },
  hometown_address: {
    lat:0,
    lng:0
  },
  status:"",
  school:"",
  program:"",
  grad_year:"",
  interests : {
    connect:false,
    organize:false,
    learn:false,
    mentor:false,
    support:false
  },
  privacy:"",
  approved:"",
  date_created:"",
  public_uid:""
};

// -------------------------------------------------------------------------- //

// Load database values
function parseDatabase() {

  Object.keys(private_obj["members"]).forEach(function(key) {
    if (key != "dummy") {
      var mem = private_obj["members"][key];
      var name = mem["first_name"] + " " + mem["last_name"];
      var curr_loc = getLocationString(mem["current_address"]);
      var hometown = getLocationString(mem["hometown_address"]);
      var public_uid = "null";
      var linkedin_profile = "null";
      var comments = "null";
      if("linkedin_profile" in mem) {
        linkedin_profile = mem["linkedin_profile"];
      }
      if("comments" in mem) {
        comments = mem["comments"];
      }
      if("public_uid" in mem) {
        public_uid = mem["public_uid"];
      }
      members_private_table_data.push([name, mem["email"], mem["approved"], mem["privacy"], curr_loc, hometown, linkedin_profile,
        mem["industry"], mem["status"], key, public_uid, comments]);
    }
  });

  Object.keys(shared_obj["members"]).forEach(function(key) {
    if (key != "dummy") {
      var mem = shared_obj["members"][key];
      var name = mem["first_name"] + " " + mem["last_name"];
      var curr_loc = getLocationString(mem["current_address"]);
      var hometown = getLocationString(mem["hometown_address"]);
      members_shared_table_data.push([name, mem["linkedin_profile"], curr_loc, hometown,
        mem["industry"], mem["status"], key]);
    }
  });

  Object.keys(public_obj["members"]).forEach(function(key) {
    if (key != "dummy") {
      var mem = public_obj["members"][key];
      var name = mem["first_name"] + " " + mem["last_name"];
      var curr_loc = getLocationString(mem["current_address"]);
      var hometown = getLocationString(mem["hometown_address"]);
      members_public_table_data.push([name, mem["linkedin_profile"], curr_loc, hometown,
        mem["industry"], mem["status"], key]);
    }
  });

  Object.keys(moderators_obj).forEach(function(key) {
    if (key != "dummy") {
      var mem = private_obj["members"][key];
      var name = mem["first_name"] + " " + mem["last_name"];
      mod_table_data.push([name, mem["email"], key]);
    }
  });

  // Set gmap variables
  gmap_default_lat = public_obj["gmap"].default_lat;
  gmap_default_lng = public_obj["gmap"].default_lng;
  gmap_default_zoom = public_obj["gmap"].default_zoom;

}


// Firebase Auth
function initApp() {

  firebase.auth().onAuthStateChanged(function(user) {

    if (user) {
      // User is signed in.
      var displayName = user.displayName;
      var email = user.email;
      var emailVerified = user.emailVerified;
      var photoURL = user.photoURL;
      var uid = user.uid;
      var phoneNumber = user.phoneNumber;
      var providerData = user.providerData;
      user.getIdToken().then(function(accessToken) {
        var account_details = JSON.stringify({
          displayName: displayName,
          email: email,
          emailVerified: emailVerified,
          phoneNumber: phoneNumber,
          photoURL: photoURL,
          uid: uid,
          accessToken: accessToken,
          providerData: providerData
        }, null, '  ');

        // Load database, error if not a moderator
        rootRef.child("moderators").once('value', function(snapshot) {
            // Is a moderator
            moderators_obj = snapshot.val();
            rootRef.child("private").once('value', function(snapshot) {
                private_obj = snapshot.val();
                rootRef.child("public").once('value', function(snapshot) {
                    public_obj = snapshot.val();
                    rootRef.child("shared").once('value', function(snapshot) {
                        shared_obj = snapshot.val();
                        parseDatabase();
                        loadDatabase();
                      }, function(error) {
                        alert(error);
                        window.location.href = "login.html";
                    });
                  }, function(error) {
                    alert(error);
                    window.location.href = "login.html";
                });
              }, function(error) {
                alert(error);
                window.location.href = "login.html";
            });
          }, function(error) {
            alert("ERROR: Account does not cotain moderator status.");
            window.location.href = "login.html";
        });

        try {
          document.getElementById('login_name').innerHTML = '<a href="#" data-toggle="popover" ' +
            'data-placement="bottom" data-trigger="focus" data-html="true" data-content="<b>Email:</b><br></br>' +
            email + '<br></br><b>Private UID:</b><br></br>' + uid +
            '"><span class="glyphicon glyphicon-user"></span>   ' + displayName + '</a>';
          $('[data-toggle="popover"]').popover();
        } catch (e) {
          console.log(e);
        }

      });

    } else {
      // User is signed out.
      window.location.href = "login.html";
    }
  }, function(error) {
    console.log(error);
  });
}

// Init auth on load web page
window.addEventListener('load', function() {
  initApp()
});

// Logout of current account
function logout() {
  firebase.auth().signOut().then(function() {
    console.log('Signed Out');
    window.location.href = "login.html";
  }, function(error) {
    console.error('Sign Out Error', error);
  });
}

// -------------------------------------------------------------------------- //

// Get Location String
function getLocationString(obj) {
  var loc = "";
  if("locality" in obj && obj["locality"] != "") {
    loc = obj["locality"];
  }
  if ("administrative_area_level_1" in obj && obj["administrative_area_level_1"] != "") {
    if (loc != "") {
      loc = loc + ", " + obj["administrative_area_level_1"];
    } else {
      loc = obj["administrative_area_level_1"];
    }
  }
  if ("country" in obj && obj["country"] != "") {
    if (loc != "") {
      loc = loc + ", " + obj["country"];
    } else {
      loc = obj["country"];
    }
  }
  return loc;
}

// Download database as JSON file
function exportDatabase() {

  dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db_obj));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "GlobalNL_Database_" + Date.now() + ".json");
  downloadAnchorNode.click();
  downloadAnchorNode.remove();

}

// Moderator Database Functions

function moveFbRecord(oldRef, newRef) {
     oldRef.once('value', function(snap)  {
          newRef.set( snap.val(), function(error) {
               if( !error ) {  oldRef.remove(); }
               else if( typeof(console) !== 'undefined' && console.error ) {  console.error(error); }
          });
     });
}

function copyFbRecord(oldRef, newRef) {
     oldRef.once('value', function(snap)  {
          newRef.set( snap.val(), function(error) {
               if( error && typeof(console) !== 'undefined' && console.error ) {  console.error(error); }
          });
     });
}
