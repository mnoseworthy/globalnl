//$(function() {
//	$('container-outer').css("padding", 0);
//	$('li-profile-container member-profile').css("padding", 0);
//});

/********************
* Interface reference
********************/
// Will hold a reference to the created firebase reference, giving access to
// the interface in our callback functions below.
var _firebase_interface;
var _config;

var formLocation = {};
var last_read_doc = 0;
var scroll_done = false;
var searchPressed = false;

/*****************************************************  
* Register event callbacks & implement element callbacks
******************************************************/
// Init auth on load web page event
$(document).ready(function(){
    initApp();
	console.log('Document ready');
});

$(window).scroll(function() {
	if(scroll_done){
	  if ($(window).scrollTop() > $(document).height() - $(window).height() - $(window).height()/6 ) {
		scroll_done=false;
		memberSearch();
	}
  }
});

$('#form_location').submit(function(e){
	console.log("Searching...");
	last_read_doc = 0;
	$( "#members-list" ).empty();
	searchPressed = true;
	memberSearch();
	event.preventDefault();
});

$('#search_clear').click(function(e){
	console.log("Clear search...");
	$('#form_location').get(0).reset();
	searchPressed = false;
	last_read_doc = 0;
	$( "#members-list" ).empty();
	memberSearch();
});

// Callback executed on page load
function initApp()
{
    // Generate navbar
    //genNavbar();
    // Initialize config handler, this does nothing more than parse the config object
    // in the config handler file and return the object required for this page to the callback,
    // where the callback is just our namespace
    new configHandler( members_namespace, 'members' );
	if ($(window).width() <= 400) {
		
	}

    return true;
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


/********************************
* Main namespace and control flow
*********************************/
var members_namespace = function (config) 
{
    var firebaseLoaded = function( fbi ) {
        // Validate success
        if ( ! fbi ) 
        {
            console.log("An error has occured while initializing the firebase interface");
            return false;
        }

        // Store reference globally for access by callbacks
        _firebase_interface = fbi;
        _config = config;
        
        // Switch based on user type
        console.log(fbi.userType);
        switch ( fbi.userType ) 
        {
            case "Moderator":
            case "Member":
                // Load user information at top of page for desktop
                $('#login_name').html(fbi.userObject.displayName);
				$('#userNavBar').append(
				'<li class="nav-item"><a class="nav-link" href="profile.html"><span class="fas fa-globalnl fa-edit"></span><span id="">Edit profile</span></a></li><li id="button_logout" class="nav-item"><a class="nav-link" href="#"><span class="fas fa-globalnl fa-sign-out-alt"></span><span id="">Logout</span></a></li>'
				);
				$('#button_logout').click(function(e){
				// Cancel the default action
					logout();
					e.preventDefault();
				});
				/*
				var injectElement = function(domString) {
                    document.getElementById('login_name').innerHTML = domString;
                }
                /*
				var args = { displayName:fbi.userObject.displayName, email:fbi.userObject.email };
                new elementHandler("src/elements/login_name.html", args, injectElement);
                // Load user information for mobile
                injectElement = function(domString) {
                    $("#user_controls_mobile").show();
                    document.getElementById('login_name_mobile').innerHTML = domString;
                }
                args = { displayName:fbi.userObject.displayName };
                new elementHandler("src/elements/login_name_mobile.html", args, injectElement);
				*/

                // Check for approval status
                /*
				if( ! fbi.userObject.approved ){
                    alert("Your account hasn't been approved yet by a moderator, you only have public access");
                }
				*/
                break;
            case "Unregistered Member":
                // Member never filled out registration form
                if (confirm("Account not fully registered, continue to registration form? If not your access will be limited.")) {
                    window.location.href = "registration.html";
                }
                break;
            case "Anonymous":
            default:
                console.log("User type undefined? How did we get here ...");
                window.location.replace("index.html");
                return false;
        }

        readDBforMembers();
    }
    // Running the initializer returns the database interface object to the callback
    // or False if an error occured.
    new firebase_interface(config.firebase.config, firebaseLoaded);
};

/*****************************************************
* Utility Functions, only referenced in this file
*****************************************************/

function readDBforMembers()
{
    switch ( _firebase_interface.userType ) 
    {
        case "Moderator":
        case "Member":
           
            // Check for approval status
            if( _firebase_interface.userObject.approved ){
				console.log("Approved member...");
               _firebase_interface.database.collection("members").orderBy("last_name").startAt('A').limit(_config.members_per_page)
                   .get().then( function(members){
                       console.log("Loaded members...");
					   loadMembers(members, _config, _firebase_interface);
                   });

            // if not approved...
            }else{
				// For now doing same thing here
                // Load public members table
                // load members who've agreed to be viewable
				console.log("Unapproved member...");
                _firebase_interface.database.collection("members").orderBy("last_name").startAt('B').limit(9) //.where("last_name", "==", "feener")
                    .get().then( function(members){
                        loadMembers(members, _config, _firebase_interface);
                    });
            }
            break;
        case "Unregistered Member":
            // Load public members table
			console.log("Unregistered member...");
            _firebase_interface.database.collection("members").orderBy("last_name").where("privacy", "==", "public").startAt('B').limit(9)
                .get().then( function(members){
                    loadMembers(members, _config, _firebase_interface);
            });
            break;
        case "Anonymous": 
		// Shouldn't get here based on lack of user object for firebase
		console.log("Anonymous viewer...");
        _firebase_interface.database.collection("members").orderBy("last_name").where("privacy", "==", "public").startAt('B').limit(9)
            .get().then( function(members){
                loadMembers(members, _config, _firebase_interface);
            });
            break;
        default:
            break;
    }
}

/* load members

    Parses a list of member objects and adds them to the page:
    1. For each UID in the snapshotValue...
    2. Parses the member's data object
    3. Creates an element from src/elements/members/member.html
    4. Appends it under .members-list
    5. Caches the snapshot under member_references
    6. Caches the dom references under member_dom_references
    7. Uses length information as well as config data to build a pagnation object
    8. Appends the pagnation object to #pagnation
    9. Defines what happens when the page is changed
    10. Adds the member ship count to #count
    
    @param snapshotValue (Object{}) - return from a member table in firebase, has key's of uid's
        and values of member data objects
    @param config (Object{}) - return from config_handler callback for this page
    @param fbi (Class firebase_interface) - return from firebase_interface initialization callback

    @returns None
*/
function loadMembers(snapshotValue, config, fbi, reload=false)
{
	
    // For backcompatability with the rest of this functionality, I'm just
    // going to convert the firestore query result into json that has the
    // same format as the old json that would have been returned from firebase
    var backCompat = {};
    var dataIndex = []
    // if there are old references, remove them
    if(_firebase_interface.readCache("member_references")){
		console.log("Prior elements exist in readCache");
        // Remove old elements
		/*
		// Have to remove for now KG
        doms = _firebase_interface.readCache("member_dom_references");
        doms.forEach(function(dom){
            var obj = jQuery(dom);
            obj.remove();
        })
		*/
		
    }
	
    if(!reload) 
    {
		if(snapshotValue.docs.length == 0){
			console.log("No results returned");
		}
		last_read_doc = snapshotValue.docs[snapshotValue.docs.length - 1];
		
        snapshotValue.forEach(function(doc) {
            // doc.data() is never undefined for query doc snapshots
            data = doc.data();
            backCompat[doc.id] = doc.data();
            data["docID"] = doc.id;
            dataIndex.push(data);
			//console.log(data);
        });
        snapshotValue = backCompat;
        _firebase_interface.writeCache("member_data", dataIndex);

        // Cache a copy of snapshotValue (slice creates a copy) as we'll be modifiying it below
        // and we'll want this data again when loading is complete in callbacks
        fbi.writeCache("member_references", snapshotValue);
    }else{
        snapshotValue.forEach(function(data){                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
            backCompat[data.docID] = data;
        })
        snapshotValue = backCompat;
    }
	

    /* loadMembersEntry
        Entry point for load members control flow
        @param callback (pointer) - next function to run in control flow.     
    */
    function loadMembersEntry(callback)
    {
        // list of UID's returned in the member snapshot
        var member_uids = Object.keys(snapshotValue);
        // Filter out dummy
        member_uids = member_uids.filter(e => e !== "dummy");
        // array of jquery objects containing the members that will be parsed soon
        var member_dom_references = []

        /* injectMemberElement
            Function callback for elementHandler, defines how to handle the created DOM string
            @param memberDomString (String) - string contained the resolved element from src/elements/members/member.hmtl
        */
        var injectMemberElement = function(memberDomString)
        {
            // Build jquery object
            var memObj = $.parseHTML(memberDomString);
            // add to page
			$( "#members-list" ).append( memObj );
            //$( "#members-list" ).append( memberDomString );
			//console.log(memberDomString);
            // store refernce to object
            member_dom_references.push( memObj );

            // If all uid's have been parsed, execute callback
            if ( member_dom_references.length == member_uids.length ){
				if ($(window).width() <= 550) {$('.card').css('min-height','0px');}
				$( window ).resize(function() {if ($(window).width() <= 550) {$('.card').css('min-height','0px');}else{$('.card').css('min-height','360px')}});
				console.log('Parse LinkedIn badges...');
				IN.parse();
				scroll_done=true;
                // add dom references to data cache in firebase interface
                fbi.writeCache("member_dom_references", member_dom_references);
            }
        };

        // Iterate over snapshotValue for each member by uid
        for(var i = 0; i < member_uids.length; i ++)
        {
            // Grab required objects from snapshot
            var uid = member_uids[i]
            // Get member data from snapshot
            var member = snapshotValue[uid];
            //console.log(member);
            
            // Build argument's for memberElement
            var args = {
                public_uid : uid,
                firstName : member.first_name,
                lastName : member.last_name,
                currentAddress : getLocationString(member.current_address),
				industry : member.industry,
				hometown : getLocationString(member.hometown_address),
				linkedin_profile : member.linkedin_profile
            }
            // Build element and inject
			if(member.linkedin_profile && member.linkedin_profile.length > 30){
            new elementHandler("src/elements/members/member.html", args, injectMemberElement);
			console.log(member.first_name + "  -  " + member.linkedin_profile + "  -  " + uid);	
			}
			else{
            new elementHandler("src/elements/members/memberNoLinkedIn.html", args, injectMemberElement);
			console.log(member.first_name + "  -  No LinkedIn  -  " + uid);
			}
        }
    } // end loadMembersEntry
	
	// trigger control flow with entry point and callback to next task in queue
	loadMembersEntry();

} // end loadMembers


/* Searching

*/

function memberSearch(){
	
	if(searchPressed && last_read_doc){
		if(formLocation['current_address'] == null){
			alert('Please enter a Current Location');
		}
		else if(formLocation['current_address']['locality']){
			console.log('Town entered');
			_firebase_interface.database.collection("members").orderBy('last_name').startAfter(last_read_doc).where("current_address.locality", "==", formLocation['current_address']['locality']).where("current_address.administrative_area_level_1", "==", formLocation['current_address']['administrative_area_level_1']).where("current_address.country", "==", formLocation['current_address']['country']).limit(_config.members_per_page)
		   .get().then( function(members){
			   console.log("Loaded members...");
			   loadMembers(members, _config, _firebase_interface);
		   });
		}
		else if(formLocation['current_address']['administrative_area_level_1']){
			console.log('Province/State entered');
			_firebase_interface.database.collection("members").orderBy('last_name').startAfter(last_read_doc).where("current_address.administrative_area_level_1", "==", formLocation['current_address']['administrative_area_level_1']).where("current_address.country", "==", formLocation['current_address']['country']).limit(_config.members_per_page)
		   .get().then( function(members){
			   console.log("Loaded members...");
			   loadMembers(members, _config, _firebase_interface);
		   });;
		}
		else if(formLocation['current_address']['country']){
			console.log('Country entered');
			_firebase_interface.database.collection("members").orderBy('last_name').startAfter(last_read_doc).where("current_address.country", "==", formLocation['current_address']['country']).limit(_config.members_per_page)
		   .get().then( function(members){
			   console.log("Loaded members...");
			   loadMembers(members, _config, _firebase_interface);
		   });
		}
		else{
			console.log('Error');
		}
	}
	else if(searchPressed){
		if(formLocation['current_address'] == null){
			alert('Please enter a Current Location');
		}
		else if(formLocation['current_address']['locality']){
			console.log('Town entered');
			_firebase_interface.database.collection("members").orderBy('last_name').where("current_address.locality", "==", formLocation['current_address']['locality']).where("current_address.administrative_area_level_1", "==", formLocation['current_address']['administrative_area_level_1']).where("current_address.country", "==", formLocation['current_address']['country']).startAfter(last_read_doc).limit(_config.members_per_page)
		   .get().then( function(members){
			   console.log("Loaded more members...");
			   loadMembers(members, _config, _firebase_interface);
		   });
		}
		else if(formLocation['current_address']['administrative_area_level_1']){
			console.log('Province/State entered');
			_firebase_interface.database.collection("members").orderBy('last_name').where("current_address.administrative_area_level_1", "==", formLocation['current_address']['administrative_area_level_1']).where("current_address.country", "==", formLocation['current_address']['country']).startAfter(last_read_doc).limit(_config.members_per_page)
		   .get().then( function(members){
			   console.log("Loaded more members...");
			   loadMembers(members, _config, _firebase_interface);
		   });;
		}
		else if(formLocation['current_address']['country']){
			console.log('Country entered');
			_firebase_interface.database.collection("members").orderBy('last_name').where("current_address.country", "==", formLocation['current_address']['country']).startAfter(last_read_doc).limit(_config.members_per_page)
		   .get().then( function(members){
			   console.log("Loaded more members...");
			   loadMembers(members, _config, _firebase_interface);
		   });
		}
		else{
			console.log('Error');
		}
	}
	else{
		_firebase_interface.database.collection("members").orderBy("last_name").startAfter(last_read_doc).limit(_config.members_per_page)
		.get().then( function(members){
		console.log("Loaded more members...");
		loadMembers(members, _config, _firebase_interface);
		});
	}
}

/* Build location string
    Concatonate the data in the location value from a member object
    into a formatted string
    @param locationObject (Object{}) - value from location field (Either past or current) from firebase
*/
function getLocationString(locationObject)
{
    // Initalize empty array to work with
    var location = [];

	if(locationObject.administrative_area_level_1 == "Newfoundland and Labrador"){
		// Append all required data to array
		location.push(locationObject.locality);
	}
	else if(locationObject.country == "Canada" || locationObject.country == "United States"){
		location.push(locationObject.locality, locationObject.administrative_area_level_1); 
	}
	else{
		location.push(locationObject.locality, locationObject.administrative_area_level_1, locationObject.country);
	}
	// Filter array for unwanted data, then join with ', ' to create a comma separated string from data
	return location.filter(e => e !== "" && e !== undefined).join(", "); 
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
          // Get place object from google api
          var place = autocomplete_current.getPlace();
          if(place){
              // iterate over object and look for the keys in locationData
              formLocation["current_address"] = {};
              for (var i = 0; i < place.address_components.length; i++) {
                  var addressType = place.address_components[i].types[0];
                  if (locationData.hasOwnProperty(addressType)) {
                      formLocation["current_address"][addressType] = place.address_components[i]["long_name"];;
                  }
              }
              // Store geometry into new member object as well
              formLocation["current_address"]["lat"] = place.geometry.location.lat();
              formLocation["current_address"]["lng"] = place.geometry.location.lng();
			  //console.log(formLocation);
          }
      }catch(err){
          console.log(err);
      }
  });

  // Second autocomplete callback, the repeated code kills me but im currently lazy
  // TODO: tear out the repeated code into a function above
  autocomplete_hometown.addListener('place_changed', function() {
      try{
          // Get place object from google api
          var place = autocomplete_hometown.getPlace();
          if(place){
              // iterate over object and look for the keys in locationData
              formLocation["hometown_address"] = {};

              for (var i = 0; i < place.address_components.length; i++) {
              var addressType = place.address_components[i].types[0];
                  if (locationData.hasOwnProperty(addressType) ){
                      formLocation["hometown_address"][addressType] = place.address_components[i]["long_name"];;
                  }
              }
              // Store geometry into new member object as well
              formLocation["hometown_address"]["lat"] = place.geometry.location.lat();
              formLocation["hometown_address"]["lng"] = place.geometry.location.lng();
			  console.log(formLocation);
          }
      }catch(err){
          console.log(err);
      }
  });
}