/********************
* Interface reference
********************/
// Will hold a refernece to the created firebase reference, giving access to
// the interface in our callback functions below.
var _firebase_interface;

/*****************************************************  
* Register event callbacks & implement element callbacks
******************************************************/
// Start execution when page is done loading
$(document).ready(function(){
  initApp();
});
// Code entry point, started when page is finished loading
function initApp()
{
  // Initialize config handler, this does nothing more than parse the config object
  // in the config handler file and return the object required for this page to the callback,
  // where the callback is just our namespace below
  new configHandler( profile_namespace, 'profile' );
  // Dont know why this is a thing, but leaving it here for now
  $("#user_controls_mobile").hide();
}
// profile load callback
function profile() {
  console.log("Nav profile.html");
  window.location.href = "profile.html";
}
// Logout callback
function logout() {
  firebase.auth().signOut().then(function() {
      console.log('Signed Out');
      window.location.href = "index.html";
  }, function(error) {
      console.error('Sign Out Error', error);
  });
}

/***************************************************  
* Preform any required global module initialization
****************************************************/
/* Initialize bootcards
*/
bootcards.init({
  offCanvasBackdrop : true,
  offCanvasHideOnMainClick : true,
  enableTabletPortraitMode : true,
  disableRubberBanding : true,
  disableBreakoutSelector : 'a.no-break-out'
});
/* Check for mobile vs desktawp ( Remove me soon plz )
*/
if (! window.matchMedia("(min-width:900px)").matches) {
  // Super classy css link insert ( I know its hard to read It just doesn't deserve a bunch of lines)
  // As this whole block of checking screen width should be removed eventually
  (function() { var po = document.createElement('link'); po.type = 'text/css'; po.href = 'https://cdnjs.cloudflare.com/ajax/libs/bootcards/1.1.2/css/bootcards-android.min.css'; var s = document.getElementsByTagName('link')[0]; s.parentNode.insertBefore(po, s); })();    
  // Not sure what this stuff does, but Daryl had it here before and I'm blindly trusting it's usefulless
  //$("#list").show();
  $("#contactCard").hide();
}else{
  // Super classy css link insert once again for mobile
  (function() { var po = document.createElement('link'); po.type = 'text/css'; po.href = 'https://cdnjs.cloudflare.com/ajax/libs/bootcards/1.1.2/css/bootcards-desktop.min.css'; var s = document.getElementsByTagName('link')[0]; s.parentNode.insertBefore(po, s); })();    
  // Not sure what this stuff does, but Daryl had it here before and I'm blindly trusting it's usefulless
  //$("#list").hide();
  $("#contactCard").show();
}


/********************************
* Main namespace and control flow
*********************************/
// This is where we implement the main logic for our page, and we pass this function to
// the configHandler constructor as it's callback - i.e. it's started once config is finished loading
var profile_namespace = function (config) 
{
  // This is passed to the firebase interface as it's callback, and won't be executed until
  // the interface has connected to the database and figured out the user type
  var firebaseLoaded = function( fbi ) {
      // Validate success
      if ( ! fbi ) 
      {
          console.log("An error has occured while initializing the firebase interface");
          return false;
      }

      // Store reference globally for access by callbacks
       _firebase_interface = fbi;

      // Switch based on user type, this is where we redirect different types
      // of users to other pages if they don't belong here or whatever
      switch ( fbi.userType ) 
      {
        case "Moderator":
        case "Member":
            // Grab user data object
            userObject = fbi.userObject;
            // Load user information at top of page for desktop
            var injectElement = function(domString) {
                document.getElementById('login_name').innerHTML = domString;
            }
            var args = { displayName:userObject.displayName, email:userObject.email };
            new elementHandler("src/elements/login_name.html", args, injectElement);
            // Load user information for mobile
            injectElement = function(domString) {
                $("#user_controls_mobile").show();
                document.getElementById('login_name_mobile').innerHTML = domString;
            }
            args = { displayName:userObject.displayName };
            new elementHandler("src/elements/login_name_mobile.html", args, injectElement);

            // get data from various places around firebase,
            // then fill in known fields
            fbi.getSnapshot("private/members/"+userObject.uid, function(userData){
              $("#first_name").val(userData["first_name"]);
              $("#last_name").val(userData["last_name"]);
              $("#email").val(userObject["email"]);
              $("#linkedin_profile").val(userData["linkedin_profile"]);
              $("#industry").val(userData["industry"]);
              $("#status").val(userData["status"]);
              $("#autocomplete_current").val( getLocationString( userData["current_address"] ) );
              $("#autocomplete_hometown").val( getLocationString( userData["hometown_address"] ) );
            });
            break;
        case "Unregistered Member":
            // Member never filled out registration form
            window.location.href = "registration.html";
            break;
        case "Anonymous":
            console.log("Can an anonymous viewer get here?");
            window.location.href = "signup.html";
            break;
        default:
            console.log("User type undefined? How did we get here ...");
            window.location.href = "signup.html";
            return false;
      }
  } // end firebase callback
  
  // Running the initializer returns the database interface object to the callback
  // or False if an error occured.
  // We pass the firebase interface the firebase section of our loaded config
  new firebase_interface(config.firebase.config, firebaseLoaded);
}; // end namespace


/*****************************************************
* Utility Functions, only referenced in this file
*****************************************************/
/* Build location string
    Concatonate the data in the location value from a member object
    into a formatted string
    @param locationObject (Object{}) - value from location field (Either past or current) from firebase
*/
function getLocationString(locationObject)
{
    // Initalize empty array to work with
    var location = [];
    // Append all required data to array
    location.push(locationObject.locality, locationObject.administrative_area_level_1, locationObject.country);
    // Filter array for unwanted data, then join with ', ' to create a comma separated string from data
    return location.filter(e => e !== "" && e !== undefined).join(", "); 
}


