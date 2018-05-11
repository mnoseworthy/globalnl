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
    // Generate navbar
    genNavbar();
    // Initialize config handler, this does nothing more than parse the config object
    // in the config handler file and return the object required for this page to the callback,
    // where the callback is just our namespace below
    new configHandler( profile_namespace, 'profile' );
    // Dont know why this is a thing, but leaving it here for now
    $("#user_controls_mobile").hide();
}
// Prevent the enter key from submitting the form when uncomplete
$(window).keydown(function(event){
    if(event.keyCode == 13) {
      event.preventDefault();
      return false;
    }
});
// status change event
$('#status').on('change',function(){
    if( $(this).val()==="Student"){
      $("#school").show();
      $("#program").show();
      $("#grad_year").show();
    }
    else {
      $("#school").hide();
      $("#program").hide();
      $("#grad_year").hide();
    }
});
// Industry change event
$('#industry').on('change',function(){
if( $(this).val()==="Other"){
    $("#industry_other").show();
}
else {
    $("#industry_other").hide();
}
});
// 
function changeStatus(){
    if ($( "#status" ).val() == "Student") {
        document.getElementById("school_box").required = true;
        document.getElementById("program_box").required = true;
        document.getElementById("grad_year_box").required = true;
    }
    else {
        document.getElementById("school_box").required = false;
        document.getElementById("program_box").required = false;
        document.getElementById("grad_year_box").required = false;
    }
}
// 
function changeSector() {
    if ($( "#industry" ).val() == "Other") {
        document.getElementById("industry_other_box").required = true;
    }
    else {
        document.getElementById("industry_other_box").required = false;
    }
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

// Callback for google maps autocomplete for storing autocompleted location data into
// the new member objcet
function initAutocomplete() {
    // Register our autocomplete elements, see URL for more information
    // https://developers.google.com/maps/documentation/javascript/examples/places-autocomplete-addressform
    autocomplete_current = new google.maps.places.Autocomplete(
        /** @type {!HTMLInputElement} */(document.getElementById('autocomplete_current')),
        {types: ['geocode']});
    autocomplete_hometown = new google.maps.places.Autocomplete(
        /** @type {!HTMLInputElement} */(document.getElementById('autocomplete_hometown')),
        {types: ['geocode']});

    // Look for these keys in the place object returned by google API
    // if found, their values are filled and written to our new member object
    var locationData = {
        street_number               : true,
        route                       : true,
        locality                    : true,
        administrative_area_level_1 : true,
        country                     : true,
        postal_code                 : true
    };

    // define event callbacks for each element, these fire when the fields
    // are auto filled by google api and then the location data is stored in our member object
    autocomplete_current.addListener('place_changed', function(){
        try{
            // Get location data from cache
            var location = {};
            if(_firebase_interface.readCache("location"))
                location = _firebase_interface.readCache("location");
            // Get place object from google api
            var place = autocomplete_current.getPlace();
            if(place){
                // iterate over object and look for the keys in locationData
                location["current_address"] = {};
                for (var i = 0; i < place.address_components.length; i++) {
                    var addressType = place.address_components[i].types[0];
                    if (locationData.hasOwnProperty(addressType)) {
                        location["current_address"][addressType] = place.address_components[i]["long_name"];;
                    }
                }
                // Store geometry into new member object as well
                location["current_address"]["lat"] = place.geometry.location.lat();
                location["current_address"]["lng"] = place.geometry.location.lng();
                // Write our modified object back to the firebase cache
                _firebase_interface.writeCache("location", location);
            }
        }catch(err){
            //console.log(err);
        }
    });

    // Second autocomplete callback, the repeated code kills me but im currently lazy
    // TODO: tear out the repeated code into a function above
    autocomplete_hometown.addListener('place_changed', function() {
        try{
            // Get location data from cache
            var location = {};
            if(_firebase_interface.readCache("location"))
                location = _firebase_interface.readCache("location");
            // Get place object from google api
            var place = autocomplete_hometown.getPlace();
            if(place){
                // iterate over object and look for the keys in locationData
                location["hometown_address"] = {};

                for (var i = 0; i < place.address_components.length; i++) {
                var addressType = place.address_components[i].types[0];
                    if (locationData.hasOwnProperty(addressType) ){
                        location["hometown_address"][addressType] = place.address_components[i]["long_name"];;
                    }
                }
                // Store geometry into new member object as well
                location["hometown_address"]["lat"] = place.geometry.location.lat();
                location["hometown_address"]["lng"] = place.geometry.location.lng();
                // Write our modified object back to the firebase cache
                _firebase_interface.writeCache("location",location);
            }
        }catch(err){
            //console.log(err);
        }
    });
}

// form submit callback
$("#profile_form").submit(  function(event){
    // prevent navigation out of page
    event.preventDefault();

    // bundle form data into object
    var userData = {}
    userData["first_name"] = $("#first_name").val();
    userData["last_name"] = $("#last_name").val();
    userObject["email"] = $("#email").val();
    userData["linkedin_profile"] = $("#linkedin_profile").val();
    userData["industry"] = $("#industry").val();
    userData["status"] = $("#status").val();
    userData["comments"] = $("#comments").val();

    /* Store known fields into member objcet
    */
   member = {}
   // Direct unconditional reads
   member.first_name = $( "#first_name" ).val();
   member.last_name = $( "#last_name" ).val();
   member.email = $( "#email" ).val();
   member.linkedin_profile = $( "#linkedin_profile" ).val().toLowerCase();
   member.status = $( "#status" ).val();
   member.comments = $( "#comments" ).val();
   member.privacy = $('input[name=privacy]:checked').val();
   // Conditional reads
   if ($( "industry" ).val() == "Other") {
       member.industry = $( "#industry_other_box" ).val();
   }
   else {
       member.industry = $( "#industry" ).val();
   }
   if (member.status == "Student") {
       member["school"] = $( "#school_box" ).val();
       member["program"] = $( "#program_box" ).val();
       member["grad_year"] = parseInt($( "#grad_year_box" ).val());
   }
   member["interests"] = {
        "connect" : document.getElementById('connect').checked,
        "organize" : document.getElementById('organize').checked,
        "learn" : document.getElementById('learn').checked,
        "mentor" : document.getElementById('mentor').checked,
        "support" : document.getElementById('support').checked
    }
    // Read data from cache
    var location_data = _firebase_interface.readCache("location");
    // Check if location data was given
    if( location_data ){
        // checkif hometown address was given
        if(location_data.hasOwnProperty("hometown_address"))
        {
            member["hometown_address"] = location_data["hometown_address"];
        }
        // checkif current address was given
        if(location_data.hasOwnProperty("current_address"))
        {
            member["current_address"] = location_data["current_address"];
        }
    }


    // Make a new memberDocument
    var doc = new memberDocument(member, _firebase_interface.userObject.uid, function(memberDoc){
        // Check for errors in given fields
        if(memberDoc.invalidLog.length > 0)
        {
            var report = ""
            memberDoc.invalidLog.forEach( function(error){
                report = report + error + "\n";
            });
            alert(report);
        }else{
            _firebase_interface.writeMemberDocument(memberDoc, true, true);
            alert("Profile updated, refresh to see changes");
        }    
    });
    
    return false;
})

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

            // Fill values from public data
            fbi.database.collection("members").doc(userObject.uid).get().then( function(doc){
                userData = doc.data();
                //console.log(userData);
                $("#first_name").val(userData["first_name"]);
                $("#last_name").val(userData["last_name"]);
                $("#email").val(userObject["email"]);
                $("#linkedin_profile").val(userData["linkedin_profile"]);
                $("#industry").val(userData["industry"]);
                $("#autocomplete_current").val( getLocationString( userData["current_address"] ) );
                $("#autocomplete_hometown").val( getLocationString( userData["hometown_address"] ) );
                // handle status
                var status = $("#status").val(userData["status"]);
                if( status ){
                    $("#school").show();
                    $("#program").show();
                    $("#grad_year").show()
                }
                $("#school_box").val( userData["school"] );
                $("#grad_year_box").val( userData["grad_year"] );
                $("#program_box").val( userData["program"] );
                // handle priacy
                if( userData["privacy"] === "public" ){
                    $(':input[value="public"]').prop("checked", true);
                }else{
                    $(':input[value="members"]').prop("checked", true);
                }
            });
            // Fill values from private data
            fbi.database.collection("private_data").doc(userObject.uid).get().then( function(doc){
                // grab data
                userData = doc.data();
                
                // Iterate over interests and check respective fields
                for ( const [interest, value] of Object.entries(userData.interests) ){
                    // Check if interst exists
                    if( value && document.getElementById(interest) ){
                        //Check the button
                        $("#"+interest).prop("checked", true);
                    }
                }
                // Fill comments block
                $("#comments").text(userData["comments"]);
            })
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


/* Utilises the elementHandler class to generate the top-fixed navbar on the page
*/
function genNavbar()
{
    //console.log("Attempting to generate navbar");
    // This callback is given to the elementHandler constructor, it must do something with
    // the resolved element string
    var injectNav = function ( resolvedDOM )
    {
<<<<<<< HEAD
        //console.log(resolvedDOM);
=======
>>>>>>> 00af6e127fd22a2767d38441b73f70f58c9f858c
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


