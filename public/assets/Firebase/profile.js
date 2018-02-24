var rootRef = firebase.database().ref();

// Firebase Auth
function initApp() {

  firebase.auth().onAuthStateChanged(function(user) {

    if (user) {
      // User is signed in.
      var displayName = user.displayName;
      var email = user.email;
      var emailVerified = user.emailVerified;
      var photoURL = user.photoURL;
      uid = user.uid;
      var phoneNumber = user.phoneNumber;
      var providerData = user.providerData;
      user.getIdToken().then(function(accessToken) {
        var account_details = JSON.stringify({
          displayName: displayName,
          email: email,
          emailVerified: emailVerified,
          phoneNumber: phoneNumber,
          photoURL: photoURL,
          uid: uid,
          accessToken: accessToken,
          providerData: providerData
        }, null, '  ');

        try {
          // Desktop
          var code = '<li class="dropdown">' +
                        '<a class="dropdown-toggle" data-toggle="dropdown" href="#"><span class="glyphicon glyphicon-user"></span>   ' +
                          displayName + '</a>' +
                        '<ul class="dropdown-menu">' +
                          '<li><a href="#">' + email + '</a></li>' +
                          '<li class="divider"></li>' +
                          '<li><a href="#" onclick="profile()">Edit Profile</a></li>' +
                          '<li><a href="#" onclick="logout()">Logout</a></li>' +
                        '</ul>' +
                      '</li>' +
                      '<li><a href="https://www.globalnl.com/"><i class="fa fa-home"></i> GlobalNL.com</a></li>';

          document.getElementById('login_name').innerHTML = code;

          // Mobile
          $("#user_controls_mobile").show();
          document.getElementById('login_name_mobile').innerHTML = '<a href="#"><span class="glyphicon glyphicon-user"></span>   ' + displayName + '</a>';

        } catch (e) {
          console.log(e);
        }

        rootRef.child("private/members/" + uid).once('value', function(snapshot) {
          obj = snapshot.val();

          if (obj == null) {
            // Member never filled out registration form
            if (confirm("Account not fully registered, continue to registration form? If not you access will be limited.")) {
              window.location.href = "registration.html";
            } else {
              //
            }
          } else {
            $("#first_name").val(obj["first_name"]);
            $("#last_name").val(obj["last_name"]);
            $("#email").val(obj["email"]);
            $("#linkedin_profile").val(obj["linkedin_profile"]);
            $("#industry").val(obj["industry"]);
            $("#status").val(obj["status"]);
          }

        }, function(error) {
          console.log(error);
        });

      });
    } else {

      // Not signed in
      window.location.href = "index.html";

    }
  }, function(error) {
    console.log(error);
  });
}

// Init auth on load web page
window.addEventListener('load', function() {
  initApp()
});

function profile() {
  window.location.href = "profile.html";
}

// Logout of current account
function logout() {
  firebase.auth().signOut().then(function() {
    console.log('Signed Out');
    window.location.href = "index.html";
  }, function(error) {
    console.error('Sign Out Error', error);
  });
}
