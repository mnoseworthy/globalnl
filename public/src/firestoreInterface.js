/*
    Firebase Interface

    This will eventually be extended to provde more functionliaty, but right now just initializes
    the firebase module and attempts to authenticated via the current user. The type of user is 
    resolved based on their database access priv's.
*/
class firebase_interface 
{
    /* Initialize

        @param firestoreConfig (Object) - object containing required configuration for firestore
        @param callback (function pointer) - callback to execute once initilaizing and authenticating with the datbase has finished
    */
    constructor( firebaseConfig, callback)
    {
        // Define class properties
        this.userObject = {};  // Object returned when authenticating with database
        this.finishedLoading = false  // flag to ensure callback isn't executed twice & to signal when loading is finished (even if failed)
        // Moderator, Member, Unregistered Member, Anonymous
        this.userType   = "";  // User type determined from userObject

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
        if ( firebase.app.apps === undefined ){
            this.defaultApp = firebase.initializeApp(firebaseConfig);
        } 
        // Store database reference
        this.database = firebase.firestore();

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
    *
    *   Determines the user's authentication level by querying the database for various
    * pieces of data.
    */
    parseUserType()
    {
        console.log(this.userObject.uid);
        // flags & object reference
        var resolved = false;
        var _this = this;
        // Determine weather or not the user is Moderator or not
        // & confirm that they're a registered user
        if( this.userType !== "Anonymous" )
        {
            // Write reference to user's private data object
            var privateRef = this.database.collection("private_data").doc(_this.userObject.uid);
            // Attempt to query their private data
            privateRef.get().then(function(doc){
                // Does the user have a private data field?
                if (doc.exists) {
                    // We know that this user is at least a registered member
                    _this.userType = "Member";
                    // Finally, check if they're a moderator or not
                    var modRef = this.database.collection("moderators").where("UID", "==", _this.userObject.uid);
                    modRef.get().then(function(doc){
                        if(doc.exists){
                            _this.userType = "Moderator";
                        }
                    }).catch(function(error){
                        console.log(error);
                        console.log("Error reading from moderators list");
                    });
                    
                } else {
                    // User must not be registered yet, or was
                    // improperly added to the database
                    _this.userType = "Unregistered Member";
                }
            }).catch(function(error){
                console.log(error);
                console.log("Error grabbing this user's data.");
            }).finally(function(){
                _this.callback(_this);
            });
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

    /* write
        Simple write function

        @param path (string) - database path to write the object to
        @param object ({}) - json object to write to database
        @param callback (function pointer) - function to execute with status
    */
    write(path, object, callback)
    {
        this.rootRef.child(path).set(object, function(error){ callback(error);});
    }
} // end class definition


// Will likely remove this or put this somewhere else eventually, 
// but for now the table primitives will be placed here so we can
// hopefully abstract writes to the database instead of re-writting
// it in every page that requires a write operation. This would be
// the regististration page or the edit profile page thus far
class memberDocument
{
    // Constructor will be used start with a default object,
    // then trigger the required functions to fill in given fields
    constructor(memberData={})
    {
        // Define the default member object fields,
        // this is just a copy of the structure shown
        // on the online interface

        // Data in members collection
        this.publicData = {
            ambassador : false,
            current_address : {
                administrative_area_level_1 : null,  
                country: null,  
                lat: null,  
                lng: null,
                locality: null
            },
            date_created : -1,
            first_name : null,
            grad_year: null,  
            hometown_address : {
                administrative_area_level_1 : null,  
                country: null,  
                lat: null,  
                lng: null,
                locality: null
            },
            industry: null,
            last_name:null,
            linkedin_profile:null,
            program:null,
            school:null,
            status:null
        }
        // Data in private_data collection
        this.privateData = {
            approved : false,
            email : null,
            interests : {
                connect: false,
                learn: false,
                mentor: false,
                organize: false,
                support: false
            },
            shared: false
        }

        // Parse given data
        this.parseInput(memberData, this.cleanData);

    }

    /*  parseInput
    *       
    *   Reads fields given from input data and matches them against the
    *   data fields defined in the constructor.
    * */
   parseInput(memberData, callback) 
   {
        // get data length and check if there was any data at all
        var len = Object.entries(memberData).length;
        if(len <= 0)
        {
            console.log("No data given");
            callback(this, this.testPrint);
        }
        // Iterate over key/value pairs of input object
        
        var index = 0;
        for ( const [key, value] of Object.entries(memberData) ) {
            // check for matche in public or private data
            if ( key in this.publicData )
            {
                // if value is an object, iterate through its values
                if ( this.publicData[key] !== null && typeof this.publicData[key] === "object" )
                {
                    for ( const [nested_key, nested_value] of Object.entries(value) )
                    {
                        // check if nested key's are present in the defined nested object
                        if( nested_key in this.publicData[key] )
                        {
                            // store value if match
                            this.publicData[key][nested_key] = nested_value;
                        }else{
                            // If no match, report that data given is not defined
                            console.log(key+"."+nested_key+" is not defined in the prototype object");
                        }
                    }
                }else{
                    this.publicData[key] = value;
                }
            }
            // check for match in private data
            if ( key in this.privateData )
            {
                // if value is an object, iterate through its values
                if ( this.privateData[key] !== null && typeof this.privateData[key] === "object" )
                {
                    for ( const [nested_key, nested_value] of Object.entries(value) )
                    {
                        // check if nested key's are present in the defined nested object
                        if( nested_key in this.privateData[key] )
                        {
                            // store value if match
                            this.privateData[key][nested_key] = nested_value;
                        }else{
                            // If no match, report that data given is not defined
                            console.log(key+"."+nested_key+" is not defined in the prototype object");
                        }
                    }
                // if not objcet, assign value
                }else{
                    this.privateData[key] = value;
                }
            }
            // Update index & check if we've iterated completely
            index ++;
            if(index >= len)
            {
                callback(this, this.testPrint);
            }
        }
   }

    /* cleanData
    *
    *    Iterates over the data object to remove fields that wern't given
    *   or are in an invalid format. Note that the format parsing here is
    *   not an end-all-be-all and should be paired with data processing 
    *   when the data is initially inputted into the page.
    * 
    *   Execute this before prepairing to write the object to firestore.
    * */
    cleanData(_this, callback)
    {
        /*
        *  Iterate over key/value pairs of publicData
        * */ 
        for ( const [key, value] of Object.entries(_this.publicData) ) {
            // Check for null entries, which should be removed
            if( value === null )
            {
                console.log(key+" not defined");
                delete _this.publicData[key];
            }
            // If the current value is an object, iterate over it
            if ( value !== null && typeof value === "object" )
            {
                for ( const [nested_key, nested_value] of Object.entries(value) )
                {
                    // check for null entries and remove them
                    if ( nested_value === null )
                    {
                        console.log(key+"."+nested_key+" not defined");
                        delete _this.publicData[key][nested_key];
                    }
                }
            }
        }
        /*
        *  Iterate over key/value pairs of privateData
        * */ 
        var len = Object.entries(_this.privateData).length;
        var index = 0;
        for ( const [key, value] of Object.entries(_this.privateData) ) {
            // Check for null entries, which should be removed
            if( value === null )
            {
                console.log(key+" not defined");
                delete _this.privateData[key];
            }
            // If the current value is an object, iterate over it
            if ( value !== null && typeof value === "object" )
            {
                for ( const [nested_key, nested_value] of Object.entries(value) )
                {
                    // check for null entries and remove them
                    if ( nested_value === null )
                    {
                        console.log(key+"."+nested_key+" not defined");
                        delete _this.privateData[key][nested_key];
                    }
                }
            }
            // Update index & check if we've iterated completely
            index ++;
            if(index >= len)
            {
                callback(_this);
            }
        }
    }

  /*    Test printout
  *
  * */
 testPrint(_this){
     console.log("test print");
     console.log(_this.privateData);
     console.log(_this.publicData);
 }

}// End class 