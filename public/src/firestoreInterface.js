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
                console.log("Attempting to read user type");
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
            // We know that the user is at least authenticated
            this.userType = "Unregistered Member"
            // Write reference to user's private data object
            var privateRef = this.database.collection("private_data").doc(_this.userObject.uid);
            // Attempt to query their private data
            privateRef.get().then(function(doc){
                // Does the user have a private data field?
                if (doc.exists) {
                    // user is at least a member
                    _this.userType = "Member";
                }
            }).catch(function(error){
                console.log(error);
                console.log("Error grabbing this user's data.");
            }).finally(function(){
                if(_this.userType === "Member")
                {
                    // Finally, check if they're a moderator or not
                    var modRef = _this.database.collection("moderators").doc(_this.userObject.uid);
                    modRef.get().then(function(doc){
                        if(doc.exists){
                            console.log("Is Moderator")
                            _this.userType = "Moderator";
                        }
                    }).catch(function(error){
                        
                        console.log(error);
                        console.log("Error reading from moderators list");
                    }).finally(function(){
                        _this.callback(_this);
                    });
                }else{
                    _this.callback(_this);
                }
            });
        }
    } //  end parse user type

    /*  writeMemberDocument
    *
    *   Write member document to firestore given an object of the memberDocument
    *   class defined below. Note that ALL DATA PARSING // CLEANING must be done
    *   in the memberDocument class, this function DIRECTLY WRITES the data to the
    *   db
    * */
    writeMemberDocument(memberDoc, publicData=false, privateData=false, docUID=false){

        // Allow a moderator to write to a different UID document, this isn't just protected
        // from here, there is also a database rule to prevent this
        var UID = this.userObject.uid;
        if( this.userType === "Moderator" && docUID != false){
            UID = docUID;
        }


        if ( publicData ) 
        {
            // Write user's public data. Set merge == true to enable this funciton
            // to be used to both modify and create member data
            this.database.collection("members").doc(UID).set(
                memberDoc.publicData, 
                { merge: true }
            ).then(function(){
                console.log("Wrote public data to db");
            }).catch(function(error){
                console.log(error);
            })
        }
        if ( privateData )
        {
            //Write private data
            this.database.collection("private_data").doc(UID).set(
                memberDoc.privateData, 
                { merge: true }
            ).then(function(){
                console.log("Wrote private data to db");
            }).catch(function(error){
                console.log(error);
            })
        }
    }


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
        if( this.cache.hasOwnProperty(key) )
            return this.cache[key];
        return false;
    }

    /* getSnapshot
        Quick way to provide legacy support to pages still using firebase calls, while
        still actually pulling from firebase 

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
    constructor(memberData={}, UID=false, callback=false)
    {
        // Data in members collection
        this.publicData = this.publicDataPrimitive;
        // Data in private_data collection
        this.privateData = this.privateDataPrimitive;

        // Create a field validator that this docment can utilise
        this.validation = new memberDocumentValidation();
        // When a validation check fails, this array is used to store the failure
        // in reference to the failed data key
        this.invalidLog = []

        // Optionally attempt to associate this data with a certain UID
        this.UID = UID;

        // If a completion callback was given, store it
        console.log(callback);
        if ( callback !== false){
            this.callback = callback;
        }else{
            this.callback = this.testPrint;
        }
        // Parse given data
        this.parseInput(memberData, this.cleanData);

    }

    /*  Static definition of our data primitives so we can 
    *   ensure they're never modified. These are nothing
    *   more than a copy of the data structure defined in
    *   the online interface of firestore
    * */ 
   get publicDataPrimitive()
   {
        return {
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
            status:null,
            privacy: false
        }
   }
   get privateDataPrimitive()
   {
        return {
            approved : false,
            email : null,
            interests : {
                connect: false,
                learn: false,
                mentor: false,
                organize: false,
                support: false
            },
            comments : null
        }
   }
    /*  parseInput
    *       
    *   Reads fields given from input data and matches them against the
    *   data fields defined in the constructor.
    * */
   parseInput(memberData, callback) 
   {
       //console.log(memberData);
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
            if ( key in this.publicDataPrimitive )
            {
                // Check if this key was previously removed from object by clean
                if (! key in this.publicData)
                {
                    // If it was deleted, reset it as null, which will force an it's new
                    // value to be placed into it a few lines down
                    //console.log("Re-adding "+key);
                    this.publicData[key] = null;
                }
                // if value is an object, iterate through its values
                if ( this.publicData[key] !== null && typeof this.publicData[key] === "object" )
                {
                    for ( const [nested_key, nested_value] of Object.entries(value) )
                    {
                        // check if nested key's are present in the defined nested object
                        if( nested_key in this.publicData[key] )
                        {
                            // store value if match
                            //console.log("Adding nested: "+nested_key+" = "+nested_value+" to Public data");
                            this.publicData[key][nested_key] = nested_value;
                        }else{
                            // If no match, report that data given is not defined
                            //console.log(key+"."+nested_key+" is not defined in the prototype object");
                        }
                    }
                }else{
                    //console.log("Adding "+key+" = "+value+" to Public data");
                    this.publicData[key] = value;
                }
            }
            // check for match in private data
            if ( key in this.privateDataPrimitive )
            {
                // Check if this key was previously removed from object by clean
                if (! key in this.privateData)
                {
                    // If it was deleted, reset it as null, which will force an it's new
                    // value to be placed into it a few lines down
                    //console.log("Re-adding "+key+" to private data")
                    this.privateData[key] = null;
                }
                // if value is an object, iterate through its values
                if ( this.privateData[key] !== null && typeof this.privateData[key] === "object" )
                {
                    for ( const [nested_key, nested_value] of Object.entries(value) )
                    {
                        // check if nested key's are present in the defined nested object
                        if( nested_key in this.privateData[key] )
                        {
                            // store value if match
                            //console.log("Adding nested: "+nested_key+" = "+nested_value+" to Private data");
                            this.privateData[key][nested_key] = nested_value;
                        }else{
                            // If no match, report that data given is not defined
                            //console.log(key+"."+nested_key+" is not defined in the prototype object");
                        }
                    }
                // if not objcet, assign value
                }else{
                    //console.log("Adding "+key+" = "+value+" to Private data");
                    this.privateData[key] = value;
                }
            }
            // Update index & check if we've iterated completely
            index ++;
            if(index >= len)
            {
                callback(this, this.callback);
            }
        } // End looping over given data 
   } // End parseInput

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
                //console.log(key+" not defined");
                delete _this.publicData[key];
            }else{
                // Validate field, if invalid, revert the value to default
                if ( ! _this.validation.validateField[key](value) ) {
                    _this.publicData[key]= _this.publicDataPrimitive[key];
                    _this.invalidLog.push(key +" was invalid given value "+value);
                }
            }
            // If the current value is an object, iterate over it
            if ( value !== null && typeof value === "object" )
            {
                for ( const [nested_key, nested_value] of Object.entries(value) )
                {
                    // check for null entries and remove them
                    if ( nested_value === null )
                    {
                        //console.log(key+"."+nested_key+" not defined");
                        delete _this.publicData[key][nested_key];
                    } else {
                        // Validate field, if invalid, revert the value to default
                        if ( ! _this.validation.validateField[nested_key](nested_value) ) {
                            _this.publicData[key][nested_key] = _this.publicDataPrimitive[key][nested_key];
                            _this.invalidLog.push(key+":"+nested_key +" was invalid given value "+nested_value);
                        } 
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
                //console.log(key+" not defined");
                delete _this.privateData[key];
            }else{
                // Validate field, if invalid, revert the value to default
                if ( ! _this.validation.validateField[key](value) ) {
                    _this.privateData[key]= _this.privateDataPrimitive[key];
                    _this.invalidLog.push(key +" was invalid given value "+value);                
                }
            }
            // If the current value is an object, iterate over it
            if ( value !== null && typeof value === "object" )
            {
                for ( const [nested_key, nested_value] of Object.entries(value) )
                {
                    // check for null entries and remove them
                    if ( nested_value === null )
                    {
                        //console.log(key+"."+nested_key+" not defined");
                        delete _this.privateData[key][nested_key];
                    } else {
                        // Validate field, if invalid, revert the value to default
                        if ( ! _this.validation.validateField[key](value) ) {
                            _this.publicData[key][nested_key]= _this.publicDataPrimitive[key][nested_key];    
                            _this.invalidLog.push(key+":"+nested_key +" was invalid given value "+nested_value);
                        }       
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
    } // End clean data

    /*  modifyDocument
    *   
    *   Given an object, checks for keys defined in the data primitives, and writes
    *   values to the current memberDocument object if defined.
    * */
    modifyDocument(memberData)
    {
        // Send data back into parsing function
        this.parseInput(memberData, this.cleanData);
    } 
   

  /*    Test printout
  *
  * */
 testPrint(_this){
     //console.log("test print");
     //console.log(_this.privateData);
     //console.log(_this.publicData);
     if ( _this.invalidLog.length > 0 ){
        //console.log("Member had field errors");
     } else {
        //console.log("Done parsing a member object with no validation failures");
     }
 }

}// End class 


/*
*     This section will define a function mapping to each expected key in 
*   our data primitive, where the matched functions verify the validity of
*   the data to some degree. I.e. each will return true/false if we can 
*   utilise the given data or if we have to throw it away.
*/
class memberDocumentValidation
{
    constructor()
    {
        //Define the function map
        this.validateField = {
            ambassador                  : this.isBool      ,
            current_address             : this.isObject    ,
            administrative_area_level_1 : this.isProvince  ,  
            country                     : this.isCountry   ,  
            lat                         : this.isLatitude  ,  
            lng                         : this.isLongitude ,
            locality                    : this.isTown      ,
            date_created                : this.isEpoch     ,
            first_name                  : this.isName      ,     
            grad_year                   : this.isYear      ,  
            hometown_address            : this.isObject    ,
            industry                    : this.isIndustry  ,
            last_name                   : this.isName      ,
            linkedin_profile            : this.isLinkedIn  ,
            program                     : this.isProgram   ,
            school                      : this.isSchool    ,
            status                      : this.isStatus    ,
            approved                    : this.isBool      ,
            email                       : this.isEmail     ,
            interests                   : this.isObject    ,
            connect                     : this.isBool      ,
            learn                       : this.isBool      ,
            mentor                      : this.isBool      ,
            organize                    : this.isBool      ,
            support                     : this.isBool      ,
            privacy                     : this.isPrivacy   ,
            comments                    : this.isText      
        }
    }

    // Returns true if value is an object
    isObject(field){
        if ( field !== null && typeof field === 'object' )
            return true;
        return false;
    }
    // Returns true if value is boolean
    isBool(field){
        if ( typeof(field) === typeof(true) )
            return true;
        return false;
    }
    // Returns true if URL is a valid linked-in profile
    // Eventually use linkedin API to validate this
    isLinkedIn(field){
        // Taken from here https://stackoverflow.com/questions/13532149/jquery-url-validation-needs-to-contain-linkedin-com
        // Removed /(ftp|http|https):\/\/?(?:www\.)? as a lot of members forgot to add this 
        if ( /linkedin.com(\w+:{0,1}\w*@)?(\S+)(:([0-9])+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(field) )
            return true;
        return false;
    }
    // Return true if the string could be a name
    isName(field){
        const regex = /^[-'À-ÿa-zA-ZÀ-ÖØ-öø-ſ\s().]+$/gm;
        if ( regex.test(field) )
            return true;
        return false;
    }
    // Returns true if the string could be a Province or state
    isProvince(field){
        // For now we can just enforce that there are no symbols or numbers... except . '
        const regex = /^[-'À-ÿa-zA-ZÀ-ÖØ-öø-ſ\s.’']+$/gm
        if ( regex.test(field) )
            return true;
        return false;
    }
    // Returns true if the string is a country
    isCountry(field) {
        // For now we can just enforce that there are no symbols or numbers...
        const regex = /^[-'À-ÿa-zA-ZÀ-ÖØ-öø-ſ\s.’']+$/gm
        if ( regex.test(field) )
            return true;
        return false;
    }
    // Returns true if the number is a valid year
    isYear(year){   
        var text = /^[0-9]+$/;
        if( year.toString().length == 4 ) {
            if (year != 0) {
                if ((year != "") && (!text.test(year))) { 
                    return false;
                }      
                var current_year=new Date().getFullYear();
                if((year < 1920) || (year > current_year + 100))
                {                      
                    return false;
                }                  
                return true;
            } 
        }
        console.log("Tested "+year)
    }
    // returns true if the value is a valid latitude
    isLatitude(field) {
        if ( !isNaN(+field) && isFinite(field) ){
            if ( field <= 90 && field >= -90 )
                return true;
        } 
        return false;
    }
    // returns true if the value is a valid longitude
    isLongitude(field) {
        if ( !isNaN(+field) && isFinite(field) ){
            if ( field <= 180 && field >= -180 )
                return true;
        } 
        return false;
    }
    // returns true if the string could be town/city name
    isTown(field) {
        // For now we can just enforce that there are no symbols or numbers...
        const regex = /^[-'À-ÿa-zA-ZÀ-ÖØ-öø-ſ\s.’']+$/gm
        if ( regex.test(field) )
            return true;
        return false;
    }
    // returns true if the value could be an Epoch
    isEpoch(field) {
        // just try to parse a date out of the value, if it works without fail we're happy enough
        try{
            var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
            d.setUTCSeconds(field);
        }catch (err){
            // Empty catch == pass 
            return false;
        }
        return true;
    }
    // Returns true if the string could be an academic program name
    isProgram(field) {
        // For now we can just enforce that there are no symbols or numbers...
        const regex = /^[-'À-ÿa-zA-ZÀ-ÖØ-öø-ſ\s.'’(),&]+$/gm
        if ( regex.test(field) )
            return true;
        return false;
    }
    // Returns true if the string could be a school name
    isSchool(field) {
        // For now we can just enforce that there are no symbols or numbers...
        const regex = /^[-'À-ÿa-zA-ZÀ-ÖØ-öø-ſ\s.'’,()0-9]+$/gm
        if ( regex.test(field) )
            return true;
        return false;
    }
    // Returns true if the string could be a person's status
    isStatus(field) {
        // For now we can just enforce that there are no symbols or numbers...
        const regex = /^[-'À-ÿa-zA-ZÀ-ÖØ-öø-ſ\s]+$/gm
        if ( regex.test(field) )
            return true;
        return false;
    }
    // Returns true if the string is a valid industry
    isIndustry(field) {
        // For now we can just enforce that there are no symbols or numbers...
        const regex = /^[-'À-ÿa-zA-ZÀ-ÖØ-öø-ſ\s&,’']+$/gm
        if ( regex.test(field) )
            return true;
        return false;
    }
    // Returns true if the value is a valid e-mail
    isEmail(field) {
        // Taken from https://www.w3resource.com/javascript/form/email-validation.php
        if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(field))
        {
          return true;
        }
          return false;
    }
    // Returns true if the value is one of our privacy settings
    isPrivacy(field) {
        if(field === "members" || field === "public")
            return true;
        return false;
    }
    // Returns true if the values are proper text format
    isText(field){
        return true;
    }
}