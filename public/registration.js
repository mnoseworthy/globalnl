
/********************
* Interface reference
********************/
// Will hold a refernece to the created firebase reference, giving access to
// the interface in our callback functions below.
var _firebase_interface;

/*****************************************************  
* Register event callbacks & implement element callbacks
******************************************************/
// Init auth on load web page event
$(document).ready(function(){
    initApp();
});

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
    // Get new member object from firebase cache
    var member = _firebase_interface.readCache("new_member");
    // Get place object from google api
    var place = autocomplete_current.getPlace();
    // iterate over object and look for the keys in locationData
    for (var i = 0; i < place.address_components.length; i++) {
      var addressType = place.address_components[i].types[0];
      if (locationData[addressType]) {
        member["current_address"][addressType] = place.address_components[i]["long_name"];;
      }
    }
    // Store geometry into new member object as well
    member["current_address"]["lat"] = place.geometry.location.lat();
    member["current_address"]["lng"] = place.geometry.location.lng();
    // Write our modified object back to the firebase cache
    _firebase_interface.writeCache("new_member", member);
  });
  // Second autocomplete callback, the repeated code kills me but im currently lazy
  // TODO: tear out the repeated code into a function above
  autocomplete_hometown.addListener('place_changed', function() {
    // Get new member object from firebase cache
    var member = _firebase_interface.readCache("new_member");
    // Get place object from google api
    var place = autocomplete_current.getPlace();
    // iterate over object and look for the keys in locationData
    for (var i = 0; i < place.address_components.length; i++) {
      var addressType = place.address_components[i].types[0];
      if (locationData[addressType]) {
        member["hometown_address"][addressType] = place.address_components[i]["long_name"];;
      }
    }
    // Store geometry into new member object as well
    member["hometown_address"]["lat"] = place.geometry.location.lat();
    member["hometown_address"]["lng"] = place.geometry.location.lng();
    // Write our modified object back to the firebase cache
    _firebase_interface.writeCache("new_member", member);
  });
}

// Code entry point, started when page is finished loading
function initApp()
{
  // Initialize config handler, this does nothing more than parse the config object
  // in the config handler file and return the object required for this page to the callback,
  // where the callback is just our namespace below
  new configHandler( registration_namespace, 'registration' );
}

/********************************
* Main namespace and control flow
*********************************/

// This is where we implement the main logic for our page, and we pass this function to
// the configHandler constructor as it's callback - i.e. it's started once config is finished loading
var registration_namespace = function (config) 
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
      // store interface object globally
      _firebase_interface = fbi;
      // Switch based on user type, this is where we redirect different types
      // of users to other pages if they don't belong here or whatever
      switch ( fbi.userType ) 
      {
          case "Moderator":
          case "Member":
              console.log("User already registered");
              window.location.href = "index.html";
              break;
          case "Unregistered Member":
              // This is the only member type we expect to handle here
              break;
          case "Anonymous":
              console.log("Can this user type exist?")
              break;
          default:
              console.log("User type undefined? How did we get here ...");
              return false;
      }
      // store a default member object in the fbi cache so it can be
      // written to by callbacks
      fbi.writeCache("new_member", config.default_member);

      /*******
       *   Callbacks that require data from config or firebase
       */
  
      // register form submit must be assigned here so we can give the register function
      // database access & the default member object
      $("#register_form").submit( function(e){
        // Don't refresh page, let our code run instead
        e.preventDefault();
        // Run register function to store data into firebase
        register();
      })


  } // end firebase callback
  
  // Running the initializer returns the database interface object to the callback
  // or False if an error occured.
  // We pass the firebase interface the firebase section of our loaded config
  new firebase_interface(config.firebase.config, firebaseLoaded);
}; // end namespace

/*****************************************************
* Utility Functions, only referenced in this file
*****************************************************/
/*
* Combines data currently in the form and in the cached new member object
* then writes it to the database
*/
function register() 
{
  // load new_member object from firebase cache
  var member = _firebase_interface.readCache("new_member")

  /*  callback to Write object to database, executed when parsing is complete
  */
  function write(){
    _firebase_interface.write("private/members/" + _firebase_interface.userObject.uid,
      member, function(error){
        if ( error == null )
        {
          //alert("Registration success");
          window.location.href = "index.html";
        }else{
          // To Do: write validation function and inform user on what they've done wrong ?
          alert("Error");
        }
    });
  }

  /* Store known fields into member objcet
  */
  // Direct unconditional reads
  member.first_name = $( "#first_name" ).val();
  member.last_name = $( "#last_name" ).val();
  member.email = $( "#email" ).val();
  member.linkedin_profile = $( "#linkedin_profile" ).val().toLowerCase();
  member.status = $( "#status" ).val();
  member.comments = $( "#comments" ).val();
  member.privacy = $('input[name=privacy]:checked').val();
  member.date_created = Date.now();
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
  // Iterative reads
  $("#interest_select input[type='checkbox']").each(function() {
    // iterate over default member interests
    interests = Object.keys(member.interests)
    for ( var i = 0; i<interests.length; i++)
    {
      // If the current checkbox isn't checked, skip iteration
      if ( $(this).is(":checked") )
        break;
      // If the box is checked, and it matches our current default interest, store the value
      if( $(this).id == interests[i] )
      {
          member.interests[interests[i]] = true;
      }
    }
  });

  // not the best place to put this callback but it should work for now..
  write();

} // end register function