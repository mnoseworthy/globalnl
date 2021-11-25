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
  domain: "email.globalnl.com"
});

//Mailchimp Setup
const mailchimpKey = functions.config().mailchimp.key;
const mailchimpListID = functions.config().mailchimp.list_id;
const Mailchimp = require('mailchimp-api-v3')
const mailchimp = new Mailchimp(mailchimpKey);

// Firebase Setup
const admin = require("firebase-admin");


var serviceAccount = require(`./${functions.config().project.name}-service-account.json`);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${functions.config().project.name}.firebaseio.com`,
  storageBucket: `https://${functions.config().project.name}.appspot.com`
});
var db = admin.firestore();
const settings = {
  timestampsInSnapshots: true
};
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
      `/lists/${mailchimpListID}/members`, {
        email_address: email,
        status: 'subscribed',
        merge_fields: {
          FNAME: displayName
        }
      }
    )
    .then((response) => {
      console.log(email + ' added to Mailchimp');
      console.log(response);
    }));
  return Promise.all(promiseArray)
    .catch(err => {
      console.error(err);
    });
});

exports.sendMessageToUser = functions.https.onCall((data, context) => {
  const {
    auth
  } = context,
  isAuthed = Boolean(auth),
    MAX_MESSAGES_PER_DAY = 25;

  if (!isAuthed || !data || !data.toUserId || !data.message) {
    console.log("Error sending message:", isAuthed, data);
    return;
  }

  const fromUserId = auth.uid,
    {
      toUserId,
      message
    } = data,
    members = db.collection("members"),
    privateData = db.collection("private_data"),
    fromUserPrivateDataDoc = privateData.doc(fromUserId);

  return privateData.doc(fromUserId).get().then(fromUserSnapshot => {
    const fromUserPrivateData = fromUserSnapshot.data(),
      today = new Date();

    let {
      send_message_date,
      send_message_count
    } = fromUserPrivateData;

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

    const upateSendMessageDateAndCount = fromUserPrivateDataDoc.set({
        send_message_date,
        send_message_count
      }, {
        merge: true
      }),
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
 * @param requestFromApp boolean indicating if the request is coming from the mobile application to set callbackUrl accordingly.
 */
function linkedInClient(requestFromApp) {
  // LinkedIn OAuth 2 setup
  // TODO: Configure the `linkedin.client_id` and `linkedin.client_secret` Google Cloud environment variables.
  // Determines which project is being used and sets callback url accordingly

  let callbackUrl = "https://members.globalnl.com/login.html";
  if (functions.config().project.name == "globalnl-members") {
    if (requestFromApp)
      callbackUrl = `https://app.globalnl.com/login.html`;
  } else if (functions.config().project.name == "globalnl-database-test") {
    if (requestFromApp) {
      callbackUrl = `https://apptest.globalnl.com/login.html`;
    } else {
      callbackUrl = `https://memberstest.globalnl.com/login.html`;
    }
  } else {
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
  const {
    headers
  } = req;
  const userAgent = headers["user-agent"];
  console.log(userAgent);

  let Linkedin;

  if (userAgent.indexOf('gonative') > -1) { // condition true if app usage is coming from the mobile application
    Linkedin = linkedInClient(true); // callbackUrl will be set as the mobile app specific Url
  } else {
    Linkedin = linkedInClient(false); // callbackUrl will be set as the non-mobile app specific Url
  }

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
  console.log("redirect complete");
});

/**
 * Exchanges a given LinkedIn auth code passed in the 'code' URL query parameter for a Firebase auth token.
 * The request also needs to specify a 'state' query parameter which will be checked against the 'state' cookie.
 * The Firebase custom auth token is sent back in a JSONP callback function with function name defined by the
 * 'callback' query parameter.
 */
exports.token = functions.https.onRequest((req, res) => {
  const {
    headers
  } = req;
  const userAgent = headers["user-agent"];
  console.log(userAgent);

  let Linkedin;

  if (userAgent.indexOf('gonative') > -1) { // condition true if app usage is coming from the mobile application       
    Linkedin = linkedInClient(true); // callbackUrl will be set as the mobile app specific Url
  } else {
    Linkedin = linkedInClient(false); // callbackUrl will be set as the non-mobile app specific Url
  }

  try {
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
        const linkedin = Linkedin.init(results.access_token);
        linkedin.people.email((error, userEmail) => {
          if (error) {
            throw error;
          }
          linkedin.people.me((error, userResults) => {
            if (error) {
              throw error;
            }
            // We have a LinkedIn access token and the user identity now.

            member = {
              first_name: userResults.firstName.localized[Object.keys(userResults.firstName.localized)[0]] || "",
              last_name: userResults.lastName.localized[Object.keys(userResults.lastName.localized)[0]] || "",
              photoURL: "",
              date_signedin: Date.now()
            };

            // Create a Firebase account and get the Custom Auth Token.
            return createFirebaseAccount(
              "00LI_" + userResults.id,
              member.first_name + ' ' + member.last_name,
              userResults.profilePicture['displayImage~'].elements[0].identifiers[0].identifier, //userResults.pictureUrl,
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
  } catch (error) {
    console.log("Error in token function, LinkedIn requests, Firebase Account update/creation", error.toString());
    return res.jsonp({
      error: error.toString
    });
  }
  //res.setHeader('Cache-Control', 'private');  
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
      email: email,
      emailVerified: true
    })
    .catch(error => {
      // If user does not exists we create it.
      console.log(error);
      if (error.code === "auth/user-not-found") {
        console.log("Attempting to create a new account for: ", email);
        // Create user account
        const createUserTask = admin
          .auth()
          .createUser({
            uid: uid,
            displayName: displayName,
            photoURL: photoURL,
            email: email,
            emailVerified: true
          })
          .catch(function (error) {
            console.log("Error in createUserTask: ", error);
          });
        return Promise.all([createUserTask]).then(
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
        .set(private_data, {
          merge: true
        })
        .catch(function (error) {
          console.log(error);
          console.log("Error writing private database properties for ", uid);
        });
      const memberDatabaseTask = db
        .collection("members")
        .doc(uid)
        .set(member, {
          merge: true
        })
        .catch(function (error) {
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
    to: `connect@globalnl.com`,
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

// Randomizes default member view
exports.dbSet = functions.pubsub.schedule('11 * * * *')
  .timeZone('America/New_York') // Users can choose timezone - default is America/Los_Angeles
  .onRun((context) => {
    console.log('Testing function');
    let count = 0; //counts number of members that are iterated through (not really used, can probably remove)
    let batchNum = 0; // used to index batches in the batch array
    let promiseArray = []; // needed for the promise.all
    let alpha = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]; // all letters
    let date = new Date(); // creates new date object
    let currentHour = date.getHours(); // returns the hour from the date (from 0 to 23)
    let startLetter = alpha[currentHour]; // uses current hour as an index to get the start letter
    let endLetter = alpha[currentHour + 1]; // gets end letter in same way
    if (currentHour == 23) { // condition to account for end letters that would get missed as 23 hours won't hit all letters
      endLetter = 'Z'; // at hour 23, startletter=W and endletter=Z to hit all letters in a day
    } // there aren't too many entries at those letters so it works without limit issues

    // gets users from database with last names between the two letters, limited to 500 users (no issues there yet anyway)
    let randUpdate = db.collection("members")
      .orderBy("last_name")
      .startAt(startLetter)
      .endAt(endLetter)
      .limit(500).get()
      .then(snapshot => {
        console.log("Returned " + snapshot._size + " member records between " + startLetter + " and " + endLetter);
        // used to set limit for number of users for a single batch
        let limit = 50;
        // Get a new write batch
        let batch = [];
        batch[0] = db.batch();
        snapshot.forEach(doc => {
          count = count + 1;
          // condition to reset the limit and batch when the limit is hit
          if (limit == 0) {
            // commits the batch and pushes it to the promise array
            promiseArray.push(batch[batchNum].commit().then(function () {
              console.log("Database update complete for batch # " + (batchNum + 1) + " (mid)");
            }));
            batchNum = batchNum + 1; // increases the batch number to be used as an index for the batch array
            batch[batchNum] = db.batch(); // starts a new batch in the next position of the batch array
            limit = 50; // resets the limit
          }
          // adds the random update to the batch
          batch[batchNum].update(db.collection("members").doc(doc.id), {
            random: Math.ceil(Math.random(1000) * 1000) // the random number is set with some math functions
          });
          limit = limit - 1; // decrease the limit after the batch update is created
        });
        // commits the last batch and pushes it to the promise array after all users have been interated through
        promiseArray.push(batch[batchNum].commit().then(function () {
          console.log("Database update complete for batch # " + (batchNum + 1) + " (end)");
        }));
      })
      // catches and logs any errors
      .catch(err => {
        console.log('Error getting documents ', err);
      });
    // returns a promise to ensure the function is completed
    return Promise.all(promiseArray).then(() => {
      console.log("Completing function for records between " + startLetter + " and " + endLetter);
    });
  });

exports.addUser = functions.auth.user().onCreate(user => {
  console.log ("Step 1 complete")
  const email = user.email;
  const uid = user.uid;
  console.log ("trying to access the addUser function")
  addUser(email,uid);
});

function addUser(email, uid){
  db.collection('private_data').doc(uid).get()
  .then(uid => {
    if (uid.exists) {
      console.log("The user's UID is already in the database");

    } else {
      const query = db.collection('private_data').where('email', '==', email);
      query.get()
        .then((querySnapshot) => {
          if (querySnapshot.docs.length > 0) {
            console.log("The user's Google email already in the database " + querySnapshot.docs[0].id);
          } else if (querySnapshot.docs.length <= 0) {
            console.log("user's email doesn't exist")
            db.collection('private_data').doc(uid).set({
              email: email
            }, {
              merge: true
            });
            console.log("user is added");
          }
        })
    }
  });
}