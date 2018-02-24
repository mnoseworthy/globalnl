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
              publicVersion();
            }
          } else {
            if (obj["approved"] == "Yes") {
              rootRef.child("shared/members").once('value', function(snapshot) {

                obj = snapshot.val();
                loadMembers(obj);
                $("#login_note").hide();
                document.getElementById("dir_version").innerHTML = "Membership Directory";

              }, function(error) {
                alert(error);
              });
            } else {
              alert("Your account is registered but is awaiting approval from a moderator. Your account access will be limited.");
              publicVersion();
            }
          }

        }, function(error) {
          console.log(error);
        });

      }); // end getIdToken callback
    } else {

      // Not signed in
      publicVersion();

    }
  }, function(error) {  // end onAuthStateChanged
    console.log(error);
  });
}

function publicVersion() {
  rootRef.child("public/members").once('value', function(snapshot) {
    obj = snapshot.val();
    loadMembers(obj);
  }, function(error) {
    alert(error);
  });
}

// Init auth on load web page
window.addEventListener('load', function() {
  initApp();
});

function profile() {
  console.log("Nav profile.html");
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
