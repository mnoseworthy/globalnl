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

// Firebase Setup
const admin = require("firebase-admin");

var serviceAccount = require("./globalnl-members-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`
});
var db = admin.firestore();
const settings = { timestampsInSnapshots: true };
db.settings(settings);

const OAUTH_SCOPES = ["r_basicprofile", "r_emailaddress"];

var member = {};
var private_data = {};

/**
 * Sends welcome email to new users
 */

exports.sendWelcomeEmail = functions.auth.user().onCreate(user => {
  const email = user.email; // The email of the user.
  const displayName = user.displayName; // The display name of the user.
  try {
    return sendWelcomeEmail(email, displayName);
  } catch (err) {
    console.error(err);
  }
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
  return require("node-linkedin")(
    functions.config().linkedin.client_id,
    functions.config().linkedin.client_secret,
    `https://members.globalnl.com/login.html`
  );
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
        throw new Error(
          "State cookie not set or expired. Maybe you took too long to authorize. Please try again."
        );
      }
      //console.log('Received verification state:', req.cookies.state);
      Linkedin.auth.authorize(OAUTH_SCOPES, req.cookies.state); // Makes sure the state parameter is set
      //console.log('Received auth code:', req.query.code);
      //console.log('Received state:', req.query.state);
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
              first_name:
                userResults.firstName.charAt(0).toUpperCase() +
                  userResults.firstName.substr(1).toLowerCase() || "",
              last_name:
                userResults.lastName.charAt(0).toUpperCase() +
                  userResults.lastName.substr(1).toLowerCase() || "",
              display_name: userResults.formattedName || "",
              headline: userResults.headline || "",
              industry: userResults.industry || "",
              linkedin_profile: userResults.publicProfileUrl || "",
              photoURL: userResults.pictureUrl || "",
              current_address: {
                LinkedInLocation: userResults.location.name || ""
              },
              copied_account: false
            };
            //console.log(member);
            // Create a Firebase account and get the Custom Auth Token.
            return createFirebaseAccount(
              "00LI_" + userResults.id,
              userResults.formattedName,
              userResults.pictureUrl,
              userResults.emailAddress
            ).then(firebaseToken => {
              // Serve an HTML page that signs the user in and updates the user profile.
              return res.jsonp({
                token: firebaseToken
              });
            });
          });
        }
      );
    });
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
      photoURL: photoURL,
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
    to: email,
    bcc: `globalnlnetwork@gmail.com`,
    subject: `Welcome to Global NL!`
  };

  mailOptions.html = `<!doctype html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
        <!-- NAME: 1 COLUMN -->
        <!--[if gte mso 15]>
        <xml>
            <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
        <![endif]-->
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Welcome to Global NL</title>
        
    <style type="text/css">
		p{
			margin:10px 0;
			padding:0;
		}
		table{
			border-collapse:collapse;
		}
		h1,h2,h3,h4,h5,h6{
			display:block;
			margin:0;
			padding:0;
		}
		img,a img{
			border:0;
			height:auto;
			outline:none;
			text-decoration:none;
		}
		body,#bodyTable,#bodyCell{
			height:100%;
			margin:0;
			padding:0;
			width:100%;
		}
		.mcnPreviewText{
			display:none !important;
		}
		#outlook a{
			padding:0;
		}
		img{
			-ms-interpolation-mode:bicubic;
		}
		table{
			mso-table-lspace:0pt;
			mso-table-rspace:0pt;
		}
		.ReadMsgBody{
			width:100%;
		}
		.ExternalClass{
			width:100%;
		}
		p,a,li,td,blockquote{
			mso-line-height-rule:exactly;
		}
		a[href^=tel],a[href^=sms]{
			color:inherit;
			cursor:default;
			text-decoration:none;
		}
		p,a,li,td,body,table,blockquote{
			-ms-text-size-adjust:100%;
			-webkit-text-size-adjust:100%;
		}
		.ExternalClass,.ExternalClass p,.ExternalClass td,.ExternalClass div,.ExternalClass span,.ExternalClass font{
			line-height:100%;
		}
		a[x-apple-data-detectors]{
			color:inherit !important;
			text-decoration:none !important;
			font-size:inherit !important;
			font-family:inherit !important;
			font-weight:inherit !important;
			line-height:inherit !important;
		}
		#bodyCell{
			padding:10px;
		}
		.templateContainer{
			max-width:600px !important;
		}
		a.mcnButton{
			display:block;
		}
		.mcnImage,.mcnRetinaImage{
			vertical-align:bottom;
		}
		.mcnTextContent{
			word-break:break-word;
		}
		.mcnTextContent img{
			height:auto !important;
		}
		.mcnDividerBlock{
			table-layout:fixed !important;
		}
		body,#bodyTable{
			background-color:#FAFAFA;
		}
		#bodyCell{
			border-top:0;
		}
		.templateContainer{
			border:0;
		}
		h1{
			color:#202020;
			font-family:Helvetica;
			font-size:26px;
			font-style:normal;
			font-weight:bold;
			line-height:125%;
			letter-spacing:normal;
			text-align:left;
		}
		h2{
			color:#202020;
			font-family:Helvetica;
			font-size:22px;
			font-style:normal;
			font-weight:bold;
			line-height:125%;
			letter-spacing:normal;
			text-align:left;
		}
		h3{
			color:#202020;
			font-family:Helvetica;
			font-size:20px;
			font-style:normal;
			font-weight:bold;
			line-height:125%;
			letter-spacing:normal;
			text-align:left;
		}
		h4{
			color:#202020;
			font-family:Helvetica;
			font-size:18px;
			font-style:normal;
			font-weight:bold;
			line-height:125%;
			letter-spacing:normal;
			text-align:left;
		}
		#templatePreheader{
			background-color:#FAFAFA;
			background-image:none;
			background-repeat:no-repeat;
			background-position:center;
			background-size:cover;
			border-top:0;
			border-bottom:0;
			padding-top:9px;
			padding-bottom:9px;
		}
		#templatePreheader .mcnTextContent,#templatePreheader .mcnTextContent p{
			color:#656565;
			font-family:Helvetica;
			font-size:12px;
			line-height:150%;
			text-align:left;
		}
		#templatePreheader .mcnTextContent a,#templatePreheader .mcnTextContent p a{
			color:#656565;
			font-weight:normal;
			text-decoration:underline;
		}
		#templateHeader{
			background-color:#FFFFFF;
			background-image:none;
			background-repeat:no-repeat;
			background-position:center;
			background-size:cover;
			border-top:0;
			border-bottom:0;
			padding-top:9px;
			padding-bottom:0;
		}
		#templateHeader .mcnTextContent,#templateHeader .mcnTextContent p{
			color:#202020;
			font-family:Helvetica;
			font-size:16px;
			line-height:150%;
			text-align:left;
		}
		#templateHeader .mcnTextContent a,#templateHeader .mcnTextContent p a{
			color:#2BAADF;
			font-weight:normal;
			text-decoration:underline;
		}
		#templateBody{
			background-color:#FFFFFF;
			background-image:none;
			background-repeat:no-repeat;
			background-position:center;
			background-size:cover;
			border-top:0;
			border-bottom:2px solid #EAEAEA;
			padding-top:0;
			padding-bottom:9px;
		}
		#templateBody .mcnTextContent,#templateBody .mcnTextContent p{
			color:#202020;
			font-family:Helvetica;
			font-size:16px;
			line-height:150%;
			text-align:left;
		}
		#templateBody .mcnTextContent a,#templateBody .mcnTextContent p a{
			color:#2BAADF;
			font-weight:normal;
			text-decoration:underline;
		}
		#templateFooter{
			background-color:#FAFAFA;
			background-image:none;
			background-repeat:no-repeat;
			background-position:center;
			background-size:cover;
			border-top:0;
			border-bottom:0;
			padding-top:9px;
			padding-bottom:9px;
		}
		#templateFooter .mcnTextContent,#templateFooter .mcnTextContent p{
			color:#656565;
			font-family:Helvetica;
			font-size:12px;
			line-height:150%;
			text-align:center;
		}
		#templateFooter .mcnTextContent a,#templateFooter .mcnTextContent p a{
			color:#656565;
			font-weight:normal;
			text-decoration:underline;
		}
	@media only screen and (min-width:768px){
		.templateContainer{
			width:600px !important;
		}

}	@media only screen and (max-width: 480px){
		body,table,td,p,a,li,blockquote{
			-webkit-text-size-adjust:none !important;
		}

}	@media only screen and (max-width: 480px){
		body{
			width:100% !important;
			min-width:100% !important;
		}

}	@media only screen and (max-width: 480px){
		#bodyCell{
			padding-top:10px !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnRetinaImage{
			max-width:100% !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnImage{
			width:100% !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnCartContainer,.mcnCaptionTopContent,.mcnRecContentContainer,.mcnCaptionBottomContent,.mcnTextContentContainer,.mcnBoxedTextContentContainer,.mcnImageGroupContentContainer,.mcnCaptionLeftTextContentContainer,.mcnCaptionRightTextContentContainer,.mcnCaptionLeftImageContentContainer,.mcnCaptionRightImageContentContainer,.mcnImageCardLeftTextContentContainer,.mcnImageCardRightTextContentContainer,.mcnImageCardLeftImageContentContainer,.mcnImageCardRightImageContentContainer{
			max-width:100% !important;
			width:100% !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnBoxedTextContentContainer{
			min-width:100% !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnImageGroupContent{
			padding:9px !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnCaptionLeftContentOuter .mcnTextContent,.mcnCaptionRightContentOuter .mcnTextContent{
			padding-top:9px !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnImageCardTopImageContent,.mcnCaptionBottomContent:last-child .mcnCaptionBottomImageContent,.mcnCaptionBlockInner .mcnCaptionTopContent:last-child .mcnTextContent{
			padding-top:18px !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnImageCardBottomImageContent{
			padding-bottom:9px !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnImageGroupBlockInner{
			padding-top:0 !important;
			padding-bottom:0 !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnImageGroupBlockOuter{
			padding-top:9px !important;
			padding-bottom:9px !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnTextContent,.mcnBoxedTextContentColumn{
			padding-right:18px !important;
			padding-left:18px !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnImageCardLeftImageContent,.mcnImageCardRightImageContent{
			padding-right:18px !important;
			padding-bottom:0 !important;
			padding-left:18px !important;
		}

}	@media only screen and (max-width: 480px){
		.mcpreview-image-uploader{
			display:none !important;
			width:100% !important;
		}

}	@media only screen and (max-width: 480px){
		h1{
			font-size:22px !important;
			line-height:125% !important;
		}

}	@media only screen and (max-width: 480px){
		h2{
			font-size:20px !important;
			line-height:125% !important;
		}

}	@media only screen and (max-width: 480px){
		h3{
			font-size:18px !important;
			line-height:125% !important;
		}

}	@media only screen and (max-width: 480px){
		h4{
			font-size:16px !important;
			line-height:150% !important;
		}

}	@media only screen and (max-width: 480px){
		.mcnBoxedTextContentContainer .mcnTextContent,.mcnBoxedTextContentContainer .mcnTextContent p{
			font-size:14px !important;
			line-height:150% !important;
		}

}	@media only screen and (max-width: 480px){
		#templatePreheader{
			display:block !important;
		}

}	@media only screen and (max-width: 480px){
		#templatePreheader .mcnTextContent,#templatePreheader .mcnTextContent p{
			font-size:14px !important;
			line-height:150% !important;
		}

}	@media only screen and (max-width: 480px){
		#templateHeader .mcnTextContent,#templateHeader .mcnTextContent p{
			font-size:16px !important;
			line-height:150% !important;
		}

}	@media only screen and (max-width: 480px){
		#templateBody .mcnTextContent,#templateBody .mcnTextContent p{
			font-size:16px !important;
			line-height:150% !important;
		}

}	@media only screen and (max-width: 480px){
		#templateFooter .mcnTextContent,#templateFooter .mcnTextContent p{
			font-size:14px !important;
			line-height:150% !important;
		}

}</style></head>
    <body style="height: 100%;margin: 0;padding: 0;width: 100%;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;background-color: #FAFAFA;">
        <center>
            <table align="center" border="0" cellpadding="0" cellspacing="0" height="100%" width="100%" id="bodyTable" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;height: 100%;margin: 0;padding: 0;width: 100%;background-color: #FAFAFA;">
                <tr>
                    <td align="center" valign="top" id="bodyCell" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;height: 100%;margin: 0;padding: 10px;width: 100%;border-top: 0;">
                        <!-- BEGIN TEMPLATE // -->
                        <!--[if (gte mso 9)|(IE)]>
                        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
                        <tr>
                        <td align="center" valign="top" width="600" style="width:600px;">
                        <![endif]-->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="templateContainer" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;border: 0;max-width: 600px !important;">
                            <tr>
                                <td valign="top" id="templatePreheader" style="background:#FAFAFA none no-repeat center/cover;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;background-color: #FAFAFA;background-image: none;background-repeat: no-repeat;background-position: center;background-size: cover;border-top: 0;border-bottom: 0;padding-top: 9px;padding-bottom: 9px;">
								</td>
                            </tr>
                            <tr>
                                <td valign="top" id="templateHeader" style="background:#FFFFFF none no-repeat center/cover;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;background-color: #FFFFFF;background-image: none;background-repeat: no-repeat;background-position: center;background-size: cover;border-top: 0;border-bottom: 0;padding-top: 9px;padding-bottom: 0;"><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnImageBlock" style="min-width: 100%;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
    <tbody class="mcnImageBlockOuter">
            <tr>
                <td valign="top" style="padding: 9px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;" class="mcnImageBlockInner">
                    <table align="left" width="100%" border="0" cellpadding="0" cellspacing="0" class="mcnImageContentContainer" style="min-width: 100%;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                        <tbody><tr>
                            <td class="mcnImageContent" valign="top" style="padding-right: 9px;padding-left: 9px;padding-top: 0;padding-bottom: 0;text-align: center;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                                
                                    <a href="www.globalnl.com" title="" class="" target="_blank" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                                        <img align="center" alt="" src="https://gallery.mailchimp.com/bcd3fbb1ca02cfc018e5cf6ea/images/e6e2e4bb-1c9c-4531-8893-ca9edb7b1912.jpg" width="564" style="max-width: 1023px;padding-bottom: 0;display: inline !important;vertical-align: bottom;border: 0;height: auto;outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;" class="mcnImage">
                                    </a>
                                
                            </td>
                        </tr>
                    </tbody></table>
                </td>
            </tr>
    </tbody>
</table><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnDividerBlock" style="min-width: 100%;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;table-layout: fixed !important;">
    <tbody class="mcnDividerBlockOuter">
        <tr>
            <td class="mcnDividerBlockInner" style="min-width: 100%;padding: 18px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <table class="mcnDividerContent" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;border-top-width: 2px;border-top-style: solid;border-top-color: #EAEAEA;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                    <tbody><tr>
                        <td style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                            <span></span>
                        </td>
                    </tr>
                </tbody></table>
<!--            
                <td class="mcnDividerBlockInner" style="padding: 18px;">
                <hr class="mcnDividerContent" style="border-bottom-color:none; border-left-color:none; border-right-color:none; border-bottom-width:0; border-left-width:0; border-right-width:0; margin-top:0; margin-right:0; margin-bottom:0; margin-left:0;" />
-->
            </td>
        </tr>
    </tbody>
</table><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnTextBlock" style="min-width: 100%;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
    <tbody class="mcnTextBlockOuter">
        <tr>
            <td valign="top" class="mcnTextBlockInner" style="padding-top: 9px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
              	<!--[if mso]>
				<table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
				<tr>
				<![endif]-->
			    
				<!--[if mso]>
				<td valign="top" width="600" style="width:600px;">
				<![endif]-->
                <table align="left" border="0" cellpadding="0" cellspacing="0" style="max-width: 100%;min-width: 100%;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;" width="100%" class="mcnTextContentContainer">
                    <tbody><tr>
                        
                        <td valign="top" class="mcnTextContent" style="padding-top: 0;padding-right: 18px;padding-bottom: 9px;padding-left: 18px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;word-break: break-word;color: #202020;font-family: Helvetica;font-size: 16px;line-height: 150%;text-align: left;">
                        
                            Welcome ${displayName || ""}!<br>
<br>
Thanks for showing interest in GlobalNL. The 4 steps outlined below will provide access to the tools that the community of volunteers are using to build and grow GlobalNL.  If you have any questions or issues, please reach out to connect@globalnl.com. <br>
<br>
We need people like you to take this initiative to the next level; thanks again for your interest.
                        </td>
                    </tr>
                </tbody></table>
				<!--[if mso]>
				</td>
				<![endif]-->
                
				<!--[if mso]>
				</tr>
				</table>
				<![endif]-->
            </td>
        </tr>
    </tbody>
</table></td>
                            </tr>
                            <tr>
                                <td valign="top" id="templateBody" style="background:#FFFFFF none no-repeat center/cover;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;background-color: #FFFFFF;background-image: none;background-repeat: no-repeat;background-position: center;background-size: cover;border-top: 0;border-bottom: 2px solid #EAEAEA;padding-top: 0;padding-bottom: 9px;"><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnDividerBlock" style="min-width: 100%;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;table-layout: fixed !important;">
    <tbody class="mcnDividerBlockOuter">
        <tr>
            <td class="mcnDividerBlockInner" style="min-width: 100%;padding: 18px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <table class="mcnDividerContent" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;border-top-width: 2px;border-top-style: solid;border-top-color: #EAEAEA;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                    <tbody><tr>
                        <td style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                            <span></span>
                        </td>
                    </tr>
                </tbody></table>
<!--            
                <td class="mcnDividerBlockInner" style="padding: 18px;">
                <hr class="mcnDividerContent" style="border-bottom-color:none; border-left-color:none; border-right-color:none; border-bottom-width:0; border-left-width:0; border-right-width:0; margin-top:0; margin-right:0; margin-bottom:0; margin-left:0;" />
-->
            </td>
        </tr>
    </tbody>
</table><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnCaptionBlock" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
    <tbody class="mcnCaptionBlockOuter">
        <tr>
            <td class="mcnCaptionBlockInner" valign="top" style="padding: 9px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                

<table border="0" cellpadding="0" cellspacing="0" class="mcnCaptionLeftContentOuter" width="100%" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
    <tbody><tr>
        <td valign="top" class="mcnCaptionLeftContentInner" style="padding: 0 9px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
            <table align="right" border="0" cellpadding="0" cellspacing="0" class="mcnCaptionLeftImageContentContainer" width="264" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <tbody><tr>
                    <td class="mcnCaptionLeftImageContent" align="center" valign="top" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                    
                        
                        <img alt="" src="https://gallery.mailchimp.com/bcd3fbb1ca02cfc018e5cf6ea/images/b1e0d820-3dd4-4c3d-b8af-b5ec7e777e32.jpg" width="162" style="max-width: 162px;border: 0;height: auto;outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;vertical-align: bottom;" class="mcnImage">
                        
                    
                    </td>
                </tr>
            </tbody></table>
            <table class="mcnCaptionLeftTextContentContainer" align="left" border="0" cellpadding="0" cellspacing="0" width="264" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <tbody><tr>
                    <td valign="top" class="mcnTextContent" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;word-break: break-word;color: #202020;font-family: Helvetica;font-size: 16px;line-height: 150%;text-align: left;">
                        <div><span style="font-size:24px"><strong>Step 1 </strong><br>
Pick a project or team <br>
<a href="https://docs.google.com/spreadsheets/d/1JdAmWfgiDVzjz-_ZvXIm7k3yNg43jfQ43hQMO7Brhu0/edit?usp=sharing" target="_blank" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color: #2BAADF;font-weight: normal;text-decoration: underline;">Click here </a></span></div>

                    </td>
                </tr>
            </tbody></table>
        </td>
    </tr>
</tbody></table>





            </td>
        </tr>
    </tbody>
</table><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnDividerBlock" style="min-width: 100%;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;table-layout: fixed !important;">
    <tbody class="mcnDividerBlockOuter">
        <tr>
            <td class="mcnDividerBlockInner" style="min-width: 100%;padding: 18px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <table class="mcnDividerContent" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;border-top-width: 2px;border-top-style: solid;border-top-color: #EAEAEA;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                    <tbody><tr>
                        <td style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                            <span></span>
                        </td>
                    </tr>
                </tbody></table>
<!--            
                <td class="mcnDividerBlockInner" style="padding: 18px;">
                <hr class="mcnDividerContent" style="border-bottom-color:none; border-left-color:none; border-right-color:none; border-bottom-width:0; border-left-width:0; border-right-width:0; margin-top:0; margin-right:0; margin-bottom:0; margin-left:0;" />
-->
            </td>
        </tr>
    </tbody>
</table><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnCaptionBlock" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
    <tbody class="mcnCaptionBlockOuter">
        <tr>
            <td class="mcnCaptionBlockInner" valign="top" style="padding: 9px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                

<table border="0" cellpadding="0" cellspacing="0" class="mcnCaptionLeftContentOuter" width="100%" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
    <tbody><tr>
        <td valign="top" class="mcnCaptionLeftContentInner" style="padding: 0 9px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
            <table align="right" border="0" cellpadding="0" cellspacing="0" class="mcnCaptionLeftImageContentContainer" width="264" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <tbody><tr>
                    <td class="mcnCaptionLeftImageContent" align="center" valign="top" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                    
                        
                        <img alt="" src="https://gallery.mailchimp.com/bcd3fbb1ca02cfc018e5cf6ea/images/45643b02-4e5d-4881-bdd0-355d556b8d16.png" width="127" style="max-width: 127px;border: 0;height: auto;outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;vertical-align: bottom;" class="mcnImage">
                        
                    
                    </td>
                </tr>
            </tbody></table>
            <table class="mcnCaptionLeftTextContentContainer" align="left" border="0" cellpadding="0" cellspacing="0" width="264" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <tbody><tr>
                    <td valign="top" class="mcnTextContent" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;word-break: break-word;color: #202020;font-family: Helvetica;font-size: 16px;line-height: 150%;text-align: left;">
                        <span style="font-size:24px"><strong>Step 2 </strong><br>
Join GlobalNL Slack <br>
<a href="https://join.slack.com/t/globalnl/shared_invite/enQtNDIwMzIzMjc4MTUxLTJkNGU1OWRjZGRjMzdkNTAyODQ0ZDQyNDQ4NTU0ZjdiMzk1ZTEyNzIwNDE0MzEyZjhiZjcxYTc5Mzg1ZTA3OGU" target="_blank" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color: #2BAADF;font-weight: normal;text-decoration: underline;">Click here</a></span>
                    </td>
                </tr>
            </tbody></table>
        </td>
    </tr>
</tbody></table>





            </td>
        </tr>
    </tbody>
</table><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnDividerBlock" style="min-width: 100%;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;table-layout: fixed !important;">
    <tbody class="mcnDividerBlockOuter">
        <tr>
            <td class="mcnDividerBlockInner" style="min-width: 100%;padding: 18px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <table class="mcnDividerContent" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;border-top-width: 2px;border-top-style: solid;border-top-color: #EAEAEA;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                    <tbody><tr>
                        <td style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                            <span></span>
                        </td>
                    </tr>
                </tbody></table>
<!--            
                <td class="mcnDividerBlockInner" style="padding: 18px;">
                <hr class="mcnDividerContent" style="border-bottom-color:none; border-left-color:none; border-right-color:none; border-bottom-width:0; border-left-width:0; border-right-width:0; margin-top:0; margin-right:0; margin-bottom:0; margin-left:0;" />
-->
            </td>
        </tr>
    </tbody>
</table><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnCaptionBlock" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
    <tbody class="mcnCaptionBlockOuter">
        <tr>
            <td class="mcnCaptionBlockInner" valign="top" style="padding: 9px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                

<table border="0" cellpadding="0" cellspacing="0" class="mcnCaptionLeftContentOuter" width="100%" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
    <tbody><tr>
        <td valign="top" class="mcnCaptionLeftContentInner" style="padding: 0 9px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
            <table align="right" border="0" cellpadding="0" cellspacing="0" class="mcnCaptionLeftImageContentContainer" width="264" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <tbody><tr>
                    <td class="mcnCaptionLeftImageContent" align="center" valign="top" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                    
                        
                        <img alt="" src="https://gallery.mailchimp.com/bcd3fbb1ca02cfc018e5cf6ea/images/ad0eb37b-df73-429b-ad74-3b9e4f95a1a8.jpg" width="127" style="max-width: 127px;border: 0;height: auto;outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;vertical-align: bottom;" class="mcnImage">
                        
                    
                    </td>
                </tr>
            </tbody></table>
            <table class="mcnCaptionLeftTextContentContainer" align="left" border="0" cellpadding="0" cellspacing="0" width="264" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <tbody><tr>
                    <td valign="top" class="mcnTextContent" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;word-break: break-word;color: #202020;font-family: Helvetica;font-size: 16px;line-height: 150%;text-align: left;">
                        <span style="font-size:24px"><strong>Step 3</strong><br>
Access GlobalNL Resources <br>
<a href="https://drive.google.com/open?id=0B7oMeS0UmQ5sVVZCdnJuSTlBXzA" target="_blank" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color: #2BAADF;font-weight: normal;text-decoration: underline;">Click here</a></span><br>
 
                    </td>
                </tr>
            </tbody></table>
        </td>
    </tr>
</tbody></table>





            </td>
        </tr>
    </tbody>
</table><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnDividerBlock" style="min-width: 100%;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;table-layout: fixed !important;">
    <tbody class="mcnDividerBlockOuter">
        <tr>
            <td class="mcnDividerBlockInner" style="min-width: 100%;padding: 18px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <table class="mcnDividerContent" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;border-top-width: 2px;border-top-style: solid;border-top-color: #EAEAEA;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                    <tbody><tr>
                        <td style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                            <span></span>
                        </td>
                    </tr>
                </tbody></table>
<!--            
                <td class="mcnDividerBlockInner" style="padding: 18px;">
                <hr class="mcnDividerContent" style="border-bottom-color:none; border-left-color:none; border-right-color:none; border-bottom-width:0; border-left-width:0; border-right-width:0; margin-top:0; margin-right:0; margin-bottom:0; margin-left:0;" />
-->
            </td>
        </tr>
    </tbody>
</table><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnCaptionBlock" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
    <tbody class="mcnCaptionBlockOuter">
        <tr>
            <td class="mcnCaptionBlockInner" valign="top" style="padding: 9px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                

<table border="0" cellpadding="0" cellspacing="0" class="mcnCaptionLeftContentOuter" width="100%" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
    <tbody><tr>
        <td valign="top" class="mcnCaptionLeftContentInner" style="padding: 0 9px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
            <table align="right" border="0" cellpadding="0" cellspacing="0" class="mcnCaptionLeftImageContentContainer" width="264" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <tbody><tr>
                    <td class="mcnCaptionLeftImageContent" align="center" valign="top" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                    
                        
                        <img alt="" src="https://gallery.mailchimp.com/bcd3fbb1ca02cfc018e5cf6ea/images/a559110b-290a-4e00-8467-7655c1f1512c.jpg" width="134" style="max-width: 134px;border: 0;height: auto;outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;vertical-align: bottom;" class="mcnImage">
                        
                    
                    </td>
                </tr>
            </tbody></table>
            <table class="mcnCaptionLeftTextContentContainer" align="left" border="0" cellpadding="0" cellspacing="0" width="264" style="border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <tbody><tr>
                    <td valign="top" class="mcnTextContent" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;word-break: break-word;color: #202020;font-family: Helvetica;font-size: 16px;line-height: 150%;text-align: left;">
                        <span style="font-size:24px"><strong>Step 4</strong><br>
Track team meetings and events<br>
<a href="https://calendar.google.com/calendar?cid=bmw4N3FsdmkwdTYwZWoxOXA0cXFjbGZmZDRAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ" target="_blank" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color: #2BAADF;font-weight: normal;text-decoration: underline;">Click here </a></span>
                    </td>
                </tr>
            </tbody></table>
        </td>
    </tr>
</tbody></table>





            </td>
        </tr>
    </tbody>
</table><table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnDividerBlock" style="min-width: 100%;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;table-layout: fixed !important;">
    <tbody class="mcnDividerBlockOuter">
        <tr>
            <td class="mcnDividerBlockInner" style="min-width: 100%;padding: 18px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                <table class="mcnDividerContent" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;border-top-width: 2px;border-top-style: solid;border-top-color: #EAEAEA;border-collapse: collapse;mso-table-lspace: 0pt;mso-table-rspace: 0pt;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                    <tbody><tr>
                        <td style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
                            <span></span>
                        </td>
                    </tr>
                </tbody></table>
<!--            
                <td class="mcnDividerBlockInner" style="padding: 18px;">
                <hr class="mcnDividerContent" style="border-bottom-color:none; border-left-color:none; border-right-color:none; border-bottom-width:0; border-left-width:0; border-right-width:0; margin-top:0; margin-right:0; margin-bottom:0; margin-left:0;" />
-->
            </td>
        </tr>
    </tbody>
</table></td>
                            </tr>
                        </table>
                        <!--[if (gte mso 9)|(IE)]>
                        </td>
                        </tr>
                        </table>
                        <![endif]-->
                        <!-- // END TEMPLATE -->
                    </td>
                </tr>
            </table>
        </center>
    </body>
</html>`;
  return mailgun
    .messages()
    .send(mailOptions)
    .then(() => {
      return console.log("New welcome email sent to:", email);
    });
}
