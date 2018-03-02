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
        this.finishedLoading = false  // flag to ensure callback isn't executed twice & to signal when loading is finished (even if failed)
        // Moderator, Member, Unregistered Member, Anonymous
        this.userType   = "";  // User type determined from userObject
        this.rootRef    = null;  // root directory of the database
        // Store params
        this.callback       = callback;
        this.firebaseConfig = firebaseConfig;
        // Data cache accessable through methods
        this.cache = {};

        // Ensure that firebase has been previously loaded
        if ( ! $('script[src$="/firebase.js"') ) {
            // checks for all script tags ending in /firebase.js
            // i.e. if true, no script has attempted to load firebase
            if( ! this.finishedLoading ) {
                this.finishedLoading = true;
                this.callback(false);
                return false
            }
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
                if ( ! _this.finishedLoading ) {
                    _this.finishedLoading = true;
                    _this.callback(this);
                    return true            
                }
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
                    if ( !_this.finishedLoading ) {
                        _this.finishedLoading = true;
                        _this.callback(_this);        
                    }      
                });
                if ( ! resolved ) {
                    this.rootRef.child("private/members/"+this.userObject.uid).once('value', function(snapshot) {
                        _this.userType = "Member";
                        if ( ! _this.finishedLoading ) {
                            _this.finishedLoading = true;
                            _this.callback(_this);
                        }
                        resolved = true;
                    }).then( function(){
                        if ( ! resolved ) {
                            resolved = true;
                            _this.userType = "Unregistered Member";
                            if( ! _this.finishedLoading ){
                                _this.finishedLoading = true;
                                _this.callback(_this);
                            }
                        }
                    });

                }

            }catch(e){} // i.e. pass
        }
    } //  end parse user type

    /* writeCache
        A simple function to store data in a object accessable to this class, first
        step to writing cookies down the road.

        @param key (string) - key to store data at in cache
        @param data (any) - value to store in the cache
    */
    writeCache(key, data)
    {
        this.cache[key] = data;
    }
    /* readCache
        A simple function for retreving data stored in the cache object
        @param key
    */
    readCache(key)
    {
        return this.cache[key];
    }

    /* getSnapshot
        Simple read function that returns a snapshot from the given path, no 
        need to pass rootRef. 

        @param path (string) - path to the data you want a snapshot of in firebase
        @param callback (function pointer) - function to pass result to
    */
    getSnapshot(path, callback)
    {
        this.rootRef.child(path).once('value', function(snapshot){
            callback(snapshot.val());
        });
    }
} // end class definition