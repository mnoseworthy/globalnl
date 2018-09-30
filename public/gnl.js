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

  auth.listenForStageChange = function (renderWithUser, renderWithoutUser) {
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        $("#userNavBar").html(loggedinUserBar);
        $("#loginPage").hide();

        // Load user information at top of page for desktop
        $("#login_name").html(user.displayName);
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
        $("#loginPage").show();

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

  return {
    auth: auth,
    navBar: navBar
  };
})();
