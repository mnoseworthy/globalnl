# Task List
List of current development required, order is not significant.
## Overall
- [x] **Update welcome email**
- [x] **Automatically select testing vs production environment**
- [x] **Have default view on member directory show members randomly**
- [ ] **Add GeoFire query or other proximity based search versus specific city/province**
   -[Working test code in functions](https://github.com/firebase/geofire-js/tree/master/examples)
   -Change hometown_location and current_location lat/lng to use GeoFire
   -Then turn both location searches to find users by proximity to the location entered (currently if you put in "Mount Pearl" you won't 	get people from St. John's/Paradise. Even more important for smaller communities. Really needs to be who's near you vs             	    having to be precise on address fields
    -Need to use Realtime database not Firestore for GeoFire. Hence need to design a way to keep them synced up or to query both 	        (Firestore for profile and GeoFire/Realtime for locations). Consider Functions to keep in sync
    -Switch map.html to use GeoFire as well

- [ ] **Add an admin area**
   -index.html ->Link on each profile card to "Edit profile" and drive to profile.html with UID as param
   -profile.html -> Use uid param instead of firebase.auth UID. Add First Name/Last Name/LinkedIn URL/Headline/Email. Add delete               button (add copied_account = true)
   -Function -> Only update name fields on account create
       
- [ ] **Clean up login functions to no longer need migration**

- [ ] **More searches**
   -Random search to "randomly" show you people who are similar to you on some dimension
   -Same hometown / Industry / current location / MUN grad year
   -Show recently updated members
       
- [ ] **Add link on map info window to show complete profile**

- [ ] **Clean database for incomplete/testing accounts** 

## Minor coding/design/CSS backlog
- [ ] Bio text needs to be in separate column to “indent” multiple lines
- [ ] On desktop move search to side and fix to top when scrolling?
- [ ] Some weird location combos not being presented properly (empty on directory)


