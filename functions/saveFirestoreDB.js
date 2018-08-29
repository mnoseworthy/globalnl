const admin = require('firebase-admin');

var serviceAccount = require("./globalnl-database-service-account.json"); // source DB key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const dumped = {};

const schema = {
  members: {
    current_address: {},
    hometown_address: {}
    },
  moderators: {},
  private_data: {
	interests: {}
  }
};

var db = admin.firestore();
  const dump = (dbRef, schema, curr) => {
  return Promise.all(Object.keys(schema).map((collection) => {
    return dbRef.collection(collection).get()
      .then((data) => {
        let promises = [];
        data.forEach((doc) => {
          const data = doc.data();
          if(!curr[collection]) {
            curr[collection] =  { 
              data: { },
              type: 'collection',
            };
            curr[collection].data[doc.id] = {
              data,
              type: 'document',
            }
          } else {
            curr[collection].data[doc.id] = data;
          }
          promises.push(dump(dbRef.collection(collection).doc(doc.id), schema[collection], curr[collection].data[doc.id]));
      })
      return Promise.all(promises);
    });
  })).then(() => {
    return curr;
  })
};

let answer = {};
dump(db, schema, answer).then((answer) => {
  console.log(JSON.stringify(answer, null, 4));
});