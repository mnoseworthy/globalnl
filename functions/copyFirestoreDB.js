const firebase = require('firebase-admin');

var serviceAccountSource = require("./globalnl-database-service-account.json"); // source DB key
var serviceAccountDestination = require("./globalnl-members-service-account.json"); // destiny DB key

const sourceAdmin = firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccountSource)
});

const destinationAdmin = firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccountDestination)
}, "destination");

/* this schema is how your DB is organized in a tree structure. You don't have to care about the Documents
  but you do need to inform the name of your collections and any subcollections, in this
  case we have two collections called users and groups, the all have their documents, but 
  the collection users has its own subcollections, friends and groups, which again have their
  own subcollection, messages.
*/
const schema = {
  //members: {
 //   current_address: {},
  //  hometown_address: {}
 //   },
  moderators: {},
  private_data: {
	interests: {}
  }
};

var source = sourceAdmin.firestore();
var destination = destinationAdmin.firestore();

const copy = (sourceDBrep, destinationDBref, schema) => {
  return Promise.all(Object.keys(schema).map((collection) => {
    return sourceDBrep.collection(collection).get()
      .then((data) => {
        let promises = [];
        data.forEach((doc) => {
          const data = doc.data();
		  //if(doc.id.length > 25){
			  //data.copied_account = false;
		  //}
          promises.push(
            destinationDBref.collection(collection).doc(doc.id).set(data).then((data) => {
              return copy(sourceDBrep.collection(collection).doc(doc.id),
              destinationDBref.collection(collection).doc(doc.id),
              schema[collection])
            })
          ); 
        })
      return Promise.all(promises);
    })
  }));
};

copy(source, destination, schema).then(() => {
  console.log('copied');
});

