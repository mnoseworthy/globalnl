
var wait_counter = 0;

$(document).ready( function () {
  $('[data-toggle="popover"]').popover();
});

function loadDatabase() {

  var members_private_table = $('#members_private_table').DataTable( {
      data: members_private_table_data,
      responsive: true,
      select: true,
      "pageLength": 100,
      dom: "<'row'<'col-sm-6'B><'col-sm-6'f>>" +
           "<'row'<'col-sm-12'tr>>" +
           "<'row'<'col-sm-3'l><'col-sm-3'i><'col-sm-6'p>>",
      buttons: [{
                  text: 'Approve',
                  action: function () {
                    if(members_private_table.rows( { selected: true } ).count() != 0) {
                      var count = members_private_table.rows( { selected: true } ).count();
                      var members = members_private_table.rows( { selected: true } ).data().toArray();
                      if (confirm("Are you sure you want to approve " + count + " member(s)?")) {
                        approveMembers(members);
                      }
                    }
                  }
                },
                {
                  text: 'View/Edit',
                  action: function () {
                    if(members_private_table.rows( { selected: true } ).count() != 0) {
                      var count = members_private_table.rows( { selected: true } ).count();
                      var members = members_private_table.rows( { selected: true } ).data().toArray();
                      $("#membersPrivateModal").modal();
                      setPrivateMemberInfo(members[0]);
                    }
                  }
                },
                {
                  text: 'Delete',
                  action: function () {
                    if(members_private_table.rows( { selected: true } ).count() != 0) {
                      var count = members_private_table.rows( { selected: true } ).count();
                      var members = members_private_table.rows( { selected: true } ).data().toArray();
                      if (confirm("Are you sure you want to delete " + count + " member(s) private and public data?")) {
                        deletePrivateMembers(members);
                      }
                    }
                  }
                },
                {
                  text: 'Export',
                  action: function () {
                    exportMembersPrivateDatabase();
                  }
                }
              ]
  });

  var members_shared_table = $('#members_shared_table').DataTable( {
      data: members_shared_table_data,
      responsive: true,
      select: true,
      "pageLength": 100,
      dom: "<'row'<'col-sm-6'B><'col-sm-6'f>>" +
           "<'row'<'col-sm-12'tr>>" +
           "<'row'<'col-sm-3'l><'col-sm-3'i><'col-sm-6'p>>",
      buttons: [{
                  text: 'Delete',
                  action: function () {
                    if(members_shared_table.rows( { selected: true } ).count() != 0) {
                      var members = members_public_table.rows( { selected: true } ).data().toArray();
                      var count = members_public_table.rows( { selected: true } ).count();
                      if (confirm("Are you sure you want to delete " + count + " member(s) public data?")) {
                        //deletePublicMembers(members);
                      }
                    }
                  }
                },
                {
                  extend: 'excel',
                  title: 'Global NL Members Shared Database',
                  filename: 'GlobalNL_Members_Shared_Database',
                  text: 'Export Excel',
                }
              ]
  });

  var members_public_table = $('#members_public_table').DataTable( {
      data: members_public_table_data,
      responsive: true,
      select: true,
      "pageLength": 100,
      dom: "<'row'<'col-sm-6'B><'col-sm-6'f>>" +
           "<'row'<'col-sm-12'tr>>" +
           "<'row'<'col-sm-3'l><'col-sm-3'i><'col-sm-6'p>>",
      buttons: [{
                  text: 'Delete',
                  action: function () {
                    if(members_public_table.rows( { selected: true } ).count() != 0) {
                      var members = members_public_table.rows( { selected: true } ).data().toArray();
                      var count = members_public_table.rows( { selected: true } ).count();
                      if (confirm("Are you sure you want to delete " + count + " member(s) public data?")) {
                        deletePublicMembers(members);
                      }
                    }
                  }
                },
                {
                  extend: 'excel',
                  title: 'Global NL Members Public Database',
                  filename: 'GlobalNL_Members_Public_Database',
                  text: 'Export Excel',
                }
              ]
  });

  var mod_table = $('#mod_table').DataTable( {
      data: mod_table_data,
      responsive: true,
      select: true,
      "pageLength": 100,
      dom: "<'row'<'col-sm-6'B><'col-sm-6'f>>" +
           "<'row'<'col-sm-12'tr>>" +
           "<'row'<'col-sm-3'l><'col-sm-3'i><'col-sm-6'p>>",
      buttons: [{
                  text: 'Add',
                  action: function () {
                    $("#modModal").modal();
                  }
                },
                {
                  text: 'Delete',
                  action: function () {
                    if(mod_table.rows( { selected: true } ).count() != 0) {
                      var members = mod_table.rows( { selected: true } ).data().toArray();
                      var count = mod_table.rows( { selected: true } ).count();
                      if (confirm("Are you sure you want to delete " + count + " moderators?")) {
                        deleteModerators(members);
                      }
                    }
                  }
                }
              ]
  });

}

function approveMembers(members) {

  var old_public_uid = "null";

  // Get total number of calls to Database
  for (var i = 0; i < members.length; i++) {
    var uid_index = members_private_table_headers.indexOf("Private UID");
    var private_uid = members[i][uid_index];
    var member = private_obj["members"][private_uid];
    var privacy = member["privacy"];
    var public_uid = "null";
    if("public_uid" in member) {
      public_uid = member["public_uid"];
    }

    wait_counter = wait_counter+1;
    if (public_uid == "null") {
      wait_counter = wait_counter+2;
      if (privacy == "public") {
        wait_counter = wait_counter+1;
      }
    } else {
      if (!(public_uid in shared_obj["members"])) {
        wait_counter = wait_counter+1;
      }
      if (!(public_uid in public_obj["members"]) && privacy == "public") {
        wait_counter = wait_counter+1;
      }
    }

  }

  // Start Calls to Database
  for (var i = 0; i < members.length; i++) {

    // Get variables
    var uid_index = members_private_table_headers.indexOf("Private UID");
    var private_uid = members[i][uid_index];
    var member = private_obj["members"][private_uid];
    var privacy = member["privacy"];
    var public_uid = "null";
    if("public_uid" in member) {
      public_uid = member["public_uid"];
    }

    // Set approved to true in database
    rootRef.child('private/members/' + private_uid + "/approved").set("Yes",
      function(error) {
        if(error == null) {
          isFinished();
        }
        else {
          alert(error);
          window.location.href = "/admin/console.html";
        }
    });

    delete member["approved"];
    delete member["comments"];
    delete member["email"];
    delete member["privacy"];
    delete member["interests"];

    if (public_uid == "null") {

      var newPostRef = rootRef.child("shared/members").push(member,
        function(error) {
          if(error == null) {
            isFinished();
          }
          else {
            alert(error);
            window.location.href = "/admin/console.html";
          }
      });

      var new_public_uid = newPostRef.key;
      if (old_public_uid == new_public_uid) {
        alert("Error: Duplicate Public UID = " + new_public_uid);
      }
      old_public_uid = new_public_uid;

      rootRef.child('private/members/' + private_uid + "/public_uid").set(new_public_uid,
        function(error) {
          if(error == null) {
            isFinished();
          }
          else {
            alert(error);
            window.location.href = "/admin/console.html";
          }
      });

      if (privacy == "public") {
        rootRef.child("public/members/" + new_public_uid).set(member,
          function(error) {
            if(error == null) {
              isFinished();
            }
            else {
              alert(error);
              window.location.href = "/admin/console.html";
            }
        });
      }

    } else {

      if (!(public_uid in shared_obj["members"])) {
        rootRef.child("shared/members/" + public_uid).set(member,
          function(error) {
            if(error == null) {
              isFinished();
            }
            else {
              alert(error);
              window.location.href = "/admin/console.html";
            }
        });
      }

      if (!(public_uid in public_obj["members"]) && privacy == "public") {
        rootRef.child("shared/members/" + public_uid).set(member,
          function(error) {
            if(error == null) {
              isFinished();
            }
            else {
              alert(error);
              window.location.href = "/admin/console.html";
            }
        });
      }

    }

  }

}

function isFinished() {
  wait_counter = wait_counter-1;
  if (wait_counter <= 0) {
    alert('All Approvals Successful.');
    window.location.href = "/admin/console.html";
  }
}

function setPrivateMemberInfo(member_row) {
  var uid_index = members_private_table_headers.indexOf("Private UID");
  var private_uid = member_row[uid_index];
  var member = private_obj["members"][private_uid];
  $( "#first_name" ).val(member["first_name"]);
  $( "#last_name" ).val(member["last_name"]);
  $( "#email" ).val(member["email"]);
  $( "#current_city" ).val(member["current_address"]["locality"]);
  $( "#current_state" ).val(member["current_address"]["administrative_area_level_1"]);
  $( "#current_country" ).val(member["current_address"]["country"]);
  $( "#current_lat" ).val(member["current_address"]["lat"]);
  $( "#current_lng" ).val(member["current_address"]["lng"]);
  $( "#home_city" ).val(member["hometown_address"]["locality"]);
  $( "#home_state" ).val(member["hometown_address"]["administrative_area_level_1"]);
  $( "#home_country" ).val(member["hometown_address"]["country"]);
  $( "#home_lat" ).val(member["hometown_address"]["lat"]);
  $( "#home_lng" ).val(member["hometown_address"]["lng"]);
  $( "#linkedin_profile" ).val(member["linkedin_profile"]);
  $( "#industry" ).val(member["industry"]);
  $( "#status" ).val(member["status"]);
  $( "#school" ).val(member["school"]);
  $( "#program" ).val(member["program"]);
  $( "#grad_year" ).val(member["grad_year"]);
  $( "#ambassador" ).val(member["ambassador"]);
  $( "#connect" ).prop('checked', member["interests"]["connect"]);
  $( "#organize" ).prop('checked', member["interests"]["organize"]);
  $( "#learn" ).prop('checked', member["interests"]["learn"]);
  $( "#mentor" ).prop('checked', member["interests"]["mentor"]);
  $( "#support" ).prop('checked', member["interests"]["support"]);
  $( "#comments" ).val(member["comments"]);
  $( "#privacy" ).val(member["privacy"]);
  $( "#approved" ).val(member["approved"]);
  if ("date_created" in member) {
    var d = new Date(member["date_created"]);
    $( "#date_created" ).val(d);
  } else {
    $( "#date_created" ).val("");
  }
  $( "#private_uid" ).val(private_uid);
  $( "#public_uid" ).val(member["public_uid"]);
}

function savePrivateMemberChanges() {

  var member = private_obj["members"][$( "#private_uid" ).val()];
  var old_privacy = member["privacy"];
  member["first_name"] = $( "#first_name" ).val();
  member["last_name"] = $( "#last_name" ).val();
  member["email"] = $( "#email" ).val();
  member["current_address"]["locality"] = $( "#current_city" ).val();
  member["current_address"]["administrative_area_level_1"] = $( "#current_state" ).val();
  member["current_address"]["country"] = $( "#current_country" ).val();
  member["current_address"]["lat"] = parseFloat($( "#current_lat" ).val());
  member["current_address"]["lng"] = parseFloat($( "#current_lng" ).val());
  member["hometown_address"]["locality"] = $( "#home_city" ).val();
  member["hometown_address"]["administrative_area_level_1"] = $( "#home_state" ).val();
  member["hometown_address"]["country"] = $( "#home_country" ).val();
  member["hometown_address"]["lat"] = parseFloat($( "#home_lat" ).val());
  member["hometown_address"]["lng"] = parseFloat($( "#home_lng" ).val());
  member["linkedin_profile"] = $( "#linkedin_profile" ).val();
  member["industry"] = $( "#industry" ).val();
  member["status"] = $( "#status" ).val();
  member["school"] = $( "#school" ).val();
  member["program"] = $( "#program" ).val();
  if (Number.isInteger(parseInt($( "#grad_year" ).val()))) {
    member["grad_year"] = parseInt($( "#grad_year" ).val());
  }
  member["ambassador"] = $( "#ambassador" ).val();
  if ($( "#connect" ).is(':checked')) {
    member["interests"]["connect"] = true;
  }
  if ($( "#organize" ).is(':checked')) {
    member["interests"]["organize"] = true;
  }
  if ($( "#learn" ).is(':checked')) {
    member["interests"]["learn"] = true;
  }
  if ($( "#mentor" ).is(':checked')) {
    member["interests"]["mentor"] = true;
  }
  if ($( "#support" ).is(':checked')) {
    member["interests"]["support"] = true;
  }
  member["comments"] = $( "#comments" ).val();
  member["privacy"] = $( "#privacy" ).val();
  member["approved"] = $( "#approved" ).val();

  Object.keys(member).forEach(function(key) {
    if (member[key] == "") {
      delete member[key];
    }
  });

  //console.log(member);
  rootRef.child('private/members/' + $( "#private_uid" ).val()).set(member,
    function(error) {
      if(error == null) {
        if ($( "#public_uid" ).val() == "") {
          alert("Member Successfully Updated!");
          window.location.href = "/admin/console.html";
        }
      }
      else {
        alert(error);
        window.location.href = "/admin/console.html";
      }
  });

  if ($( "#public_uid" ).val() != "") {
    delete member["approved"];
    delete member["comments"];
    delete member["email"];
    delete member["privacy"];
    delete member["interests"];

    rootRef.child('shared/members/' + $( "#public_uid" ).val()).set(member,
      function(error) {
        if(error == null) {
          if (old_privacy == "public") {
            rootRef.child('public/members/' + $( "#public_uid" ).val()).set(member,
              function(error) {
                if(error == null) {
                  alert("Member Successfully Updated!");
                  window.location.href = "/admin/console.html";
                }
                else {
                  alert(error);
                  window.location.href = "/admin/console.html";
                }
            });
          } else {
            alert("Member Successfully Updated!");
            window.location.href = "/admin/console.html";
          }
        }
        else {
          alert(error);
          window.location.href = "/admin/console.html";
        }
    });

  }

}

function deletePrivateMembers(members) {
  for (var i = 0; i < members.length; i++) {
    var private_uid_index = members_private_table_headers.indexOf("Private UID");
    var public_uid_index = members_private_table_headers.indexOf("Public UID");
    var private_uid = members[i][private_uid_index];
    var public_uid = members[i][public_uid_index];
    var member = private_obj["members"][private_uid];

    rootRef.child('private/members/' + private_uid).remove(function(error) {
      if(error == null) {}
      else {
        alert(error);
        window.location.href = "/admin/console.html";
      }
    });

    var wait_shared = false;
    var wait_public = false;
    var wait_mod = false;

    if(public_uid != "null") {

      wait_shared = true;
      rootRef.child('shared/members/' + public_uid).remove(function(error) {
        if(error == null) {
          wait_shared = false;
          if (!wait_shared && !wait_public && !wait_mod) {
            alert("Member(s) Deleted Successfully!");
            window.location.href = "/admin/console.html";
          }
        }
        else {
          alert(error);
          window.location.href = "/admin/console.html";
        }
      });

      if (member["privacy"] == "public") {

        wait_public = true;
        rootRef.child('public/members/' + public_uid).remove(function(error) {
          if(error == null) {
            wait_public = false;
            if (!wait_shared && !wait_public && !wait_mod) {
              alert("Member(s) Deleted Successfully!");
              window.location.href = "/admin/console.html";
            }
          }
          else {
            alert(error);
            window.location.href = "/admin/console.html";
          }
        });
      }

    }

    if(private_uid in moderators_obj) {

      wait_mod = true;
      rootRef.child('moderators/' + private_uid).remove(function(error) {
        if(error == null) {
          wait_mod = false;
          if (!wait_shared && !wait_public && !wait_mod) {
            alert("Member(s) Deleted Successfully!");
            window.location.href = "/admin/console.html";
          }
        }
        else {
          alert(error);
          window.location.href = "/admin/console.html";
        }
      });
    }

  }

}

function deletePublicMembers(members) {
  for (var i = 0; i < members.length; i++) {
    var public_uid_index = members_public_table_headers.indexOf("Public UID");
    var public_uid = members[i][public_uid_index];

    rootRef.child('public/members/' + public_uid).remove(function(error) {
      if(error == null) {}
      else {
        alert(error);
        window.location.href = "/admin/console.html";
      }
    });

    Object.keys(private_obj["members"]).forEach(function(key) {
      if (key != "dummy") {
        if (private_obj["members"][key]["public_uid"] == public_uid) {
          rootRef.child('private/members/' + key + "/privacy").set("members", function(error) {
            if(error == null) {}
            else {
              alert(error);
              window.location.href = "/admin/console.html";
            }
          });
          rootRef.child('private/members/' + key + "/public_uid").remove(function(error) {
            if(error == null) {
              alert("Member(s) Public Data Deleted Successfully!");
              window.location.href = "/admin/console.html";
            }
            else {
              alert(error);
              window.location.href = "/admin/console.html";
            }
          });
        }
      }
    });
  }
}

function addModerator() {
  var private_uid = $( "#mod_private_uid" ).val();
  if (private_uid in private_obj["members"]) {
    rootRef.child('moderators/' + private_uid).set(true, function(error) {
      if(error == null) {
        alert("Moderator Successfully Added!");
        window.location.href = "/admin/console.html";
      }
      else {
        alert(error);
        window.location.href = "/admin/console.html";
      }
    });
  } else {
    alert("Member does not exist with Private UID: " + private_uid);
  }

}

function deleteModerators(members) {
  for (var i = 0; i < members.length; i++) {
    var private_uid = members[i][2];

    rootRef.child('moderators/' + private_uid).remove(function(error) {
      if(error == null) {
        alert("Moderator(s) Successfully Deleted!");
        window.location.href = "/admin/console.html";
      }
      else {
        alert(error);
        window.location.href = "/admin/console.html";
      }
    });
  }
}

function exportMembersPrivateDatabase() {
  var obj = private_obj["members"];
  var members = [];
  Object.keys(obj).forEach(function(key) {
    if (key != "dummy") {
      obj["private_uid"] = key;
      members.push(flattenMember(obj[key]));
    }
  });

  JSONToCSVConvertor(members, "Global NL Private Members Database", true);
}

function flattenMember(obj) {
  var new_obj = {};
  Object.keys(member_template).forEach(function(key) {
    if (obj[key] !== null && typeof obj[key] === 'object') {

      if (key == "interests") {
        new_obj["interest_connect"] = obj[key]["connect"];
        new_obj["interest_learn"] = obj[key]["learn"];
        new_obj["interest_mentor"] = obj[key]["mentor"];
        new_obj["interest_organize"] = obj[key]["organize"];
        new_obj["interest_support"] = obj[key]["support"];
      } else if (key == "current_address") {
        new_obj["current_city"] = (obj[key]["locality"] || "N/A");
        new_obj["current_state"] = (obj[key]["administrative_area_level_1"] || "N/A");
        new_obj["current_country"] = (obj[key]["country"] || "N/A");
        new_obj["current_lat"] = (obj[key]["lat"] || "N/A");
        new_obj["current_lng"] = (obj[key]["lng"] || "N/A");
      } else if (key == "hometown_address") {
        new_obj["hometown_city"] = (obj[key]["locality"] || "N/A");
        new_obj["hometown_state"] = (obj[key]["administrative_area_level_1"] || "N/A");
        new_obj["hometown_country"] = (obj[key]["country"] || "N/A");
        new_obj["hometown_lat"] = (obj[key]["lat"] || "N/A");
        new_obj["hometown_lng"] = (obj[key]["lng"] || "N/A");
      }

    } else {
      if (typeof obj[key] !== 'undefined') {
        new_obj[key] = obj[key];
        if (new_obj[key] == "") {
          new_obj[key] = "N/A"
        }
      } else {
        new_obj[key] = "N/A";
      }

    }

  });
  return new_obj;
}

function JSONToCSVConvertor(JSONData, ReportTitle, ShowLabel) {
    var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
    var CSV = '';

    CSV += ReportTitle + '\r\n\n';

    if (ShowLabel) {
        var row = "";

        for (var index in arrData[0]) {
            row += index + ',';
        }

        row = row.slice(0, -1);
        CSV += row + '\r\n';
    }

    for (var i = 0; i < arrData.length; i++) {
        var row = "";
        for (var index in arrData[i]) {
            row += '"' + arrData[i][index] + '",';
        }
        row.slice(0, row.length - 1);
        CSV += row + '\r\n';
    }

    if (CSV == '') {
        alert("Invalid data");
        return;
    }
    var fileName = ReportTitle.replace(/ /g,"_");
    var uri = 'data:text/csv;charset=utf-8,' + escape(CSV);
    var link = document.createElement("a");
    link.href = uri;
    link.style = "visibility:hidden";
    link.download = fileName + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
