// Temporary place to expose shared functions until the
// rest of the codebase has been moved into modules.
window.gnl = (function() {
  const auth = {};

  auth.loginLinkedIn = function() {
    window.open(
      "login.html",
      "targetWindow",
      "toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=585,height=600"
    );
  };

  auth.logout = function() {
    firebase
      .auth()
      .signOut()
      .then(
        function() {
          console.log("Signed Out");
        },
        function(error) {
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
  <li class="nav-item" id="linkedin_nav">
    <a class="nav-link" style="padding:8px 8px 0px 0px;" href="#">
      <span style="vertical-align:top; margin-top:5px;" class="fab fa-globalnl fa-linkedin-in"></span>
      <label class="switch">
        <input id="linkedin_toggle" checked type="checkbox">
        <span class="slider round"></span>
      </label>
    </a>
  </li>
  `;

  const loggedInUserBar = `
  <li class="nav-item" id="login_name_nav">
    <a class="nav-link" href="#"><span class="fas fa-globalnl fa-user"></span><span id="login_name"></span></a>
  </li>
  <li class="nav-item">
    <a class="nav-link" href="profile.html"><span class="fas fa-globalnl fa-edit"></span><span>Edit profile</span></a>
  </li>
  <li id="button_logout" class="nav-item">
    <a class="nav-link" href="#"><span class="fas fa-globalnl fa-sign-out-alt"></span><span>Logout</span></a>
  </li>
  `;

  auth.listenForStageChange = function(
    renderWithUser,
    renderWithoutUser,
    displayLinkedInToggle
  ) {
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        $("#userNavBar").html(
          displayLinkedInToggle
            ? linkedInToggleUserBar + loggedInUserBar
            : loggedInUserBar
        );
        $("#loginPage").hide();

        // Load user information at top of page for desktop
        $("#login_name").html(user.displayName);
        $("#button_logout").click(function(evt) {
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
        $("#loginPage").show();

        if (renderWithoutUser) {
          renderWithoutUser(user);
        }
      }
    });
  };

  const navBar = {};

  navBar.toggle = function() {
    if ($(".navbar-toggler").css("display") !== "none") {
      $(".navbar-toggler").trigger("click");
    }
  };

  return {
    auth: auth,
    navBar: navBar
  };
})();
