var signup_namespace = function (config) 
{

    var done = function( fbi ) {
        // Validate success
        if ( ! fbi ) 
        {
            console.log("An error has occured while initializing the firebase interface");
            return false;
        }
        // Use interface
        console.log(fbi.userType);
        console.log(fbi.userObject);

        // Test elementHandler
        var injectElement = function ( domString ) {
            $("#injectHere").append(domString);
        }
        var args = {
            displayName:fbi.userObject.displayName,
            email:fbi.userObject.email
        }
        new elementHandler("src/elements/login_name.html", args , injectElement);
    }

    // Running the initializer returns the database interface object to the callback
    // or False if an error occured.
    new firebase_interface(config.firebase.config, done);


};

// Initialize config handler, this does nothing more than parse the config object
// in the config handler file and return the object required for this page to the callback,
// where the callback is just our namespace
var config = new configHandler( signup_namespace, 'index' );