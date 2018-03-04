# Class Documentation
This file contains short descriptions of each class in this directory, and how to use them. This file may not be up to date with revisions of the classes. For information on how to use a specific function read the comment heads above their definitions in the source code.

# configHandler Class, config.js
This file contains a self-executing function that returns an object containing configuration for the site. This object can be modified by the programmer to include whatever you're page requires. The configHandler class provides an interface to the configuration object.

## Updating config
Edit the returned object inside __globalnl_internal_config__ to include whatever data you need. When adding data for a new page, create a key with the pages name that maps to your data.

## Loading config in your page

1. Include the config loading script before your code in html:
```html
<html>
...
    <body>
    ...
        <script src="src/config.js"></script>
        <script src="myCode.js"></script>
    </body>
</html>
```

2. Execute configHandler in your code, provide a callback to your code namespace:
```javascript
/* myCode.js */
var callback_namespace = function ( config )
{
    // config now contains all global config, as well as any data stored under
    // myCode. Any duplicate data is overwritten by myCode's values.
}
new configHandler( callback_namespace, 'myCode');
```




# Current implemented database interface

The current interface provides just enough functionality to refactor the current code, which only requires initalizing the firebase application, authenticating the user, determining user type and making some simple calls. This class will be extended in the future to provide a safe integration with firebase.

## Usage

1. Include the required modules before loading your code using the interface, we also include the config here just to demonstrate how that should hook into the code as well.
```html
    ...
    <script src="https://www.gstatic.com/firebasejs/4.6.2/firebase.js"></script>
    <script src="src/firebaseInterface.js"></script>
    <script src="src/config.js"></script>
    <script src="myPage.js"></script>
```

2. Use the interface to initalize firebase and authenticate your user to determine their user type and access the database on their behalf:
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



# elementHandler Class
This class handles dynamic html objects for us so we don't have to concatonate strings in code. This was written with the goal of allowing those who want to focus on html/css to not have to pick through javascript. It also makes maintaince & readability better.

## Usage

Lets say we have myElement.html stored in /public/src/elements/mySubPage:
```html
    <!--  myElement.html -->
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

We then utilise the class as follows:
```javascript
    // myPage.js code

    // This callback is given to the elementHandler constructor, it must do something with
    // the resolved element string
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

    // define path to the element file
    var path = "elements/mySubPage/myElement.html";

    // argument array or object. Use array to match arguments to the int indicies in the file, or an object to match to the string indicies in the file
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

# Skeleton for new pages leveraging new code
The following code snippet can be used to create a new page that leverages the config loader, firebase interface and element handler. The element handler section is just for an example, don't include that in your page !
```html
<!-- my_page.html -->
<html>
    <head>...</head>
    <body>
        ...
        <!-- modules required for our classes -->
        <script type="text/javascript" src="/assets/DataTables-1.10.16/datatables.min.js"></script>
        <script src="https://www.gstatic.com/firebasejs/4.6.2/firebase.js"></script>
        <!-- Site source, handlers and interfaces first, then the page code -->
        <script type="text/javascript" src="src/config.js"></script>
        <script type="text/javascript" src="src/firebaseInterface.js"></script>
        <script type="text/javascript" src="src/elementHandler.js"></script>
        <script type="text/javascript" src="my_page.js"></script>
    </body>
</html>
```
```javascript
    /* my_page.js */

    // Start execution when page is done loading
    $(document).ready(function(){
        initApp();
    });
    // Code entry point, started when page is finished loading
    function initApp()
    {
        // Initialize config handler, this does nothing more than parse the config object
        // in the config handler file and return the object required for this page to the callback,
        // where the callback is just our namespace below
        new configHandler( my_page_namespace, 'my_page' );
    }
    // This is where we implement the main logic for our page, and we pass this function to
    // the configHandler constructor as it's callback - i.e. it's started once config is finished loading
    var my_page_namespace = function (config) 
    {
        // This is passed to the firebase interface as it's callback, and won't be executed until
        // the interface has connected to the database and figured out the user type
        var firebaseLoaded = function( fbi ) {
            // Validate success
            if ( ! fbi ) 
            {
                console.log("An error has occured while initializing the firebase interface");
                return false;
            }

            // Switch based on user type, this is where we redirect different types
            // of users to other pages if they don't belong here or whatever
            switch ( fbi.userType ) 
            {
                case "Moderator":
                    break;
                case "Member":
                    break;
                case "Unregistered Member":
                    // Member never filled out registration form
                    break;
                case "Anonymous":
                    break;
                default:
                    console.log("User type undefined? How did we get here ...");
                    return false;
            }
            // Implement whatever you want here using the firebase interface and config
            // feel free to add whatever global data you need into the config file (static)

            /* Example element handler usage */
            // Callback for element handler to inject the element
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
        } // end firebase callback
        
        // Running the initializer returns the database interface object to the callback
        // or False if an error occured.
        // We pass the firebase interface the firebase section of our loaded config
        new firebase_interface(config.firebase.config, firebaseLoaded);
    }; // end namespace
```
