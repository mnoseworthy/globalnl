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
  }

  const navBar = {};

  navBar.toggle = function () {
    if ($(".navbar-toggler").css("display") !== "none") {
      $(".navbar-toggler").trigger("click");
    }
  }

  return {
    auth: auth,
    navBar: navBar
  };
}());
