/* Config object
    Javascript doesn't provide the best namespacing options, so to attempt to keep the config
    object as internal as possible we define an oddly named variable that returns it. This should
    only be called by the configHandler class defined below.
*/

var LinkedInString = (((1+Math.random())*0x10000)|0).toString(16).substring(1);

var __globalnl_internal_config__  = function() { return {
    "GLOBAL" : {
        "firebase" : {
            "config" : {
                apiKey: "AIzaSyBDf7OWORlKoMM6Y9ly5ftxAw6QYjY_ulw",
                authDomain: "members.globalnl.com",
                databaseURL: "https://globalnl-database.firebaseio.com",
                projectId: "globalnl-database",
                storageBucket: "globalnl-database.appspot.com",
                messagingSenderId: "331545031788"
            },
            "tosUrl" : "<your-tos-url>" 
        },
        "linkedin" : {
            api_key : "r5zW4F5VoUQrZOdk",
            onLoad : "",
            authorize : true,
            lang : "en_US"

        }
    },
    "admin" : {
        "console" : {},
        "login" : {}
    },
    "404" : {},
    "index" : {
        "firebase" : {
            "signInSuccessUrl" : "members.html",
        }
    },
    "members" : {
        max_pages : 5,
        members_per_page : 9
    },
    "profile" : {},
    "registration" : {
        default_member : {
            first_name:"John",
            last_name:"Doe",
            interests : {
              connect:false,
              organize:false,
              learn:false,
              mentor:false,
              support:false
            },
            current_address: {
              lat:500,
              lng:500
            },
            hometown_address: {
              lat:500,
              lng:500
            },
            approved:"No"
        }
    },
    "signup" : {
        "firebase" : {
            "signInSuccessUrl" : "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=86xotu9f4tiis6&redirect_uri=https%3A%2F%2F"+window.location.hostname+"%2Fregistration.html&state="+LinkedInString+"&scope=r_basicprofile"
        }
    }
}}


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
        // loadConfig -> loads in the global config variable
        // configDrill -> If local version of config required, drill into the nested parameters recursively
        // resolveKeyVector -> uses some weird JS tricks to turn a string of keys into an accessor
        // runs callback with the requested config
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
        this.config = __globalnl_internal_config__()["GLOBAL"];
        // If a local config is requested, copy local request
        if ( this.filename !== "default" ) {
            this.initialConfig = __globalnl_internal_config__()[filename];
            this.configDrill(this.initialConfig);
        }
        //Finish by executing callback with resolved config
        this.callback(this.config);
        
    }
    /* configDrill

        Iterates into a nested object and copies all its key-value pairs into
        this.config. This will run recursively.

        @param object - object to iterate through
        @param keyVector (dont pass)- Used in recursion, position in original object that the current object
            was stored at. Don't pass this variable, it isnt used during the first iteration.
    */
    
    configDrill(object, keyVector=null) {
        // create local copy of keyvector to handle updates to it
        var vector = [];
        if ( keyVector !== null ) {
            vector = keyVector.slice();
        }
        //Iterate over the object's keys, each time an object is encountered,
        //this function is called again until the full object has been traversed
        //and its data copied to the output
        for (var key in object) { 
            //Create a temp copy by value to pass onwards
            var tempVector = vector.slice();
            tempVector.push(key)
            // If value is an object, recurse
            if (object[key] !== null && typeof object[key] === "object") {
                this.configDrill( object[key], tempVector);
            // otherwise resolve the current keyvector and assign the value to our output object
            } else {
                //Create a temp copy by value
                var tempVector = vector.slice();
                tempVector.push(key)
                //Assign new value into config object
                //console.log("Attempting to add "+object[key]+" at vector "+tempVector);
                this.resolveKeyVector(this.config, tempVector, object[key]); 
            }
        }
    }


    // UTIL //
    
    /* method resolveKeyVector
        Accepts an array or string that represents keys in an object, and assigns the value
        into the same place of the given object. If the higher level properties don't exist
        they are created.

        @param obj ({}) - Object to modifiy//assign value into
        @param keyVector (string or array) - String like (x.y.z) or array like ['x','y','z']
            that is resolved into an object accessor
        @param value - Value to assign into the object

        @returns value resolved from keyvector
    */
    resolveKeyVector(obj,keyVector, value) {
        // Handle a string key vector
        if (typeof keyVector == 'string') {
            return this.resolveKeyVector(obj,keyVector.split('.'), value);
        }
        // Handle array vector
        else if (keyVector.length==1 && value!==undefined) {
            return obj[keyVector[0]] = value;
        }
        else if (keyVector.length==0){
            return obj;
        } else {
            // If the object doesnt already have the key, create an empty object to work with
            if ( ! obj.hasOwnProperty(keyVector[0]) ){
                obj[keyVector[0]] = {};
            }
            return this.resolveKeyVector(obj[keyVector[0]],keyVector.slice(1), value);
        }
    }
}