// Temporary place to expose shared functions until the
// rest of the codebase has been moved into modules.
window.gnl = (function () {
  const auth = {};

  auth.loginLinkedIn = function () {
    window.open(
      "login.html",
      "targetWindow",
      "toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=585,height=600"
    );
  };

  auth.logout = function () {
    firebase
      .auth()
      .signOut()
      .then(
        function () {
          console.log("Signed Out");
        },
        function (error) {
          console.error("Sign Out Error", error);
        }
      );
  };

  const defaultUserBar = `
  <li class="nav-item">
    <a class="nav-link" href="#" onClick="gnl.auth.loginLinkedIn();gnl.navBar.toggle();return false;">
      <span class="fas fa-globalnl fa-user"></span>
      <span>Sign in</span>
    </a>
  </li>
  `;

  const linkedInToggleUserBar = `
  <li id="adminEditToggle" class="nav-item">
    <div class="dropdown">
      <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        Admin Tools
      </button>
      <div class="dropdown-menu" aria-labelledby="dropdownMenuButton" style="background-color: grey;">
        <a class="nav-link">
          <span style="vertical-align:top; margin-top:5px;" class="fas fa-globalnl fa-edit"></span>
          <label class="switch">
            <input id="adminToggleState" type="checkbox">
            <span class="slider round"></span>
          </label>
        </a>
        <a class="nav-link" href="database.html"><span class="fas fa-globalnl fa-table"></span><span>Database</span></a>
        <button class="btn btn-primary" style="margin: 0.5rem;" onclick="loadActiveMembers();">Recently Active</button>
      </div>
    </div>
  </li>
  `;

  const loggedInUserBar = `
  <li class="nav-item" id="login_name_nav">
    <a class="nav-link" href="#">
    <span class="fas fa-globalnl">
      <img id="user_photo" class="gnl-user-photo">
    </span>
    <span id="login_name"></span></a>
  </li>
  <li class="nav-item">
    <a class="nav-link" href="profile.html" onclick="adminUidReset();"><span class="fas fa-globalnl fa-user-edit"></span><span>Edit profile</span></a>
  </li>
  <li id="button_logout" class="nav-item">
    <a class="nav-link" href="#"><span class="fas fa-globalnl fa-sign-out-alt"></span><span>Logout</span></a>
  </li>
  `;

  auth.listenForStageChange = function (
    renderWithUser,
    renderWithoutUser,
    displayLinkedInToggle
  ) {
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        $("#userNavBar").html(
          displayLinkedInToggle ?
          linkedInToggleUserBar + loggedInUserBar :
          loggedInUserBar
        );
        $("#loginPage").hide();

        // Load user information at top of page for desktop
        $("#login_name").html(user.displayName);
        $("#user_photo").attr("src", user.photoURL);
        $("#button_logout").click(function (evt) {
          // Cancel the default action
          evt.preventDefault();
          gnl.auth.logout();
          gnl.navBar.toggle();
        });

        if (renderWithUser) {
          renderWithUser(user);
        }
      } else {
        $("#userNavBar").html(defaultUserBar);
        if (navigator.userAgent.indexOf('gonative') > -1) { // for the mobile app
          $("#loginPage").hide(); // hide login page since we load the member list for not signed in mobile app users
        } else {
          $("#loginPage").show();
        }

        if (renderWithoutUser) {
          renderWithoutUser(user);
        }
      }
    });
  };

  const navBar = {};

  navBar.toggle = function () {
    if ($(".navbar-toggler").css("display") !== "none") {
      $(".navbar-toggler").trigger("click");
    }
  };

  const location = {};

  location.bindAutocomplete = function (
    form,
    autocompleteId,
    fieldName,
    includeShortNames,
    getFormAddress
  ) {
    // Register our autocomplete elements, see URL for more information
    // https://developers.google.com/maps/documentation/javascript/examples/places-autocomplete-addressform
    const autocomplete = new google.maps.places.Autocomplete(
      document.getElementById(autocompleteId), {
        types: ["geocode"]
      }
    );
    autocomplete.addListener("place_changed", function () {
      try {
        // Get place object from google api
        const place = autocomplete.getPlace();
        if (place) {
          form[fieldName] = parsePlace(place, includeShortNames);
          // Optionally include form address
          if (getFormAddress) {
            form["form_address"] = getFormAddress();
          }
        }
      } catch (err) {
        console.log(err);
      }
    });
  };

  // Iterate over object and look for the keys in locationData
  function parsePlace(place, includeShortNames) {
    // Look for these keys in the place object returned by google API
    // if found, their values are filled and written to our new member object
    const locationData = {
      street_number: true,
      route: true,
      locality: true,
      administrative_area_level_1: true,
      country: true,
      postal_code: true
    };

    const parsed = {
      administrative_area_level_1: null,
      country: null,
      locality: null,
      lat: null,
      lng: null,
      postal_code: null
    };

    if (includeShortNames) {
      parsed.administrative_area_level_1 = null;
      parsed.country_short = null;
      parsed.locality_short = null;
    }

    for (let i = 0; i < place.address_components.length; i++) {
      const addressComponent = place.address_components[i];
      const addressType = addressComponent.types[0];
      if (locationData.hasOwnProperty(addressType)) {
        parsed[addressType] = addressComponent["long_name"];

        if (includeShortNames) {
          parsed[addressType + "_short"] = addressComponent["short_name"];
        }
      }
    }

    // Store geometry into new member object as well
    parsed.lat = place.geometry.location.lat();
    parsed.lng = place.geometry.location.lng();

    return parsed;
  }

  return {
    auth: auth,
    navBar: navBar,
    location: location
  };
})();

// Allows an admin to get to their own profile after editing others
function adminUidReset() {
  sessionStorage.removeItem("uid");
}





function toggleSignIn() {

  if (!firebase.auth().currentUser) {
    var provider = new firebase.auth.OAuthProvider('apple.com');

    provider.addScope('email');
    provider.addScope('name');

    firebase
      .auth()
      .signInWithPopup(provider)
      .then(function (result) {
        // The signed-in user info.
        var user = result.user;

        // You can also get the Apple OAuth Access and ID Tokens.
        var accessToken = result.credential.accessToken;
        var idToken = result.credential.idToken;
        const appleEmail = user.email;
        const appleUid = "01AP_" + user.uid;
        console.log(appleEmail, appleUid);

      })
      .catch(function (error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;

        if (
          errorCode === 'auth/account-exists-with-different-credential'
        ) {
          alert(
            'You have already signed up with a different auth provider for that email.'
          );
          // If you are using multiple auth providers on your app you should handle linking
          // the user's accounts here.
        } else {
          console.error(error);
        }
      });
  } else {
    firebase.auth().signOut();
  }
}

/**
 * initApp handles setting up UI event listeners and registering Firebase auth listeners:
 *  - firebase.auth().onAuthStateChanged: This listener is called when the user is signed in or
 *    out, and that is where we update the UI.
 */


function GoogleLogin() {
  let provider = new firebase.auth.GoogleAuthProvider();
  console.log('Login Btn Call')
  firebase.auth().signInWithPopup(provider).then(res => {
    console.log(res.user);
    const googleUser = res.user;
    const googleEmail = res.user.email;
    const googleUid = "02GO_" + res.user.uid;

/*     function checkGooUserEmail() {
      // checking if a user's email exists in the firestore database
      const query = db.collection('private_data').where('email', '==', googleEmail);
      query.get()
        .then((querySnapshot) => {
          if (querySnapshot.docs.length > 0) {
            console.log("The user's Google email already in the database " + googleEmail);
          } else if (querySnapshot.docs.length <= 0) {
            console.log("user's Google email doesn't exist")
            db.collection('private_data').doc(googleUid).set({
              email: googleEmail
            }, {
              merge: true
            });
            console.log("user is added");
          }
        })
    }
 */

    console.log(googleEmail, googleUid)

  }).catch(e => {
    console.log(e)
  })
}