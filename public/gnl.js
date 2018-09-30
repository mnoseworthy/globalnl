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

  return {
    auth: auth
  };
}());
