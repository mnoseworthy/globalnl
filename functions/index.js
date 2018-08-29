/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const functions = require('firebase-functions');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

// Firebase Setup
const admin = require('firebase-admin');

var serviceAccount = require('./globalnl-members-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`,
});
var db = admin.firestore();
const settings = {timestampsInSnapshots: true};
db.settings(settings);

const OAUTH_SCOPES = ['r_basicprofile', 'r_emailaddress'];

var member = {};
var private_data = {};


/**
 * Creates a configured LinkedIn API Client instance.
 */
function linkedInClient() {
  // LinkedIn OAuth 2 setup
  // TODO: Configure the `linkedin.client_id` and `linkedin.client_secret` Google Cloud environment variables.
  return require('node-linkedin')(
      functions.config().linkedin.client_id,
      functions.config().linkedin.client_secret,
	  `https://members.globalnl.com/login.html`);
	  //`https://globalnl-members.firebaseapp.com/login.html`);
	  //`https://memberstest.globalnl.com/login.html`);

}

/**
 * Redirects the User to the LinkedIn authentication consent screen. ALso the 'state' cookie is set for later state
 * verification.
 */
exports.redirect = functions.https.onRequest((req, res) => {
  const Linkedin = linkedInClient();

  cookieParser()(req, res, () => {
    const state = req.cookies.state || crypto.randomBytes(20).toString('hex');
    //console.log('Setting verification state:', state);
	//res.setHeader('Cache-Control', 'private');
    res.cookie('state', state.toString(), {
      maxAge: 3600000,
      secure: true,
      httpOnly: true,
    });
    Linkedin.auth.authorize(res, OAUTH_SCOPES, state.toString());
  });
});

/**
 * Exchanges a given LinkedIn auth code passed in the 'code' URL query parameter for a Firebase auth token.
 * The request also needs to specify a 'state' query parameter which will be checked against the 'state' cookie.
 * The Firebase custom auth token is sent back in a JSONP callback function with function name defined by the
 * 'callback' query parameter.
 */
exports.token = functions.https.onRequest((req, res) => {
	const Linkedin = linkedInClient();
  //res.setHeader('Cache-Control', 'private');
  
  try {
    return cookieParser()(req, res, () => {
      if (!req.cookies.state) {
        throw new Error('State cookie not set or expired. Maybe you took too long to authorize. Please try again.');
      }
      //console.log('Received verification state:', req.cookies.state);
      Linkedin.auth.authorize(OAUTH_SCOPES, req.cookies.state); // Makes sure the state parameter is set
      //console.log('Received auth code:', req.query.code);
      //console.log('Received state:', req.query.state);
      Linkedin.auth.getAccessToken(res, req.query.code, req.query.state, (error, results) => {
        if (error) {
          throw error;
        }
        //console.log('Received Access Token:', results.access_token);
        const linkedin = Linkedin.init(results.access_token);
        linkedin.people.me((error, userResults) => {
          if (error) {
            throw error;
          }
          //console.log('Auth code exchange result received:', userResults);

          // We have a LinkedIn access token and the user identity now.
          //results.access_token;
		  // The UID we'll assign to the user is 1In_ plus the internal LinkedIn user reference which is unique for our API key (one)
		  // userResults.id
		  
		  console.log(userResults);
		  		  
		  member = {
			first_name: (userResults.firstName.charAt(0).toUpperCase() + userResults.firstName.substr(1).toLowerCase()) || "",
			last_name: (userResults.lastName.charAt(0).toUpperCase() + userResults.lastName.substr(1).toLowerCase()) || "",
			display_name: userResults.formattedName || "",
			headline: userResults.headline || "",
			industry: userResults.industry || "",
			linkedin_profile: userResults.publicProfileUrl || "",
			photoURL: userResults.pictureUrl || "",
			current_address: {LinkedInLocation: userResults.location.name || ""},
			copied_account: false
		  }
		  //console.log(member);
          // Create a Firebase account and get the Custom Auth Token.
          return createFirebaseAccount('00LI_'+userResults.id, userResults.formattedName, userResults.pictureUrl, userResults.emailAddress).then(
            (firebaseToken) => {
              // Serve an HTML page that signs the user in and updates the user profile.
              return res.jsonp({
                token: firebaseToken
              });
            });
        });
      });
    });
  } catch (error) {
	  console.log('Error in cookie loading etc',error.toString());
    return res.jsonp({
      error: error.toString,
    });
  }
});


/**
 * Creates a Firebase account with the given user profile and returns a custom auth token allowing
 * signing-in this account.
 * Also saves the accessToken to the datastore at /linkedInAccessToken/$uid
 *
 * @returns {Promise<string>} The Firebase custom auth token in a promise.
 */
function createFirebaseAccount(uid, displayName, photoURL, email){

  // Save the access token to the Firebase Realtime Database.
  // Taking out now, if add back replace in Promises at end
  //const databaseTask = admin.database().ref(`/linkedInAccessToken/${uid}`).set(accessToken);
  

  // Create or update the user account.
const userTokenTask = admin.auth().updateUser(uid, {
    displayName: displayName,
    photoURL: photoURL,
    email: email,
    emailVerified: true
  }).catch((error) => {
    // If user does not exists we create it.
    if (error.code === 'auth/user-not-found') {
		console.log("Attempting to create a new account for: ", email);
		//var uidOld;
		// Create user account
		const createUserTask = admin.auth().createUser({
					uid: uid,
					displayName: displayName,
					photoURL: photoURL,
					email: email,
					emailVerified: true
				})
		  .catch(function(error) {
					console.log("Error in createUserTask: ", error);
			});	  
	  
		// See if user by same email exists in database. If so
		// a) Save their interests/comments from retrieved private_data record
		// b) Search for members record and save addresses
		// c) Set flags on old members record 
		const searchExistingUserTask = db.collection('private_data').where("email", "==", email).get()
			.then((querySnapshot) => {
				if(querySnapshot.docs.length > 0){
					console.log("Found existing user for ", email, " ==> ", querySnapshot.docs[0].id);
					member.uid_old = querySnapshot.docs[0].id;
					if(querySnapshot.docs[0].data().interests != undefined) private_data.interests = querySnapshot.docs[0].data().interests;
					if(querySnapshot.docs[0].data().comments != undefined) private_data.comments = querySnapshot.docs[0].data().comments;	
					return db.collection('members').doc(querySnapshot.docs[0].id).get();
				}
				console.log("Unable to find existing user for ", email);
				return false
			})
			.then((doc) => {
				if(doc && doc.exists){
					console.log("Found existing member record for ", email);
					if(doc.data().current_address != undefined) member.current_address = doc.data().current_address;
					if(doc.data().hometown_address != undefined) member.hometown_address = doc.data().hometown_address;
					if(doc.data().privacy != undefined) member.privacy = doc.data().privacy;
					member.date_updated = "-1"; //Set to -1 to trigger profile form update	
					return db.collection('members').doc(doc.id).set({
						copied_account: true,
						uid_new: uid
						},
						{merge: true});
				}
				console.log("Didn't find existing member record for ", email);
				return true
			})
			.catch(function(error) {
					console.log("Error in searchExistingUserTask: ", error);
			});
		return Promise.all([createUserTask, searchExistingUserTask]).then(() => {
			return false;
		});
    } // END IF
    throw error;
  })// END Catch
  .then(() => {
		const token = admin.auth().createCustomToken(uid);
		
		console.log("About to write member database record: ", uid);
		
		private_data.email = email || "";
		
		console.log(private_data);
		console.log(member);
		
		const privateDatabaseTask = db.collection('private_data').doc(uid).set(
		private_data,
		{merge: true}
		)
		.catch(function(error){
		console.log(error);
		console.log("Error writing private database properties for ", uid);
		});
		const memberDatabaseTask = db.collection('members').doc(uid).set(
		member,
		{merge: true}
		)
		.catch(function(error){
		console.log(error);
		console.log("Error writing public database properties for ", uid);
		});
		return Promise.all([token, memberDatabaseTask, privateDatabaseTask]).then(() => {
			// Create a Firebase custom auth token.
			return token;
		}); 
  })
  return userTokenTask //holds value of token 
}