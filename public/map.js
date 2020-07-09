/******************************************************
 * Global variables
 ******************************************************/

var _map;
var oms;
var infowindow;
var members = [];

/*****************************************************
 * Firestore
 ******************************************************/

const settings = { timestampsInSnapshots: true };
firebase.firestore().settings(settings);
var fbi = firebase.firestore().collection("members");
var uid;
var memberDocRef;

/*****************************************************
 * Register event callbacks & implement element callbacks
 ******************************************************/
// Init auth on load web page event
$(document).ready(function() {});

function renderWithUser(user) {
  if (!infowindow) {
    infowindow = new google.maps.InfoWindow();
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(position) {
          initMap2({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        function() {
          // location service error
          initMap2({ lat: 41.938, lng: -76.091697 });
        }
      );
    } else {
      initMap2({ lat: 41.938, lng: -76.091697 });
    }
  }

  $("#map").show();
  uid = user.uid;
  memberDocRef = firebase
    .firestore()
    .collection("members")
    .doc(uid);
  // Load user information at top of page for desktop
  $("#login_name").html(user.displayName);
  $("#button_logout").click(function(e) {
    // Cancel the default action
    e.preventDefault();
    gnl.auth.logout();
    gnl.navBar.toggle();
  });
  parseCords();
}

function renderWithoutUser() {
  $("#map").hide();
}

// Callback executed on page load
function initMap() {
  gnl.auth.listenForStageChange(renderWithUser, renderWithoutUser, false);
}

function initMap2(homepos) {
  _map = new google.maps.Map(document.getElementById("map"), {
    zoom: 7,
    center: homepos,
    streetViewControl: false
  });
  oms = new OverlappingMarkerSpiderfier(_map, {
    markersWontMove: true,
    markersWontHide: true,
    keepSpiderfied: true,
    basicFormatEvents: true
  });
  google.maps.event.addListener(_map, "bounds_changed", function(ev) {
    parseCords();
  });
}

function parseCords() {
  if (_map && uid) {
    var bounds = _map.getBounds();
    var ne = bounds.getNorthEast(); // LatLng of the north-east corner
    var sw = bounds.getSouthWest(); // LatLng of the south-west corder
    var neCorner = { lat: ne.lat(), lng: ne.lng() };
    var swCorner = { lat: sw.lat(), lng: sw.lng() };
    loadMembersOnMap(neCorner, swCorner);
  }
}

// Queries database for all members currently located within the coordinates
// and creates a pin on the map for each member
function loadMembersOnMap(ne, sw) {
  // Oddly enough, you can't filter over different fields... so we take whatever is
  // between the latitude lines and filter out the longitude locally
  fbi
    .where("current_address.lat", "<", ne.lat)
    .where("current_address.lat", ">", sw.lat)
    .get()
    .then(function(result) {
      result.forEach(function(doc) {
        if (!members.includes(doc.id) && doc.data().current_address.lat) {
          memberData = doc.data();
          var memLoc = {
            lat: memberData.current_address.lat,
            lng: memberData.current_address.lng
          };
          var name = memberData.first_name + " " + memberData.last_name;
          if (memLoc.lng < ne.lng && memLoc.lng > sw.lng) {
            members.push(doc.id);
            let currentTown = memberData.current_address
              ? memberData.current_address.locality || ""
              : "";
            let homeTown = memberData.hometown_address
              ? memberData.hometown_address.locality || ""
              : "";
            //This to make the member's profile name clickable, opening their LinkedIn profile
            var contentString = `<span class="fas fa-gnl-map fa-portrait"></span><b>${
              memberData.first_name
            } ${memberData.last_name}</b><br/>
<span class="fas fa-gnl-map fa-map-marker-alt"></span>${currentTown}<br/>					
<span class="fas fa-gnl-map fa-briefcase"></span>${memberData.industry}<br/>
<span class="fas fa-gnl-map fa-anchor"></span>${homeTown}<br/>
<span class="fab fa-gnl-map fa-linkedin-in"></span><a href="${memberData.linkedin_profile}" target="___blank">View LinkedIn Profile</a>`;
            var marker = new google.maps.Marker({
              position: memLoc,
              title: name,
              text: contentString
            });
            google.maps.event.addListener(marker, "spider_click", function(e) {
              // 'spider_click', not plain 'click'
              infowindow.setContent(marker.text);
              infowindow.open(_map, marker);
            });
            oms.addMarker(marker); // adds the marker to the spiderfier _and_ the map
          }
        }
      });
    });
}

// profile load callback
function profile() {
  console.log("Nav profile.html");
  window.location.href = "profile.html";
}
