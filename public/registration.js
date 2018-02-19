
// Member JSON Object
var member = {
    first_name:"John",
    last_name:"Doe",
    interests : {
      connect:false,
      organize:false,
      learn:false,
      mentor:false,
      support:false
    },
    current_address: {
      lat:500,
      lng:500
    },
    hometown_address: {
      lat:500,
      lng:500
    },
    approved:"No"
  };
  
  // Javascript to run once page is fully loaded
  $(document).ready(function() {
  
    // Bias autocomplete_current with current location
    //geolocate();
  
    // Prevent the enter key from submitting the form when uncomplete
    $(window).keydown(function(event){
        if(event.keyCode == 13) {
          event.preventDefault();
          return false;
        }
      });
  
    $('#status').on('change',function(){
        if( $(this).val()==="Student"){
          $("#school").show();
          $("#program").show();
          $("#grad_year").show();
        }
        else {
          $("#school").hide();
          $("#program").hide();
          $("#grad_year").hide();
        }
    });
  
    $('#industry').on('change',function(){
        if( $(this).val()==="Other"){
          $("#industry_other").show();
        }
        else {
          $("#industry_other").hide();
        }
    });
  
  });
  
  function changeStatus(){
    if ($( "#status" ).val() == "Student") {
      document.getElementById("school_box").required = true;
      document.getElementById("program_box").required = true;
      document.getElementById("grad_year_box").required = true;
    }
    else {
      document.getElementById("school_box").required = false;
      document.getElementById("program_box").required = false;
      document.getElementById("grad_year_box").required = false;
    }
  }
  
  function changeSector() {
    if ($( "#industry" ).val() == "Other") {
      document.getElementById("industry_other_box").required = true;
    }
    else {
      document.getElementById("industry_other_box").required = false;
    }
  }
  
  function fieldsEntered() {
    register();
    return false;
  }
  
  function register() {
  
    var errors = false;
    $('#submit_handle').click();
  
    if (member["current_address"]["lat"] == 500) {
      alert("Error getting current address, please do not use auto fill form and enter address in manually using Google Places Autocomplete.");
      errors = true;
    }
  
    if (member["hometown_address"]["lat"] == 500) {
      alert("Error getting hometown address, please do not use auto fill form and enter address in manually using Google Places Autocomplete.");
      errors = true;
    }
  
    member["first_name"] = $( "#first_name" ).val();
    member["last_name"] = $( "#last_name" ).val();
    member["email"] = $( "#email" ).val();
  
    member["linkedin_profile"] = $( "#linkedin_profile" ).val().toLowerCase();
    if ($( "#linkedin_profile" ).val().includes("linkedin.com/in/")) {
      // good
    } else {
      alert("Error: Invalid LinkedIn Profile Entered. Please make sure your LinkedIn Profile cotains \"linkedin.com/in/\"");
      errors = true;
    }
  
    if ($( "industry" ).val() == "Other") {
      member["industry"] = $( "#industry_other_box" ).val();
    }
    else {
      member["industry"] = $( "#industry" ).val();
    }
  
    member["status"] = $( "#status" ).val();
    if ($( "#status" ).val() == "Student") {
      member["school"] = $( "#school_box" ).val();
      member["program"] = $( "#program_box" ).val();
      member["grad_year"] = parseInt($( "#grad_year_box" ).val());
    }
    else {
      delete member["school"];
      delete member["program"];
      delete member["grad_year"];
    }
  
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
    member["ambassador"] = "No";
    member["privacy"] = $('input[name=privacy]:checked').val();
  
    //console.log(member);
  
    // Need to add better validation
    Object.keys(member).forEach(function(key) {
      if(key != "approved" && key != "comments" && key != "linkedin_profile") {
        if (member[key] == undefined || member[key] == "") {
          //console.log(key + " Error.");
          errors = true;
        }
      }
    });
  
    if ($( "#autocomplete_current" ).val() == "" || $( "#autocomplete_hometown" ).val() == "") {
      //console.log("Address Error.");
      errors = true;
    }
  
    // Good to submit
    if (errors == false) {
  
      member["date_created"] = Date.now();
  
      rootRef.child('private/members/' + uid).set(member, function(error) {
        if(error == null) {
          alert('Registration Successful!');
          window.location.href = "https://www.globalnl.com";
        } else {
          alert(error);
          //window.location.href = "index.html";
        }
      });
  
    }
  
    return false;
  
  }
  
  var placeSearch, autocomplete;
  var componentForm = {
    street_number: 'long_name',
    route: 'long_name',
    locality: 'long_name',
    administrative_area_level_1: 'long_name',
    country: 'long_name',
    postal_code: 'long_name'
  };
  
  function initAutocomplete() {
    autocomplete_current = new google.maps.places.Autocomplete(
        /** @type {!HTMLInputElement} */(document.getElementById('autocomplete_current')),
        {types: ['geocode']});
    autocomplete_hometown = new google.maps.places.Autocomplete(
        /** @type {!HTMLInputElement} */(document.getElementById('autocomplete_hometown')),
        {types: ['geocode']});
  
    autocomplete_current.addListener('place_changed', currentAddress);
    autocomplete_hometown.addListener('place_changed', hometownAddress);
  }
  
  function currentAddress() {
    var place = autocomplete_current.getPlace();
  
    for (var i = 0; i < place.address_components.length; i++) {
      var addressType = place.address_components[i].types[0];
      if (componentForm[addressType]) {
        var val = place.address_components[i][componentForm[addressType]];
        member["current_address"][addressType] = val;
      }
    }
  
    member["current_address"]["lat"] = place.geometry.location.lat();
    member["current_address"]["lng"] = place.geometry.location.lng();
  
  }
  
  function hometownAddress() {
    var place = autocomplete_hometown.getPlace();
  
    for (var i = 0; i < place.address_components.length; i++) {
      var addressType = place.address_components[i].types[0];
      if (componentForm[addressType]) {
        var val = place.address_components[i][componentForm[addressType]];
        member["hometown_address"][addressType] = val;
      }
    }
  
    member["hometown_address"]["lat"] = place.geometry.location.lat();
    member["hometown_address"]["lng"] = place.geometry.location.lng();
  
  }
  
  // Bias the autocomplete_current object to the user's geographical location,
  // as supplied by the browser's 'navigator.geolocation' object.
  function geolocate() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var geolocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        var circle = new google.maps.Circle({
          center: geolocation,
          radius: position.coords.accuracy
        });
        autocomplete_current.setBounds(circle.getBounds());
      });
    }
  }
  