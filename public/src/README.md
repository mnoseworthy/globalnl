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

# Current implemented database interface
The current interface provides just enough functionality to refactor the current code, which only requires initalizing the firebase application, authenticating the user, determining user type and making some simple calls. Instead of writing a read interface, for now the firebase object can be accessed directly through the interface. Perhaps this will never be written as firebase handles read/write a lot better than I expected. The only benefit would come when we start implementing filters for the search function.

## Usage
To use the interface, follow a similar code structure to what is below:

### HTML
Include the required modules before loading your code using the interface, we also include the config here just to demonstrate how that should hook into the code flow as well
```html
    ...
    <script src="https://www.gstatic.com/firebasejs/4.6.2/firebase.js"></script>
    <script src="src/firebaseInterface.js"></script>
    ...
    <script src="myPage.js"></script>
```

### JS
Use the interface to initalize firebase and authenticate your user to determine their user type and access the database on their behalf:
```javascript
    //myPage.js
    // Config handler callback
    var myPage_namespace = function (config) 
    {
        // firebaseInterface callback
        var done = function( fbi ) {
            // Validate success
            if ( ! fbi ) 
            {
                console.log("An error has occured while initializing the firebase interface");
                return false;
            }
            // Use interface
            console.log("You are a "+fbi.userType);
            console.log("Here's your immediate info "+fbi.userObject);
            console.log("Your email is"+fbi.userObject.email);
        }
        // Running the initializer returns the database interface object to the callback
        // or False if an error occured.
        new firebase_interface(config.firebase.config, done);
    };
    // Initialize config handler, this does nothing more than parse the config object
    // in the config handler file and return the object required for this page to the callback,
    // where the callback is just our namespace
    var config = new configHandler( myPage_namespace, 'myPage' );
```

# Dynamic object handling
File structure:
```
    Src  
    |--- elements  
    |   |--- profile_output.html 
    |   |--- member_row.html
    |--- elementHandler.js  
```

dynamic elements were previously concattonated strings in javascript, these should now be stored in the /src/elements folder. These .html files would contain the exact html that should be output to the page, except where values need to be loaded specific markup would have to be used.

## elementHandler class
Whenever the programmer wants to load an object dymanically into a page, they would create an instance of this class and tell it which element they want, what parameters to pass to it and where to inject it in the page.

The class would load the appropriate .html file from /src/elements/*.html, parse it for argument fields, ensure user has passed enough arguments, build a string that contains the requested HTML and return it to the programmer through their callback.

## Usage Example
## HTML
Lets say we have myElement.html stored in /public/src/elements/mySubPage:
```html
    <div class="{[0](myClassName)}">
        <a href="{(1)[myLinkArgumentName]}"  onClick="myFunction( {[2](someArgNameForThisFunction)} )" />
    </div>
```

Our html page where we want this element loaded **must include** **elementHandler** and **jQuery** *before* the script invoking it:
```html
    <script src="jQuery"></script>
    <script src="src/elementHandler.js"></script>
    <script src="myPage.js"></script>
```
## Javascript

```javascript
    // myPage.js code
    var callback = function ( resolvedDOM )
    {
        if ( ! resolvedDOM )
        {
            console.log("An error occured during loading//parsing");
        }else{
            //Use your loaded element !
            $("#someID").append(resolvedDOM);
        }
    }
    // path to the element file
    var path = "elements/mySubPage/myElement.html";
    // argument array or object. Use array to match arguments to the int index's in the file, or an object to match to the string indexs in the file
    var args = ["cssClass", "https://mylink.gov", 1337];
    var args = {
        myClassName : "cssClass",
        myLinkArgumentName : "https://mylink.gov",
        someArgNameForThisFunciton : 1337
    };
    // Call the constructor, this will handle all loading/parsing and then releave data when complete
    // after executing the callback with the requesting dom string
    new elementHandler(path, args, callback);
```

# Future Improvements
Areas that could benefit from further effort

## User authentication & data handling
It may be worthwhile to build a class sturcutre for users to control their authentication level's and what they can // cannot do around the site. This couldn also be leveraged to build cookies for users and store their data between & during sessions.
