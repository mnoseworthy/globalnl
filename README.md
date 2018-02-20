# globalnl -b suggested_js_changes
This branch will be used to make non-functional updates to the codebase, branching from the point where javascript was torn out of the tempalte files. Changes will have to do with mostly making the code more maintainable.

## Global Variables
Many of the scripts have global variables involved, and even while they've been placed in visable places, these get difficult to maintain as the codebase grows. Backing onto another similar issue explained later, this is solved by just having a top-level configuration file handle the commonly used globals.

### Structure of config file, config.json, located in root dir:

```json
{
    "GLOBAL" : {},
    'local' : {}
}
```

Each key corresponds to the name of the html/js files assocated with a page (except GLOBAL). Each value is an object that can be used to store any configuarion variables a page requires.

*GLOBAL* This key is used to store global configuration. If a key in GLOBAL is equal to a key in and local config object, the local value should over-ride the global.