var TABLET_WIDTH = 768;
var COMPUTER_WIDTH = 1024;

var rootRef = firebase.database().ref();
var obj;

window.onload = function(event) {
  checkWindowWidth();
  $("#user_controls_mobile").hide();
};

$(document).ready( function () {
});

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

bootcards.init( {
  offCanvasBackdrop : true,
  offCanvasHideOnMainClick : true,
  enableTabletPortraitMode : true,
  disableRubberBanding : true,
  disableBreakoutSelector : 'a.no-break-out'
});
