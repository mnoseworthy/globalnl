/*****************************************************  
* Register event callbacks & implement element callbacks
******************************************************/
// Init auth on load web page event
window.addEventListener('load', function() {
    initApp();
});
// Callback executed on page load
function initApp()
{
    // Initialize config handler, this does nothing more than parse the config object
    // in the config handler file and return the object required for this page to the callback,
    // where the callback is just our namespace
    new configHandler( members_namespace, 'members' );
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
// toggle info window callback
function toggleInfoWindow(key) {
    if ($(window).width() < TABLET_WIDTH) {
      if ($("#contactCard").is(":visible")) {
        $("#list").show();
        $("#contactCard").hide();
      } else {
        $("#contactCard").show();
        $("#list").hide();
      }
    }
  
    if(key != "null") {
      setInfoWindowData(key);
    }
}
// Filter members ()
function filterMembers(input_id) {
    console.log("Implement");
}
// Clear search filters
function unfilterMembers(input_id) {
    console.log("Implement");
}

/***************************************************  
* Preform any required global module initialization
****************************************************/
bootcards.init( {
    offCanvasBackdrop : true,
    offCanvasHideOnMainClick : true,
    enableTabletPortraitMode : true,
    disableRubberBanding : true,
    disableBreakoutSelector : 'a.no-break-out'
});

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

        // Switch based on user type
        switch ( fbi.userType ) 
        {
            case "Moderator":
            case "Member":
                // Load user information at top of page for desktop
                var injectElement = function(domString) {
                    document.getElementById('login_name').innerHTML = domString;
                }
                var args = { displayName:fbi.userObject.displayName, email:fbi.userObject.email };
                new elementHandler("src/elements/login_name.html", args, injectElement);
                // Load user information for mobile
                injectElement = function(domString) {
                    $("#user_controls_mobile").show();
                    document.getElementById('login_name_mobile').innerHTML = domString;
                }
                args = { displayName:fbi.userObject.displayName };
                new elementHandler("src/elements/login_name_mobile.html", args, injectElement);

                // Check for approval status
                if( fbi.userObject.approved == "Yes" ){
                    // load members who've agreed to be viewable
                    fbi.getSnapshot("shared/members", function(members){
                        loadMembers(members, config);
                        $("#login_note").hide();
                        document.getElementById("dir_version").innerHTML = "Membership Directory";
                    })
                // if not approved...
                }else{
                    alert("Your account hasn't been approved yet by a moderator, you only have public access");
                    // Load public members table
                    fbi.getSnapshot("public/members", function(members){
                        loadMembers(members, config);
                    });
                }
                break;
            case "Unregistered Member":
                // Member never filled out registration form
                if (confirm("Account not fully registered, continue to registration form? If not you access will be limited.")) {
                    window.location.href = "registration.html";
                } else {
                    // Load public members table
                    fbi.getSnapshot("public/members", function(members) {
                        loadMembers(members, config);
                    });
                }
                break;
            case "Anonymous":
                console.log("Can an anonymous viewer get here?");
                fbi.getSnapshot("public/members", function(members) {
                    loadMembers(members, config);
                });
                break;

            default:
                console.log("User type undefined? How did we get here ...");
                return false;
        }

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
    new firebase_interface(config.firebase.config, firebaseLoaded);
};

/*****************************************************
* Utility Functions, only referenced in this file
*****************************************************/

var TABLET_WIDTH = 768;
var COMPUTER_WIDTH = 1024;

// unused var rootRef = firebase.database().ref();
// unused ?var obj;
//  unused var search_obj = {};
// Either "First" or "" ... var first_string = '';
// Either "Last" or "" ...var last_string = '';
// moved var max_pages = 3;
// moved var members_per_page = 10;
// only used in loadMembers, moved there... var page_members = [];
// unused var search_page_members = [];
// only used in loadMembers, moved there... var total_pages = 1;
// moved var objArray = [];

function loadMembers(snapshotValue, config)
{
    // Entry point to loadMembers control flow   
    function loadMembers(callback)
    {
        // list of UID's returned in the member snapshot
        var member_uids = Object.keys(snapshotValue);
        // Filter out dummy
        member_uids = member_uids.filter(e => e !== "dummy");
        // array of jquery objects containing the members that will be parsed soon
        var member_references = []

        // Define inject rule
        var injectMemberElement = function(memberDomString)
        {
            // Build jquery object
            var memObj = $.parseHTML(memberDomString);
            // add to page
            $( ".members-list" ).append( memObj );
            // hide if more than max loaded
            if ( member_references.length > config.members_per_page )
                $( memObj ).hide();
            // store refernece to object
            member_references.push( memObj );
            
            // If all uid's have been parsed, execute callback
            if ( member_references.length == member_uids.length )
                callback(member_references, finalizeLoading);
        };

        // Iterate over snapshotValue for each member by uid
        for(var i = 0; i < member_uids.length; i ++)
        {
            // Grab required objects from snapshot
            var uid = member_uids[i]
            // Get member data from snapshot
            var member = snapshotValue[uid];
            // parse location string
            var location = [];
            location.push(member.current_address.locality, member.current_address.administrative_area_level_1, member.country);
            location = location.filter(e => e !== "" && e !== undefined).join(", ");  // remove undefined or empty elements then join with commas

            // Build argument's for memberElement
            var args = {
                public_uid : uid,
                firstName : member.first_name,
                lastName : member.last_name,
                currentAddress : location
            }
            // Build element and inject
            new elementHandler("src/elements/members/member.html", args, injectMemberElement);
        }
    }
    function buildPagnationObject(member_references, callback)
    {
        // Convert member_references array into an object of page numbers
        // mapped to the members that are to be displayed on the page
        var pageNum = 0;
        var pages_of_members = [null];
        for ( var i = 0; i < member_references.length; i++  )
        {
            // if i is a multiple of the number of members per page, start a new page
            if ( i % config.members_per_page === 0 ){
                pageNum ++;
                pages_of_members[pageNum] = [];
            }
            // Append object to page
            pages_of_members[pageNum].push( member_references[i][0] );
        }
        callback(pages_of_members, member_references.length);
    }

    function finalizeLoading(pages_of_members, numMembers)
    {
        // Load pagnation
        $('#pagination').twbsPagination('destroy');
        var currentPage = 1;
        $('#pagination').twbsPagination({
            totalPages: pages_of_members.length,
            visiblePages: config.max_pages,
            prev: 'Prev',
            first: "First",
            last: "Last",
            onPageClick: function (event, page) {
                // get current page/*
                // iterate over current page references and hide them
                for (var i = 0; i < pages_of_members[currentPage].length; i ++)
                {
                    $( pages_of_members[currentPage][i] ).hide();
                }
                // Iterate over next page and reveal them
                for (var i = 0; i < pages_of_members[page].length; i++)
                {
                    $( pages_of_members[page][i] ).show();
                }
                // Update current page
                currentPage = page;
            }
        });

        // Populate some elements with info about the loading we just did
        //setInfoWindowData(objArray[0]["public_uid"]);

        document.getElementById("count").innerHTML = "Membership Count: " + numMembers;
        // create the navigation based on the page metrics
        //makePageNav(total_pages, page_members, objArray);
        return true;
    }

    loadMembers(buildPagnationObject);


} // end loadMembers

// make page nav
/*
function makePageNav(pages, members, objArray) {
    $('#pagination').twbsPagination('destroy');
    $('#pagination').twbsPagination({
        totalPages: pages,
        visiblePages: max_pages,
        prev: 'Prev',
        first: first_string,
        last: last_string,
        onPageClick: function (event, page) {
          for (var i = 0; i < objArray.length; i++) {
            $("#" + objArray[i]["public_uid"]).hide();
          }
          for (var i = 0; i < members[page-1].length; i++) {
              $("#" + members[page-1][i]).show();
          }
        }
    });
}
*/
// set info window data
/*
function setInfoWindowData(key) {

    var name = obj[key]["first_name"] + ' ' + obj[key]["last_name"];
    $("#member_name").html(name);
    $("#member_industry").html(obj[key]["industry"]);
  
    $("#member_current_location").html(getLocationString(obj[key]["current_address"]));
    $("#member_hometown").html(getLocationString(obj[key]["hometown_address"]));
  
    if ($(window).width() <= 400) {
      document.getElementById('linkedin_profile').innerHTML = '<a href="' + obj[key]["linkedin_profile"] + '">' + obj[key]["linkedin_profile"] + '<\/a>';
    } else {
      document.getElementById('linkedin_profile').innerHTML = '<script type="IN/MemberProfile" data-id="' + obj[key]["linkedin_profile"] + '" data-format="inline" data-related="false"><\/script>';
    }
  
    $("#member_ambassador").html(obj[key]["ambassador"]);
    IN.parse(document.getElementById("linkedin_profile"));
  
}
*/
// check window width
/*
function checkWindowWidth() {
    if ($(window).width() < COMPUTER_WIDTH) {
      $("#list").show();
      if ($(window).width() < TABLET_WIDTH) {
        $("#contactCard").hide();
      }
      $("<link/>", {
         rel: "stylesheet",
         type: "text/css",
         href: "https://cdnjs.cloudflare.com/ajax/libs/bootcards/1.1.2/css/bootcards-android.min.css"
      }).appendTo("head");
    } else {
      $("#list").show();
      $("#contactCard").show();
      $("<link/>", {
         rel: "stylesheet",
         type: "text/css",
         href: "https://cdnjs.cloudflare.com/ajax/libs/bootcards/1.1.2/css/bootcards-desktop.min.css"
      }).appendTo("head");
    }
}
*/
// Get Location String
/*
function getLocationString(obj) {
    var loc = "";
    if("locality" in obj && obj["locality"] != "") {
      loc = obj["locality"];
    }
    if ("administrative_area_level_1" in obj && obj["administrative_area_level_1"] != "") {
      if (loc != "") {
        loc = loc + ", " + obj["administrative_area_level_1"];
      } else {
        loc = obj["administrative_area_level_1"];
      }
    }
    if ("country" in obj && obj["country"] != "") {
      if (loc != "") {
        loc = loc + ", " + obj["country"];
      } else {
        loc = obj["country"];
      }
    }
    return loc;
}
*/