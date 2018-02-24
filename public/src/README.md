# Firebase Interface Design
    Creating a database interface that interacts with the current required functionality...

# Current control flow of firebase leveraging code
To analyise the requirements of the database interface, as well as for me to get an understanding of the code design, i'll have to map out the control flow of the source inside //assets/firebase/*.js.


## -> firebase.js ( Dependancies -> firebase loaded )
       - stores authentication config (globally)
       - initializes the firebase connection using the config (globally *this gives direct access to the database from any user with console access*)
## -> members.js
       - Always loaded after firebase.js
       - sets rootRef = firebase.database().ref()
       - Listens to page load event ( This is great ! ) and fires and initialize function
              - Requests authentication with firebase, subscribes to the auth event which accpets the authenticated user as its parameter
              - Creates variables for each field returned in the user parameter
              - Builds a json object containing all the fields returned in the user parameter
              - Builds a **DOM element** utilising some fields returned in the user parameter
                     - There are two callbacks defined in the DOM element, both of which are implemented at the bottom of this file
              - Appends the DOM element to document
              - Grabs an object from firebase ( rootRef/private/members/$UID ) where UID= logged in user's ID loaded earlier during authentication
              - Validates weather or not the user has been signed up based on the returned data from the previous line. Handles non-authentication appropriately
              - If the user is signed up and has a valid UID ( & therefore could query the database ), the database is queried again (rootRef/shared/members)
                     - The object from the above query is passed to **loadMembers()**
              - If the user is not signed up, publicVersion() is called, which queries the database for (rootRef/public/members)
                     - The object from above is then passed to **loadMembers()**
## -> profile.js
       - Always loaded after firebase.js
       - sets rootRef = firebase.database().ref()
       - Listens to page load event ( This is great ! ) and fires and initialize function
              - Requests authentication with firebase, subscribes to the auth event which accpets the authenticated user as its parameter
              - Creates variables for each field returned in the user parameter
              - Builds a json object containing all the fields returned in the user parameter
              - Grabs an object from firebase ( rootRef/private/members/$UID ) where UID= logged in user's ID loaded earlier during authentication
              - If the object was returned properly, it is used to build a **DOM element**
                     - There are two callbacks defined in the DOM elements, both of which are defined at the bottom of the file
                     - The DOM element is loaded into the page
              - If not returned properly, re-routes to index.html
              - Attempts to load user's private info (rootRef/private/members/$UID) where UID= users unique ID. 
              - Handles cases where no data is loaded - which means the user doesnt have private access
              - If data is loaded, it is inserted into the page via jQuery DOM accessors, meaning the page elements are static in the .html template but are loaded dynamically
## -> registration.js
       - Always loaded after firebase.js
       - sets rootRef = firebase.database().ref()
       - Listens to page load event ( This is great ! ) and fires and initialize function
              - Requests authentication with firebase, subscribes to the auth event which accpets the authenticated user as its parameter
              - Creates variables for each field returned in the user parameter
              - Builds a json object containing all the fields returned in the user parameter
              - Grabs an object from firebase ( rootRef/private/members/$UID ) where UID= logged in user's ID loaded earlier during authentication
              - If object was returned properly, runs code to handle user already being registered
              - Otherwise, captures some information from the HTML page ?
## admin.js
       - Contains the same database loading methodology as the other files
       - Defines a ton of global values
       - Defines functions for loading/parsing the database

    
# Summary

The main public user handling files contain the same repeated code to interact with the database, which makes the job of tearing that functionality out rather simple. Also each file has one specific DOM element that it generates, making the job of tearing those out simple as well.

The admin file seems to contain functionality that is more or less just for developers. I feel like the admin page can be left alone for the time being as it seems like more of a test space rather than user-facing functionality. Rather than mess with 'in the works' code, it might be best to leave that alone for now.

## Database interactions
       - Authentication configuration object storage
       - Initialize the database by passing the above object
       - Storing the 'rootRef' of the database, which seems to be analgous to the root directory
       - Authenticating with the database and handling the returned user object, this must hook into the google authentication somehow ?
       - Reading from the database
       - Couldn't find a place in the Firebase/*.js code where data was written to the database, it must be contained in the page javascript somewhere, most likly in //public/registration.js

## Front-end interactions
       - Multiple places create DOM elements and inject them into the page
       - Each page hooks into the load callback of the page to run the code that checks the users authentication by attempting to load their data from the database
       - In registration.js, data is loaded from the fourm within the database code
       - In files that DOM's are loaded, callbacks are implemented in those files that provide various methods
       - In places where authentication fails, redirection occurs. These snippets are used as a return value and are assume to create a situation where following code will not be executed

# Initial Guess at database interface structure
Class firebase_interface:
-> initializer ( @param config_object )
       - Checks that config_object is a valid firebase configuartion object
       - Checks that firebase has been loaded before the instance creation
       - Initializes the database, stores the returned user object in an attribute
       - Stores a copy of firebase.database().ref()
       - Preforms a check with the user's ID to determine the user type, stores the result in an attribute
-> read ( @param table_path )
       - Accepts a table path, discluding the rootRef. I.e. to return rootRef/private/members you would pass private/members.
       - Executes any required parsing // validation on the data **remember you should never trust data read from a database**
       - Returns the resulting object
-> Write ( @param table_path, @param write_object)
       - Ensures user is authenticated and of the correct type to allow writing to the tablebase
       - Pulls a sample object from the path
       - confirms that write_object and the object from above are similar enough
       - Writes the object into the database
       - Pulls the object back down to ensure it was written correctly
-> cleanup ()
      - deauthenticates gracefully with the database, ensuring any required metrics have been properly written, that the connection is closed, etc.
      - clears data caches
      - Checks for object references in global namespace and removes them ?
