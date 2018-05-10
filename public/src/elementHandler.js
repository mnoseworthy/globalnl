/*
    Element Handler

    To allow developers to work on html without having to modify javascript, this class allows
    a html file containing arguments fields to be reconstructed at load time with arguments given
    through javascript. This is all just to avoid having static concatonated strings in code.

    The html file must include matches of {[int](string)} where int == argument number index and
    string == string argument index. These are used to match up the given arguments to the fields
    in the file.
*/
class elementHandler 
{
    /* Initialize
        Kicks off control flow of the elementHandler class, which runs through the full process of
        parsing and building the output dom based on the params.

        @param elementPath (string) - path to the .html file containing the element to parse, as seen by this file
        @param args (Array or Object) - Either an array of values, sorted by the int keys in the element file; or an object where the keys match the strings in the element file.
        @param callback ( function pointer) - function to execute when parsing is complete. Will return either the html dom string, or false if an error occured. 
    */
    constructor(elementPath, args, callback)
    {
        // Initialize properties
        this.argFieldRegex = /\{\[\d+\]\(\w+\)\}/g;  // matches {[int](string)}    
        this.splitElement = [];  // loaded element, split by argFieldRegex
        this.matchedArgs = [];   // loaded element, matched with argFieldRegex
        this.parsedArgs = [];    // Arguments resolved into [(int) => { strIndex : str, insertPos : int}]
        this.resolvedArgs = [];  // The previous array, with the passed arguments added into the value object under the value property
        this.output = "";        // Final output DOM string
        // Store parameters
        this.args = args;
        this.callback = callback;
        // Kick off control flow by running jqueryLoad...
        // jqueryLoad -> Load element from elementPath
        //  parseHtmlForFields -> Parse loaded object for argument fields
        //  validateArgs -> Ensure #fields == # args && all keys have a match
        //  resolveArgs -> Resolve the matched keys to build an array of values to output into the loaded object
        //  buildOutputDOM -> Build DOM element using the loaded object and given args
        // Return the object to callback
        this.jqueryLoad(elementPath)
    } // end constructor

    /*
    */
    jqueryLoad(elementPath)
    {
        try{
            var _this = this;
            $.get(elementPath, function(data) {
                _this.parseHtmlForFields(data);
            });
        }catch(err){
            //console.log(err);
        }
    } // end jqueryLoad

    /* parseHtmlForFields

        Looks for instances of {[int](string)} inside the html file and stores
        their position in the file as well as their argument identifiers.
    
    */
    parseHtmlForFields(loadedElement)
    {
        // find matches of this.argFieldRegex
        this.matchedArgs = loadedElement.match(this.argFieldRegex);
        // Split string to get contents on either side of all matches
        this.splitElement = loadedElement.split(this.argFieldRegex);
        // If null was returned from match attempt, the element has no arguments to fill in
        if ( this.matchedArgs !== null)
        { 
            // make an array where the key's are equal to the match's resolved key (int)
            // and the values are an object containing the resolved string and the index
            // in split element to insert the argument at
            for(var i = 0; i < this.matchedArgs.length; i++)
            {   
                // Matches {string}, then removes the brackets
                var strIndex = this.matchedArgs[i].match( /\(\w+\)/g );
                strIndex = strIndex[0].replace("(", "").replace(")","");
                // Matches [int], then removes the brackets, converts to int
                var intIndex = this.matchedArgs[i].match(/\[\d\]/g);
                intIndex = parseInt( intIndex[0].replace("[","").replace("]","") );
                // Store results in required format
                this.parsedArgs[i] = {
                    intIndex : intIndex,
                    stringIndex : strIndex,
                    insertPos : i
                };
            }
            // Continue control flow by calling validate args
            this.validateArgs();
        }else{
            // No arguments in element, just output it !
            this.callback(loadedElement);
            return true;
        }
    }// end parseHtmlForFields

    /* validateArgs
    */
// TO DO # args in may not = # args out if the same arg is used multiple times
    validateArgs()
    {
        // If args is an array, check that all int index's in the loaded args have matches in
        // the input args
        if ( this.args.constructor === Array )
        {
            for ( var i = 0; i < this.parsedArgs.length; i++ )
            {
                // for this argument, iterate over all input args and check for a index match
                var resolved = false;
                for (var j = 0; j < this.args.length; j++)
                {
                    if ( this.parsedArgs.intIndex == j ){
                        resolved = true;
                    }
                }
                // if not found, fail loading
                if ( ! resovled ) {
                    //console.log("The element template looks for index "+this.parsedArgs.intIndex+" but it does not exist in the given args.");
                    this.callback(false);
                    return false;
                }

            }
        }

        // If passed args aren't an ordered array, check that all the
        // argument strings have pairs in resolvedArgs
        if ( ! this.args.constructor === Array && this.args.constructor === Object )
        {
            var argKeys = Object.keys(this.args);
            for (var j = 0; j < this.args.length; j++)
            {
                var resolved = false;
                for ( var i = 0; i < this.parsedArgs.length; i++ )
                {
                    if( argKeys[j] == this.parsedArgs[i].stringIndex)
                        resolved = true;                    
                } // end i loop
                if ( ! resolved ){
                    //console.log("Argument " + argKeys[j] + " was not found in the resolved argument list from the loaded element.");
                    this.callback(false);
                    return false;
                }
            } // end j loop
        }

        // If code has reached this point we know that arguments are valid, continue control flow
        this.resolveArgs();
    }

    /* resolveArgs
    */
    resolveArgs()
    {
        // Copy parsedArgs into resolved args to start, slice ensures copy by value not reference
        this.resolvedArgs = this.parsedArgs.slice();
        // args are either an ordered array matching to intIndex
        if ( this.args.constructor === Array )
        {
            // Iterate over the arguments and fill in the required values from args
            for ( var i = 0; i < this.resolvedArgs.length; i ++)
            {
                this.resolvedArgs.value = this.args[this.resolvedArgs.intIndex];
            }

        // or an object where the keys match strIndex
        } else if ( this.args.constructor === Object )
        {
            // match the keys of the args, to the strIndex in the parsedArgs
            var argKeys = Object.keys(this.args);
            // Find value for each resolvedArg inside input arg by matching string
            for (var i = 0; i < this.resolvedArgs.length; i++)
            {
                for ( var j = 0; j < argKeys.length; j++)
                {
                    if ( String(argKeys[j]) == String(this.resolvedArgs[i].stringIndex) )
                    {
                        this.resolvedArgs[i].value = this.args[argKeys[j]];
                    }
                }
            }
        }

        // resolvedArgs now contains all the required values for building the output DOM
        // ...continue control flow
        this.buildOutputDOM();
    }

    /* buildOutputDOM
    */
    buildOutputDOM() 
    {
        // It's safe to assume that there will always be content in the html file before
        // an argument, so we can just iterate over the arguments, append them after their
        // indexed insert point and add the remaining split html string once iteration is done
        for ( var i = 0; i < this.resolvedArgs.length; i++ ){
            // add the element at insertPos from splitElement, then the value from the resolved arg
            this.output = this.output.concat(this.splitElement[ this.resolvedArgs[i].insertPos ], this.resolvedArgs[i].value);
        }
        // Finally, add the last element of splitElement to finish the buildf
        this.output = this.output.concat( this.splitElement[ this.splitElement.length - 1 ] );
        // Continue control flow, here we are done so run the callback with the result
        this.callback(this.output);
        return true;
    }
} // end elementHandler class definition