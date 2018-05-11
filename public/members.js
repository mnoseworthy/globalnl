/********************
* Interface reference
********************/
// Will hold a reference to the created firebase reference, giving access to
// the interface in our callback functions below.
var _firebase_interface;
var _config;

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
    // Generate navbar
    genNavbar();
    // Initialize config handler, this does nothing more than parse the config object
    // in the config handler file and return the object required for this page to the callback,
    // where the callback is just our namespace
    new configHandler( members_namespace, 'members' );
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

// toggle info window callback, this will be removed along with the profile pannel we think
function toggleInfoWindow(key) {
    if (! window.matchMedia("(min-width:900px)").matches) {
        if ($("#contactCard").is(":visible")) {
            $("#list").show();
            $("#contactCard").hide();
        } else {
            $("#contactCard").show();
            $("#list").hide();
        }
    } else {
        if ( $("#contactCard").is(":hidden") ) {
            $("#contactCard").show();
        }
    }
    if(key != "null") {
      setInfoWindowData(key);
    }
}

// set info window
function setInfoWindowData(uid) {
    // Read member object from firebase cache (Saved as members were loaded to page)
    var memberObject = _firebase_interface.readCache("member_references")[uid];
    // Set data fields in html
    $("#member_name").html(memberObject.first_name+' '+memberObject.last_name);
    $("#member_industry").html(memberObject.industry);
    $("#member_current_location").html(getLocationString(memberObject.current_address));
    $("#member_hometown").html(getLocationString(memberObject.hometown_address));
    $("#member_ambassador").html(memberObject.ambassador);
    // TODO This seems pretty rough and should be removed eventually
    if ($(window).width() <= 400) {
        // If mobile, add link to profile
        document.getElementById('linkedin_profile').innerHTML = '<a href="' + memberObject["linkedin_profile"] + '">' + memberObject["linkedin_profile"] + '<\/a>';
    } else {
        // If desktop, load the profile in-line or something?
        document.getElementById('linkedin_profile').innerHTML = '<script type="IN/MemberProfile" data-id="' + memberObject["linkedin_profile"] + '" data-format="inline" data-related="false"><\/script>';
        IN.parse(document.getElementById("linkedin_profile"));
    }
}
// Filter members ()
function filterMembers(input_id) {
    // Current UI states "search for Name, location or industry"

    // Load member references from cache
    if(input_id === "member_search")
    {
        // get search string
        searchFor = $("#member_search").val()
        member_data = _firebase_interface.readCache("member_data");
        
        // Sort by closest match to input
        member_data.sort( function(a, b){
            var aName = a.last_name 
            var bName = b.last_name
            x = levDist(searchFor , aName);
            y = levDist(searchFor , bName );
            //console.log("searchFor="+searchFor+" aName="+aName+" bName="+bName+" x="+x+" y="+y);
            if(x < y)
                return -1;
            else
                return 1; 
        } )
    }
    loadMembers(member_data, _config, _firebase_interface, true);

}
// Clear search filters
function unfilterMembers(input_id) {
    // Load member references from cache
    if(input_id === "member_search")
    {
       
        readDBforMembers();
        document.getElementById("member_search").value = "";

    }
}

/***************************************************  
* Preform any required global module initialization
****************************************************/
/* Initialize bootcards
*/
bootcards.init( {
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
        //console.log(fbi.userType);
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
                if( fbi.userObject.approved !== "Yes" ){
                    alert("Your account hasn't been approved yet by a moderator, you only have public access");
                }
                break;
            case "Unregistered Member":
                // Member never filled out registration form
                if (confirm("Account not fully registered, continue to registration form? If not your access will be limited.")) {
                    window.location.href = "registration.html";
                }
                break;
            case "Anonymous":
            default:
<<<<<<< HEAD
=======
                console.log("User type undefined? How did we get here ...");
                window.location.replace("index.html");
>>>>>>> 00af6e127fd22a2767d38441b73f70f58c9f858c
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
            if( _firebase_interface.userObject.approved == "Yes" ){
                // load members
                _firebase_interface.database.collection("members").orderBy("last_name").where("privacy", "==", "members")
                    .get().then( function(members){
                        loadMembers(members, _config, _firebase_interface);
                        $("#login_note").hide();
                        document.getElementById("dir_version").innerHTML = "Membership Directory";
                    });
            // if not approved...
            }else{
                // Load public members table
                // load members who've agreed to be viewable
                _firebase_interface.database.collection("members").orderBy("last_name").where("privacy", "==", "public")
                    .get().then( function(members){
                        loadMembers(members, _config, _firebase_interface);
                    });
            }
            break;
        case "Unregistered Member":
            // Load public members table
            _firebase_interface.database.collection("members").orderBy("last_name").where("privacy", "==", "public")
                .get().then( function(members){
                    loadMembers(members, _config, _firebase_interface);
            });
            break;
        case "Anonymous":
        _firebase_interface.database.collection("members").orderBy("last_name").where("privacy", "==", "public")
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
        // Remove old elements
        doms = _firebase_interface.readCache("member_dom_references");
        doms.forEach(function(dom){
            var obj = jQuery(dom);
            obj.remove();
        })
    }
    if(!reload) 
    {
        snapshotValue.forEach(function(doc) {
            // doc.data() is never undefined for query doc snapshots
            data = doc.data();
            backCompat[doc.id] = doc.data();
            data["docID"] = doc.id;
            dataIndex.push(data);
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
        isFirst = true;
        var injectMemberElement = function(memberDomString)
        {
            // Build jquery object
            var memObj = $.parseHTML(memberDomString);
            // add to page
            $( ".members-list" ).append( memObj );
            // hide if more than max loaded
            if ( member_dom_references.length > config.members_per_page )
                $( memObj ).hide();
            // store refernece to object
            member_dom_references.push( memObj );
            // If first element, trigger update to info window
            if ( isFirst ){
                // set flag
                isFirst = false;
                setInfoWindowData(member_uids[0]);      
            }
            // If all uid's have been parsed, execute callback
            if ( member_dom_references.length == member_uids.length ){
                callback(member_dom_references, finalizeLoading);
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
                currentAddress : getLocationString(member.current_address)
            }
            // Build element and inject
            new elementHandler("src/elements/members/member.html", args, injectMemberElement);
        }
    } // end loadMembersEntry

    /* buildPagnationObject
        @param member_dom_refernces (Array[]) - list of member dom referneces created
        @param callback (Function pointer) - next function in control flow 
    */
    function buildPagnationObject(member_dom_references, callback)
    {
        // Convert member_dom_references array into an object of page numbers
        // mapped to the members that are to be displayed on the page
        var pageNum = 0;
        var pages_of_members = [null];
        for ( var i = 0; i < member_dom_references.length; i++  )
        {
            // if i is a multiple of the number of members per page, start a new page
            if ( i % config.members_per_page === 0 ){
                pageNum ++;
                pages_of_members[pageNum] = [];
            }
            // Append object to page
            pages_of_members[pageNum].push( member_dom_references[i][0] );
        }
        callback(pages_of_members, member_dom_references.length);
    } // end buildPagnationObject

    /* finaliseLoading
        @param pages_of_members (Object) - member DOM referneces nested under page numbers
        @param numMembers - total number of DOM's created, i.e. the number of members loaded
    */
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
    } // end finalizeLoading

    // trigger control flow with entry point and callback to next task in queue
    loadMembersEntry(buildPagnationObject);

} // end loadMembers

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

/* Utilises the elementHandler class to generate the top-fixed navbar on the page
*/
function genNavbar()
{
    // This callback is given to the elementHandler constructor, it must do something with
    // the resolved element string
    var injectNav = function ( resolvedDOM )
    {
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

/*
    https://stackoverflow.com/questions/11919065/sort-an-array-by-the-levenshtein-distance-with-best-performance-in-javascript
*/
var levDist = function(s, t) {
    var d = []; //2d matrix

    // Step 1
    var n = s.length;
    var m = t.length;

    if (n == 0) return m;
    if (m == 0) return n;

    //Create an array of arrays in javascript (a descending loop is quicker)
    for (var i = n; i >= 0; i--) d[i] = [];

    // Step 2
    for (var i = n; i >= 0; i--) d[i][0] = i;
    for (var j = m; j >= 0; j--) d[0][j] = j;

    // Step 3
    for (var i = 1; i <= n; i++) {
        var s_i = s.charAt(i - 1);

        // Step 4
        for (var j = 1; j <= m; j++) {

            //Check the jagged ld total so far
            if (i == j && d[i][j] > 4) return n;

            var t_j = t.charAt(j - 1);
            var cost = (s_i == t_j) ? 0 : 1; // Step 5

            //Calculate the minimum
            var mi = d[i - 1][j] + 1;
            var b = d[i][j - 1] + 1;
            var c = d[i - 1][j - 1] + cost;

            if (b < mi) mi = b;
            if (c < mi) mi = c;

            d[i][j] = mi; // Step 6

            //Damerau transposition
            if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }

    // Step 7
    return d[n][m];
}