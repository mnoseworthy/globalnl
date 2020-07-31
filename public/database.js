const firestore = firebase.firestore();
const settings = { timestampsInSnapshots: true };
firestore.settings(settings);

var memberdata = {};
function fillTable() {
  let public_task = firebase.firestore().collection("members").orderBy('last_name', 'asc').get().then(function(querySnapshot) {
    querySnapshot.forEach(function(doc) {
      if (!memberdata[doc.id]) memberdata[doc.id] = {};
      memberdata[doc.id].dbName = doc.data().first_name + " " + doc.data().last_name;
      memberdata[doc.id].dbMUN = doc.data().MUN || "";
      memberdata[doc.id].dbMUNGrad = doc.data().MUN_grad_year || "";
      memberdata[doc.id].dbLIProfile = doc.data().linkedin_profile || "";
      memberdata[doc.id].dbUid = doc.id;

    });
  });
  let private_task = firebase.firestore().collection("private_data").get().then(function(querySnapshot) {
    querySnapshot.forEach(function(doc) {
      if (!memberdata[doc.id]) memberdata[doc.id] = {};
      memberdata[doc.id].dbEmail = doc.data().email;
    });
  });
  Promise.all([public_task, private_task]).then(() => {
    for (const member in memberdata) {
      $("table tbody").append("<tr><td>" + memberdata[member].dbName + "</td><td>" +
        memberdata[member].dbEmail + "</td><td>" + memberdata[member].dbMUN + "</td><td>" +
        memberdata[member].dbMUNGrad + "</td><td>" + memberdata[member].dbLIProfile + "</td><td>" +
        memberdata[member].dbUid + "</td><td><button id='"+ memberdata[member].dbUid +
        "'class='btn btn-primary' onclick='adminRedirect();'>Edit Profile</button></td><td><button onclick='databaseRedirect(&quot;" +
        memberdata[member].dbUid + "&quot;);' class='btn btn-secondary'>Go to Database</button></td></tr>");

    }
    $("#fillTable").hide();
    $("#DBTitles").show();
    $('#DBTable').DataTable({
      dom: 'Bfrtip',
      buttons: [
            {
                extend: 'copyHtml5',
                exportOptions: {
                    columns: [ 0, 1, 2, 3, 4, 5 ]
                }
            },
            {
                extend: 'excelHtml5',
                exportOptions: {
                    columns: [ 0, 1, 2, 3, 4, 5 ]
                }
            }
        ],

      paging: false,
      language: {
        info: "_TOTAL_ members",
        infoEmpty: "No members to show",
        infoFiltered: " - of _MAX_ total members",
        buttons: {
          copySuccess: {
            1: "Copied one member to clipboard",
            _: "Copied %d members to clipboard"
          }
        }
      }
    });
  });
}

function renderWithUser(user) {
  firebase.firestore().collection("moderators").doc(firebase.auth().currentUser.uid).get().then((doc) => {
    if (doc.data().moderator) {
      $("#mainPage").show();
    }
  })
  .catch((error) => {
    console.log("Access denied: invalid permissions");
    window.open("/404.html", "_self");
  });
}

function renderWithoutUser(user) {
  $("#mainPage").hide();
}

gnl.auth.listenForStageChange(renderWithUser, renderWithoutUser, false);

function adminRedirect() {
  sessionStorage.setItem("uid", event.target.id);
  window.open("/profile.html", "_blank");
}

function databaseRedirect(uid) {
  if (window.location.href == "https://members.globalnl.com/database.html") {
    window.open("https://console.firebase.google.com/u/0/project/globalnl-members/database/firestore/data~2Fmembers~2F" + uid, "_blank");
  }
  else if (window.location.href == "https://memberstest.globalnl.com/database.html") {
      window.open("https://console.firebase.google.com/u/0/project/globalnl-database-test/database/firestore/data~2Fmembers~2F" + uid, "_blank");
  }
}

