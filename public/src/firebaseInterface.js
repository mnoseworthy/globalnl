/*
    Firebase Interface

    This will eventually be extended to provde more functionliaty, but right now just initializes
    the firebase module and attempts to authenticated via the current user. The type of user is 
    resolved based on their database access priv's.
*/
class firebase_interface 
{
    /* Initialize

        @param firebaseConfig (Object) - object containing required configuration for firebase
        @param callback (function pointer) - callback to execute once initilaizing and authenticating with the datbase has finished
    */
    constructor( firebaseConfig, callback)
    {
        // Define class properties
        this.userObject = {};  // Object returned when authenticating with database
        // Moderator, Member, Anonymous
        this.userType   = "";  // User type determined from userObject
        this.rootRef    = null;  // root directory of the database
        // Store params
        this.callback       = callback;
        this.firebaseConfig = firebaseConfig;

        // Ensure that firebase has been previously loaded
        if ( ! $('script[src$="/firebase.js"') ) {
            // checks for all script tags ending in /firebase.js
            // i.e. if true, no script has attempted to load firebase
            this.callback(false);
            return false
        }
        // Initialize application by passing config to firebase
        // https://firebase.google.com/docs/reference/js/firebase#.initializeApp
        this.defaultApp = firebase.initializeApp(firebaseConfig);
        // Store database reference
        this.database = firebase.database();
        // Define root directory of firebase
        this.rootRef = this.database.ref();
        // Authenticate with current user's credentials, which will execute the callback
        // with the users type to end initialization
        this.authenticateUser();
    }// end constructor

    /* authenticateUser
    */
    authenticateUser()
    {
        // Hold object refernece so nested functions can access it
        var _this = this;
        // Trigger authentication and capture the return
        firebase.auth().onAuthStateChanged( function( user ) {
            if ( user ) {
                _this.userObject = user;
                _this.parseUserType();
            } else {
                _this.userType = "Anonymous";
                _this.callback(this);
            }
        }); // end onAuthStateChanged callback
    } // end authenticateUser

    /* parseUserType
    */
    parseUserType()
    {
        // flags & object reference
        var resolved = false;
        var _this = this;
        // Determine weather or not the user is Moderator or not
        // & confirm that they're a registered user
        if( this.userType !== "Anonymous" )
        {
            // Without using cloud functions, the only way to check the user's
            // type is by making query attempts and checking weather or not they
            // fail...
            try{
                this.rootRef.child("moderators").once('value', function(snapshot) {
                    resolved = true;
                    _this.userType = "Moderator";
                    _this.callback(_this);              
                });
                if ( ! resolved ) {
                    this.rootRef.child("private/members/"+this.userObject.uid).once('value', function(snapshot) {
                        _this.userType = "Member";
                        _this.callback(_this);
                        resolved = true;
                    });
                }
            }catch(e){} // i.e. pass
        }
    }
} // end class definition