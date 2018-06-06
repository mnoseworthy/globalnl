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
  new configHandler( signup_namespace, 'signup' );
}



/***************************************************  
* Preform any required global module initialization
****************************************************/



/********************************
* Main namespace and control flow
*********************************/

// This is where we implement the main logic for our page, and we pass this function to
// the configHandler constructor as it's callback - i.e. it's started once config is finished loading
var signup_namespace = function (config)
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

              // FirebaseUI config.
              var uiConfig = {
                signInSuccessUrl: config.firebase.signInSuccessUrl,
                signInOptions: [
                    // Leave the lines as is for the providers you want to offer your users.
                    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                    //firebase.auth.FacebookAuthProvider.PROVIDER_ID,
                    firebase.auth.EmailAuthProvider.PROVIDER_ID
                ],
                // Terms of service url.
                tosUrl: config.firebase.tosUrl
            };
    
            // Initialize the FirebaseUI Widget using Firebase.
            var ui = new firebaseui.auth.AuthUI(firebase.auth());
            // The start method will wait until the DOM is loaded.
            ui.start('#firebaseui-auth-container', uiConfig);
  } // end firebase callback
  
  // Running the initializer returns the database interface object to the callback
  // or False if an error occured.
  // We pass the firebase interface the firebase section of our loaded config
  new firebase_interface(config.firebase.config, firebaseLoaded);
}; // end namespace


/*****************************************************
* Utility Functions, only referenced in this file
*****************************************************/
