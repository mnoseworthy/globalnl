/* Config object
    
    This is a non-global object that is accessable only by the config handler class
    to allow local loading of required portions of config into areas of code where they're
    requried. Use an instance of configHandler to utilise the config. See the class declaration
    below for more info.
*/
var __globalnl_internal_config__  = {
    "GLOBAL" : {
        "firebase" : {
            "tosUrl" : "<your-tos-url>" 
        }
    },
    "admin" : {
        "console" : {},
        "login" : {}
    },
    "404" : {},
    "index" : {
        "firebase" : {
            "signInSuccessUrl" : "members.html"
        }
    },
    "members" : {},
    "profile" : {},
    "registeration" : {},
    "signup" : {}
}


/* Class configHandler
    handles loading of the config.json file into local js code on each page.
*/
class configHandler {
    /* constructor. Must either set async false or pass a callback.
    
        @param callback (*function) - Function pointer to the callback that will recieve the config variable.
        @param filename (string) -  Optional argument, use this to request a specific section
            of the config file. Note that when requesting a specific section, global elements
            are added into the returned object, where any values in the local match override
            those in the global config.
    */
    constructor( callback=null, filename="default")
    {
        // Ensure a callback of some sort was provided, no validity check here though.
        if ( callback == null ) {
            console.log("Provide a callback bud.")
            return false
        }
        // This is modified by loadConfig
        this.config = {};
        // flag used to determine weather or not config is still loading
        this.loading = null;
        // Store param's
        this.callback = callback;
        // trigger loading
        this.loadConfig(filename);

    }
    /* method loadConfig
    
        First handles loading of config from variable defined at top of file, the
        runs requestConfig, which will trigger loading of any external configuration
        before sending the final result to the callback given at construction.
    
        @param filename (string) - See constructor declaration for more information
    */
    loadConfig(filename)
    {
        // set flag
        if ( this.loading == null) {
            this.loading = true;
        } else if ( this.loading == true ) {
            console.log("Already loading ya fool, fix that fail loop.");
        }
        // First copy global config
        this.config = __globalnl_internal_config__["GLOBAL"];
        // If a local config is requested, copy local request
        if ( this.filename !== "default" ) {
            this.configDrill(__globalnl_internal_config__[filename]);
        }
        // start external config load
        this.requestLoadConfig(this.callback);
    }
    /* configDrill

        Iterates into a nested object and copies all its key-value pairs into
        this.config. This will run recursively.

        @param object - object to iterate through
        @param keyVector (dont pass)- Used in recursion, position in original object that the current object
            was stored at. Don't pass this variable, it isnt used during the first iteration.
    */
    configDrill(object, keyVector=null) {
        console.log("attempting to drill");
        console.log(object);
        for (var key in object) {
          console.log(key + ': ' + object[key]);
          this.config[key] = object[key]
          if (object[key] !== null && typeof object[key] === "object") {
            // Recurse into children
            this.configDrill( object[key], keyVector.push(key) );
          }
        }
    }
    /*  method requestLoadConfig

        For future extension, config may need to be loaded from resources other than
        the variable defined in this file.

        @param callback (*function) - function pointer that is passed the config object
    */
    requestLoadConfig(callback) 
    {
        /* Skeleton code for later usage
        // initialize request
        var request = new XMLHttpRequest();
        // set header info
        request.overrideMimeType("application/json");
        // Start request to open config file, wait until event fired
        request.open('GET', 'https://github.com/somefile.json', true);
        // hook into ready event of request
        request.onreadystatechange = function() {
            if (request.readyState && request.status == "200"){
                callback(request.responseText);
            }
        }
        // send null to signify that the request is done
        request.send(null);
        */
        callback({});
    }

    /*  method saveConfigCallback

        callback executed by loadconfig to store the config variables into
        the object, attribute this.config. Only stores or overwrights the
        config loaded from the varable defined at the top of this file.

        @param configObject ({}) - js object containing the loaded config.
    */
    saveConfigCallback(configObject)
    {
        if (configObject !== {} ){
            //Iterate over configObject and this.config
            //check if any key's match, if so overright their values
            //add any keys that dont exist and store their values
            console.log("Not yet implemented, pseudo code defined.")
        }
        // Set loading flag
        this.loading = false;
        // Execute callback to finish loading process
        this.callback(this.config);
    }
}
