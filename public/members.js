
var TABLET_WIDTH = 768;
var COMPUTER_WIDTH = 1024;

//var rootRef = firebase.database().ref();
var obj;
var search_obj = {};
var first_string = '';
var last_string = '';
var max_pages = 3;
var members_per_page = 10;
var page_members = [];
var search_page_members = [];
var total_pages = 1;
var objArray = [];

window.onload = function(event) {
  checkWindowWidth();
  $("#user_controls_mobile").hide();
};

$(document).ready( function () {

  /*
  $("#member_search").on("keyup", function() {
    var value = $(this).val().toLowerCase();
    $("#members-list *").filter(function() {
      $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
    });
  });
  */

});

function loadMembers(obj) {

  if ($(window).width() >= 1024) {
    first_string = 'First';
    last_string = 'Last';
    if ($(window).width() >= 1440) {
      max_pages = 5;
    }
  } else {
    members_per_page = 20;
  }

  var members = "";
  var first_key = "";

  Object.keys(obj).forEach(function(key) {
    if (key != "dummy") {
      obj[key]["public_uid"] = key;
      objArray.push(obj[key]);
    }
  });

  total_pages = Math.ceil(objArray.length / members_per_page);

  objArray.sort(function(a, b) {
      var textA = a["last_name"].toUpperCase();
      var textB = b["last_name"].toUpperCase();
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
  });

  var k = 0;
  var pageArray = [];

  for (var i = 0; i < objArray.length; i++) {

    members = members + '<div id=\'' + objArray[i]["public_uid"] + '\'>';
    members = members + '<a class="list-group-item" onclick="toggleInfoWindow(\'' + objArray[i]["public_uid"] + '\');" href="#">';
    members = members + '<h4 class="list-group-item-heading">' + objArray[i]["first_name"] + ' ' + objArray[i]["last_name"] + '</h4>';
    members = members + '<p class="list-group-item-text">'+ getLocationString(objArray[i]["current_address"]) + '</p></a>';
    members = members + '</div>';

    search_obj[objArray[i]["public_uid"]] = objArray[i]["first_name"] + ' ' + objArray[i]["last_name"] + ' ' + getLocationString(objArray[i]["current_address"]) +
      ' ' + getLocationString(objArray[i]["hometown_address"]) + ' ' + objArray[i]["industry"];

    pageArray.push(objArray[i]["public_uid"]);
    k = k + 1;
    if (k >= members_per_page) {
      page_members.push(pageArray);
      k = 0;
      pageArray = [];
    }

  }

  if (k != 0) {
    page_members.push(pageArray);
  }

  $( ".members-list" ).append( members );
  for (var i = 10; i < objArray.length; i++) {
    $("#" + objArray[i]["public_uid"]).hide();
  }

  setInfoWindowData(objArray[0]["public_uid"]);

  document.getElementById("count").innerHTML = "Membership Count: " + objArray.length;

  makePageNav(total_pages, page_members);

}

function makePageNav(pages, members) {
  $('#pagination').twbsPagination('destroy');
  $('#pagination').twbsPagination({
      totalPages: pages,
      visiblePages: max_pages,
      prev: 'Prev',
      first: first_string,
      last: last_string,
      onPageClick: function (event, page) {
        for (var i = 0; i < objArray.length; i++) {
          $("#" + objArray[i]["public_uid"]).hide();
        }
        for (var i = 0; i < members[page-1].length; i++) {
            $("#" + members[page-1][i]).show();
        }
      }
  });
}

function toggleInfoWindow(key) {
  if ($(window).width() < TABLET_WIDTH) {
    if ($("#contactCard").is(":visible")) {
      $("#list").show();
      $("#contactCard").hide();
    } else {
      $("#contactCard").show();
      $("#list").hide();
    }
  }

  if(key != "null") {
    setInfoWindowData(key);
  }

}

function setInfoWindowData(key) {

  var name = obj[key]["first_name"] + ' ' + obj[key]["last_name"];
  $("#member_name").html(name);
  $("#member_industry").html(obj[key]["industry"]);

  $("#member_current_location").html(getLocationString(obj[key]["current_address"]));
  $("#member_hometown").html(getLocationString(obj[key]["hometown_address"]));

  if ($(window).width() <= 400) {
    document.getElementById('linkedin_profile').innerHTML = '<a href="' + obj[key]["linkedin_profile"] + '">' + obj[key]["linkedin_profile"] + '<\/a>';
  } else {
    document.getElementById('linkedin_profile').innerHTML = '<script type="IN/MemberProfile" data-id="' + obj[key]["linkedin_profile"] + '" data-format="inline" data-related="false"><\/script>';
  }

  $("#member_ambassador").html(obj[key]["ambassador"]);
  IN.parse(document.getElementById("linkedin_profile"));

}

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

function filterMembers(input_id) {
  var input = $("#" + input_id).val().toLowerCase();
  input = input.replace(",", "");

  var k = 0;
  search_page_members = [];
  var searchMemberArray = [];
  Object.keys(search_obj).forEach(function(key) {
    if (search_obj[key].toLowerCase().indexOf(input) != -1) {
      searchMemberArray.push(key);
      k = k + 1;
      if (k >= members_per_page) {
        k = 0;
        search_page_members.push(searchMemberArray);
        searchMemberArray = [];
      }
    }
  });

  if (k != 0) {
    search_page_members.push(searchMemberArray);
  }

  for (var i = 0; i < objArray.length; i++) {
    $("#" + objArray[i]["public_uid"]).hide();
  }

  search_pages = search_page_members.length;
  makePageNav(search_pages, search_page_members);

}

function unfilterMembers(input_id) {
  Object.keys(search_obj).forEach(function(key) {
    $("#" + key).show();
  });
  $("#" + input_id).val("");
  makePageNav(total_pages, page_members);
}

// Get Location String
function getLocationString(obj) {
  var loc = "";
  if("locality" in obj && obj["locality"] != "") {
    loc = obj["locality"];
  }
  if ("administrative_area_level_1" in obj && obj["administrative_area_level_1"] != "") {
    if (loc != "") {
      loc = loc + ", " + obj["administrative_area_level_1"];
    } else {
      loc = obj["administrative_area_level_1"];
    }
  }
  if ("country" in obj && obj["country"] != "") {
    if (loc != "") {
      loc = loc + ", " + obj["country"];
    } else {
      loc = obj["country"];
    }
  }
  return loc;
}

bootcards.init( {
  offCanvasBackdrop : true,
  offCanvasHideOnMainClick : true,
  enableTabletPortraitMode : true,
  disableRubberBanding : true,
  disableBreakoutSelector : 'a.no-break-out'
});
