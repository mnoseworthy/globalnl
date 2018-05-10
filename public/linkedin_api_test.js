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
  // adds the dynamically loaded navbar to the top of the page
  genNavbar();
  // Initialize config handler, this does nothing more than parse the config object
  // in the config handler file and return the object required for this page to the callback,
  // where the callback is just our namespace below
  new configHandler( template_namespace, 'template' );
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



/********************************
* Main namespace and control flow
*********************************/

// This is where we implement the main logic for our page, and we pass this function to
// the configHandler constructor as it's callback - i.e. it's started once config is finished loading
var memberMap_namespace = function (config)
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
            console.log("Handle Moderators and members");
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

/* Utilises the elementHandler class to generate the top-fixed navbar on the page
*/
function genNavbar()
{
    // This callback is given to the elementHandler constructor, it must do something with
    // the resolved element string
    var injectNav = function ( resolvedDOM )
    {
        if ( ! resolvedDOM )
        {
            console.log("An error occured while loading the navbar");
        }else{
            //Use your loaded element !
            $("#navbar").append(resolvedDOM);
        }
    }

    // define path to the element file
    var path = "src/elements/navbar/navbar.html";

    // No arguments for navbar currently
    var args = [];
    // Call the constructor, this will handle all loading/parsing and then releave data when complete
    // after executing the callback with the requesting dom string
    new elementHandler(path, args, injectNav);
}