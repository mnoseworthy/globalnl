var index_namespace = function (config) 
{
    var firebaseLoaded = function (fbi) 
    {
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
    }

    // Running the initializer returns the database interface object to the callback
    // or False if an error occured.
    new firebase_interface(config.firebase.config, firebaseLoaded);
};

// Initialize config handler, this does nothing more than parse the config object
// in the config handler file and return the object required for this page to the callback,
// where the callback is just our namespace
new configHandler( index_namespace, 'index' );