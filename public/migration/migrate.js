/*
*   File to stage the migration process
*/

/********************
* Interface reference
********************/
// Will hold a reference to the created firebase reference, giving access to
// the interface in our callback functions below.
var _firebase_interface;

/*****************************************************  
* Register event callbacks & implement element callbacks
******************************************************/
// Init auth on load web page event
$(document).ready(function(){
    initApp();
});
// Callback executed on page load
function initApp()
{
    // Initialize config handler, this does nothing more than parse the config object
    // in the config handler file and return the object required for this page to the callback,
    // where the callback is just our namespace
    new configHandler( migrate_namespace, 'members' );
    return true;
}

function processData(callback) {
    /*
    *   This is how I'm grabbing the data from the db instead of hauling it 
    *   down from the database every time. I just exported the whole database
    *   as json, and changed the file to .js and wrapped the data in a function
    *   to return it, getDatabaseExport
    */
    var database = getDatabaseExport();
    // Split out separate 
    var moderators  = database.moderators;
    var publicData  = database.public.members;
    var privateData = database.private.members;
    var sharedData  = database.shared.members;
    // array to store all the created memberDocument objects
    var memberDocuments = [];
    var errorDocuments = [];
    var rejectedDocments = [];
    /*
        for each user ID in private data, we need to go off and find their complete data set
    */
    // Iterate over pirvateData
    var numMembers = 0;
    var numWithPublic = 0;
    var numWithShared = 0;
    for ( const [key, value] of Object.entries(privateData) ) {
        try{
            // append data into this object
            var memberData = value;
            numMembers ++;

            // Ignore dummy
            if ( key === "dummy"){
                rejectedDocments.push(value);
                continue;
            }
            
            // Get public UID from data
            var UID = key;
            if( memberData.hasOwnProperty('public_uid') ){
                UID = memberData['public_uid'];
            }
            

            //find data in public set
            if ( publicData.hasOwnProperty(UID) )
            {
                numWithPublic ++;
                memberData = Object.assign(publicData[UID], value);
            }
            //find data in shared set
            if ( sharedData.hasOwnProperty(UID) )
            {
                numWithShared ++;
                memberData = Object.assign(sharedData[UID], value);
            }
            // Modify data to fit new typings
            for ( const [field_key, field_value] of Object.entries(memberData) )
            {
                // look for yes/no strings that should become booleans
                if( field_value === "Yes" || field_value === "yes"){
                    memberData[field_key] = true;
                }
                if( field_value === "No" || field_value === "no"){
                    memberData[field_key] = false;
                }
                
            }
            // Create a memberDoc object, associate the key with this data
            var memberDoc = new memberDocument(memberData, key);
        
            // If memberDoc contained field errors, report the error & append to list of error documents
            if( memberDoc.invalidLog.length >0 ){
                errorDocuments.push(memberDoc);  // 3
                
            }else{
                // Store doc to array
                memberDocuments.push(memberDoc); // 431
            }
        }catch(err){
            console.log(err);
        }

        // Check if we're done iterating
        if ( numMembers >= Object.entries(privateData).length)
        {
            // Report results
            console.log("Processed "+numMembers+" members");
            console.log(numWithPublic + " members had public data");
            console.log(numWithShared + " members had shared data" );
            // Execute callback
            callback(memberDocuments, errorDocuments, rejectedDocments);
        }
    }
}

function handleMemberDocs(memberDocuments, errorDocuments, rejectedDocments)
{

    // Handle the errors in data parsing
    var resolvedErrorIndex = [];
    errorDocuments.forEach(function(element) {
        //console.log("Checking "+element);
        errors = element.invalidLog;
        var status = true;
        var len = errors.length;
        var index = 0;
        errors.forEach(function(error) {
            //update index
            index ++;
            // Get key from error log
            var fieldKey = error.split(' ')[0];
            // key may be a nested value
            if ( fieldKey.indexOf(":") > -1 ){
                fieldKey = fieldKey.split(":");
            }

            var fieldValue;
            if( typeof(fieldKey) == typeof("") ){
                if ( element.publicData.hasOwnProperty(fieldKey) ){
                    //console.log("Foundin public data");
                    fieldValue = element.publicData[fieldKey];
                }else if( element.privateData.hasOwnProperty(fieldKey) ) {
                    //console.log("foudn in privdate data");
                    fieldValue = element.privateData[fieldKey];
                }
            }else{
                try{
                    fieldValue = element.publicData[fieldKey[0]][fieldKey[1]];
                }catch (err){}
                try{
                    fieldValue = element.privateData[fieldKey[0]][fieldKey[1]];
                }catch (err){}
                
            }
            // After resolving fieldValue, set fieldKey to the 2nd element if it was nested
            if ( typeof(fieldKey) === typeof([]) ){
                fieldKey = fieldKey[1];
            }

            // Set to false
            status = false; 
            // Check if this error is passable or not
            // We're going to allow some location fields to be null, as the members who have them
            // unset have given their country and lat/lng
            if(fieldKey === "locality" && fieldValue === null){
                status = true;
            }else if ( fieldKey === "administrative_area_level_1" && fieldValue === null){
                status = true;
            }
            // For now we're also going to accept invalid LinkedIN URL's...
            // we can't really just, unregister people ?
            else if(fieldKey === "linkedin_profile"){
                status = true;
            }
            // Check if we're at end of iteration and have true status
            if( index >= len && status === true  ){
                //console.log("Resolved error document :"+element+" and added it into the list of member documents");              
                memberDocuments.push(element);
                resolvedErrorIndex.push(index)        
            }
                
        });

    });
    // Removed resolved errors
    var i = 0;
    resolvedErrorIndex.forEach( function(index){
        i++;
        errorDocuments = errorDocuments.splice(index,1);
        // if all errors are resolved, start writeout
        if(i >= resolvedErrorIndex.length)
        {
            writeDocuments(memberDocuments);
        }
    });

    // Report resulting data
    console.log(memberDocuments.length+" members were processed successfully:");
    console.log(memberDocuments);
    console.log(errorDocuments.length + " members had invalid field values:");
    console.log(errorDocuments);
    console.log(rejectedDocments.length+" members were rejected");
    console.log(rejectedDocments);

       
}

function writeDocuments(memberDocuments) 
{
    var numNonShared = 0;
    var numShared = 0;
    memberDocuments.forEach( function(doc){        
        // Write if we're under our max test condition
        if( doc.publicData.privacy === "public"){      
            if(numShared < 0) {
                numShared ++;
                console.log("Attempting to write shared member");
                _firebase_interface.writeMemberDocument(doc, true, true, doc.UID);
                return;
            }
        }else{
            if(numNonShared < 0) {
                numNonShared ++;
                console.log("Attempting to write non-shared member");
                _firebase_interface.writeMemberDocument(doc, true, true, doc.UID);
                return;
            }
        }

    })
}

var migrate_namespace = function(config){
    var firebaseLoaded = function( fbi ) {
        // Validate success
        if ( ! fbi ) 
        {
            console.log("An error has occured while initializing the firebase interface");
            return false;
        }

        // Store reference globally for access by callbacks
        _firebase_interface = fbi;
        
        // Switch based on user type
        console.log(fbi.userType);
        switch ( fbi.userType ) 
        {
            case "Moderator":
                processData(handleMemberDocs);
            case "Member":
            case "Unregistered Member":
            case "Anonymous":
                break;

            default:
                console.log("User type undefined? How did we get here ...");
                return false;
        }
    }
    // Running the initializer returns the database interface object to the callback
    // or False if an error occured.
    new firebase_interface(config.firebase.config, firebaseLoaded);

} //  end migration namespace