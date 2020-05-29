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
"use strict";

const functions = require("firebase-functions");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

//Mailgun Setup
const mailgunKey = functions.config().mailgun.key;
var mailgun = require("mailgun-js")({
  apiKey: mailgunKey,
  domain: "mail.globalnl.com"
});

//Mailchimp Setup
const mailchimpKey = functions.config().mailchimp.key;
const Mailchimp = require('mailchimp-api-v3')
const mailchimp = new Mailchimp(mailchimpKey);

// Firebase Setup
const admin = require("firebase-admin");


var serviceAccount = require(`./${functions.config().project.name}-service-account.json`);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${functions.config().project.name}.firebaseio.com`
});
var db = admin.firestore();
const settings = { timestampsInSnapshots: true };
db.settings(settings);

//const OAUTH_SCOPES = ["r_liteprofile"];
const OAUTH_SCOPES = ["r_liteprofile", "r_emailaddress"];

var member = {};
var private_data = {};

/**
 * Sends welcome email to new users
 */

exports.sendWelcomeEmail = functions.auth.user().onCreate(user => {
  const email = user.email; // The email of the user.
  const displayName = user.displayName; // The display name of the user.
  var promiseArray = [];
  promiseArray.push(sendWelcomeEmail(email, displayName));
  promiseArray.push(mailchimp.post(
			'/lists/9efe26440a/members',
			{
				email_address: email,
				status: 'subscribed',
				merge_fields:{FNAME: displayName}
			}
			)
			.then((response)=>{
				console.log(email + ' added to Mailchimp');
				console.log(response);
			}));
    return Promise.all(promiseArray)
	.catch(err => {
		console.error(err);
	});
});

exports.sendMessageToUser = functions.https.onCall((data, context) => {
  const { auth } = context,
    isAuthed = Boolean(auth),
    MAX_MESSAGES_PER_DAY = 25;

  if (!isAuthed || !data || !data.toUserId || !data.message) {
    console.log("Error sending message:", isAuthed, data);
    return;
  }

  const fromUserId = auth.uid,
    { toUserId, message } = data,
    members = db.collection("members"),
    privateData = db.collection("private_data"),
    fromUserPrivateDataDoc = privateData.doc(fromUserId);

  return privateData.doc(fromUserId).get().then(fromUserSnapshot => {
    const fromUserPrivateData = fromUserSnapshot.data(),
      today = new Date();

    let { send_message_date, send_message_count } = fromUserPrivateData;

    const previousSendDate = Boolean(send_message_date) && send_message_date.toDate(),
      sendingAnotherMessageToday = Boolean(previousSendDate) &&
        previousSendDate.getUTCFullYear() === today.getUTCFullYear() &&
        previousSendDate.getUTCMonth() === today.getUTCMonth() &&
        previousSendDate.getUTCDate() === today.getUTCDate();

    if (sendingAnotherMessageToday) {
      if (send_message_count >= MAX_MESSAGES_PER_DAY) {
        console.log("Error sending message:", fromUserId, "exceeded message limit of", MAX_MESSAGES_PER_DAY);
        return;
      }

      send_message_count += 1;
    } else {
      send_message_date = today;
      send_message_count = 1;
    }

    const upateSendMessageDateAndCount = fromUserPrivateDataDoc.set({ send_message_date, send_message_count }, { merge: true }),
      getFromUser = members.doc(fromUserId).get(),
      getToUser = members.doc(toUserId).get(),
      getToUserPrivateData = privateData.doc(toUserId).get();

    return Promise.all([upateSendMessageDateAndCount, getFromUser, getToUser, getToUserPrivateData])
      .then(
        ([
          _,
          fromUserMemberDoc,
          toUserMemberDoc,
          toUserPrivateDataDoc
        ]) => {
          const fromUserMemberData = fromUserMemberDoc.data(),
            fromDisplayName = fromUserMemberData.display_name || `${fromUserMemberData.first_name} ${fromUserMemberData.last_name}`,
            mailOptions = {
              from: `${fromDisplayName} <connect@globalnl.com>`,
              to: `${toUserMemberDoc.data().display_name} <${
                toUserPrivateDataDoc.data().email
                }>`,
              subject: `${fromDisplayName} sent you a message on GlobalNL`,
              text: `${message}
---
You are receiving this because a member contacted you through the GlobalNL members portal at http://members.globalnl.com
Reply to this email to respond, your email address will be viewable by the recipient.`,
              "h:Reply-To": `${fromUserPrivateData.email}`
            };

          return mailgun
            .messages()
            .send(mailOptions)
            .then(() =>
              console.log(`Member '${fromUserId}' sent message to '${toUserId}'`)
            );
        }
      )
      .catch(error => console.log("Error sending message:", error));
  });
});

/**
 * Creates a configured LinkedIn API Client instance.
 */
function linkedInClient() {
  // LinkedIn OAuth 2 setup
  // TODO: Configure the `linkedin.client_id` and `linkedin.client_secret` Google Cloud environment variables.
  // Determines which project is being used and sets callback url accordingly

  let callbackUrl = "https://members.globalnl.com/login.html";
  if (functions.config().project.name == "globalnl-members") {
  }
  else if (functions.config().project.name == "globalnl-database-test") {
    callbackUrl = `https://memberstest.globalnl.com/login.html`;
  }
  else {
    console.log("project id is invalid: " + functions.config().project.name);
  }

 return require("node-linkedin")(
   functions.config().linkedin.client_id,
   functions.config().linkedin.client_secret,
   callbackUrl);
}

/**
 * Redirects the User to the LinkedIn authentication consent screen. ALso the 'state' cookie is set for later state
 * verification.
 */
exports.redirect = functions.https.onRequest((req, res) => {
  const Linkedin = linkedInClient();

  cookieParser()(req, res, () => {
    const state = req.cookies.state || crypto.randomBytes(20).toString("hex");
    //console.log('Setting verification state:', state);
    //res.setHeader('Cache-Control', 'private');
    res.cookie("state", state.toString(), {
      maxAge: 3600000,
      secure: true,
      httpOnly: true
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
        //throw new Error(
          console.log("Warning: State cookie not set or expired in token function. Continuing for now.")
        //);
      }
      else{
      console.log('Received state via cookie:', req.cookies.state);
      console.log('Received state via query: ', req.query.state);
      Linkedin.auth.authorize(OAUTH_SCOPES, req.query.state); // Makes sure the state parameter is set
      console.log('Received auth code:', req.query.code);
      Linkedin.auth.getAccessToken(
        res,
        req.query.code,
        req.query.state,
        (error, results) => {
          if (error) {
            throw error;
          }
          //console.log('Received Access Token:', results.access_token);
          const linkedin = Linkedin.init(results.access_token);
		  linkedin.people.email((error,userEmail) => {
          linkedin.people.me((error, userResults) => {
            if (error) {
              throw error;
            }
            //console.log(userResults);
			console.log(userEmail.elements[0]['handle~']['emailAddress']);
            // We have a LinkedIn access token and the user identity now.
            //results.access_token;
            // The UID we'll assign to the user is 1In_ plus the internal LinkedIn user reference which is unique for our API key (one)
            // userResults.id

            console.log(userResults);

            member = {
              first_name: userResults.firstName.localized[Object.keys(userResults.firstName.localized)[0]] || "",
              last_name: userResults.lastName.localized[Object.keys(userResults.lastName.localized)[0]] || "",
              //display_name: userResults.formattedName || "",
              //headline: userResults.headline || "",
              //industry: userResults.industry || "",
              //linkedin_profile: userResults.publicProfileUrl || "",
              //photoURL: userResults.pictureUrl || "",
              //current_address: {
              //  LinkedInLocation: userResults.location.name || ""
              //},
              copied_account: false,
			  linkedInChange: true
            };
			console.log(member);
            // Create a Firebase account and get the Custom Auth Token.
            return createFirebaseAccount(
              "00LI_" + userResults.id,
              member.first_name + ' ' + member.last_name,
              '',//userResults.pictureUrl,
              userEmail.elements[0]['handle~']['emailAddress']
            ).then(firebaseToken => {
              // Serve an HTML page that signs the user in and updates the user profile.
              return res.jsonp({
                token: firebaseToken
              });
            });
          });
		});
        }
      );
    }});
  } catch (error) {
    console.log("Error in cookie loading etc", error.toString());
    return res.jsonp({
      error: error.toString
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
function createFirebaseAccount(uid, displayName, photoURL, email) {
  // Save the access token to the Firebase Realtime Database.
  // Taking out now, if add back replace in Promises at end
  //const databaseTask = admin.database().ref(`/linkedInAccessToken/${uid}`).set(accessToken);

  // Create or update the user account.
  const userTokenTask = admin
    .auth()
    .updateUser(uid, {
      displayName: displayName,
      //photoURL: photoURL,
      email: email,
      emailVerified: true
    })
    .catch(error => {
      // If user does not exists we create it.
      if (error.code === "auth/user-not-found") {
        console.log("Attempting to create a new account for: ", email);
        //var uidOld;
        // Create user account
        const createUserTask = admin
          .auth()
          .createUser({
            uid: uid,
            displayName: displayName,
            //photoURL: photoURL,
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
        const searchExistingUserTask = db
          .collection("private_data")
          .where("email", "==", email)
          .get()
          .then(querySnapshot => {
            if (querySnapshot.docs.length > 0) {
              console.log(
                "Found existing user for ",
                email,
                " ==> ",
                querySnapshot.docs[0].id
              );
              member.uid_old = querySnapshot.docs[0].id;
              if (querySnapshot.docs[0].data().interests != undefined)
                private_data.interests = querySnapshot.docs[0].data().interests;
              if (querySnapshot.docs[0].data().comments != undefined)
                private_data.comments = querySnapshot.docs[0].data().comments;
              return db
                .collection("members")
                .doc(querySnapshot.docs[0].id)
                .get();
            }
            console.log("Unable to find existing user for ", email);
            return false;
          })
          .then(doc => {
            if (doc && doc.exists) {
              console.log("Found existing member record for ", email);
              if (doc.data().current_address != undefined)
                member.current_address = doc.data().current_address;
              if (doc.data().hometown_address != undefined)
                member.hometown_address = doc.data().hometown_address;
              if (doc.data().privacy != undefined)
                member.privacy = doc.data().privacy;
              member.date_updated = "-1"; //Set to -1 to trigger profile form update
              return db
                .collection("members")
                .doc(doc.id)
                .set(
                  {
                    copied_account: true,
                    uid_new: uid
                  },
                  { merge: true }
                );
            }
            console.log("Didn't find existing member record for ", email);
            return true;
          })
          .catch(function(error) {
            console.log("Error in searchExistingUserTask: ", error);
          });
        return Promise.all([createUserTask, searchExistingUserTask]).then(
          () => {
            return false;
          }
        );
      } // END IF
      throw error;
    }) // END Catch
    .then(() => {
      const token = admin.auth().createCustomToken(uid);

      console.log("About to write member database record: ", uid);

      private_data.email = email || "";

      console.log(private_data);
      console.log(member);

      const privateDatabaseTask = db
        .collection("private_data")
        .doc(uid)
        .set(private_data, { merge: true })
        .catch(function(error) {
          console.log(error);
          console.log("Error writing private database properties for ", uid);
        });
      const memberDatabaseTask = db
        .collection("members")
        .doc(uid)
        .set(member, { merge: true })
        .catch(function(error) {
          console.log(error);
          console.log("Error writing public database properties for ", uid);
        });
      return Promise.all([token, memberDatabaseTask, privateDatabaseTask]).then(
        () => {
          // Create a Firebase custom auth token.
          return token;
        }
      );
    });
  return userTokenTask; //holds value of token
}

// Sends a welcome email to the given user.
function sendWelcomeEmail(email, displayName) {
  const mailOptions = {
    from: `Global NL <connect@globalnl.com>`,
    to: `globalnlnetwork@gmail.com`,
    subject: `GlobalNL New Member Signup`
  };

  mailOptions.text = displayName + " (" + email + ") has signed up at members.globalnl.com";

  return mailgun
    .messages()
    .send(mailOptions)
    .then(() => {
      return console.log("New member signup email notification sent to GlobalNL: " + displayName + " (" + email + ")");
    });
}
