# globalnl -b config_handler
This branch contains a simple configuration approach that will allow dev's to build more easily tweakable content while making code safer by enforcing namespace usage.

## Global Variables
Many of the scripts have global variables involved, and even while they've been placed in visable places, these get difficult to maintain as the codebase grows. Backing onto another similar issue explained later, this is solved by just having a top-level configuration file handle the commonly used globals.

### Structure of config file, config.json, located in root dir:

```json
{
    "GLOBAL" : {},
    'local' : {
        "myConfigKey" : 1337
    }
}
```

Each key corresponds to the name of the html/js files assocated with a page (except GLOBAL). Each value is an object that can be used to store any configuarion variables a page requires.

*GLOBAL* This key is used to store global configuration. If a key in GLOBAL is equal to a key in and local config object, the local value should over-ride the global. GLOBAL keys are always loaded when requesting the config.

### How to use config in code

Include the config script in the template file, *before* running scripts leveraging it:
```
<script src="../config.js"></script>
```

Wrap your code in a namespace, pass the namespace to the config handler:
```javascript
    var myNameSpace = function(config){
        var my = 'code';
    }

    new configHandler( myNameSpace, 'local_config_key' );
```

Then in code, access the config exactly like you would any other JS object:
```javascript
    var myNameSpace = function(config){
        console.log(config.firebase.pageName);
        var pageWidth = config.pageWidth;
    }
```