# globalnl -b js_refactor
This branch will contain documentation and code pertaining to refactoring the javascript code assocaited with the site. 

# File structure updates
First lets look at how the file's are structured on the site:
```
public  
|--- admin  
|   |--- console.html // .js  
|   |--- login.html // js  
|--- assets  
|   |--- libraries ...  
|   |--- Firebase  
|   |   |--- admin.js  
|   |   |--- firebase.js  
|   |   |--- members.js  
|   |   |--- profile.js  
|   |   |--- registration.js  
|   |--- datatables.css // .js  
|--- 404.html  
|--- index.html // .js  
|--- members.html // .js  
|--- profile.html // .js  
|--- registration.html // .js   
|--- signup.html // .js 
```

The general structure of the site's files is good, however there are issues with how javascript is being stored and handled. Separating database functionality is a good idea, however abstracting from a page-by-page level is not. It should instead be abstracted to a functional level, and then js for each page can leverage that code. I.e. a class should handle general interaction with the database, and a page's code, say members.js can use that interface to safely interact with firebase.

Also, having custom code stored along-side versioned libraries is not a good idea. The firebase folder inside assets needs to be removed and placed else-where until it is refactored. Perhaps we can create another folder for javascipt that page-code leverages, somthing like //public/src .

Finally, the datatables module needs to get put into a folder containing its version number.

# Code structure Updates

## Front end ( Templating )
The front end (.html) structure is good, there aren't any convoluted callbacks being ran on dom elements from inside HTML and the placements of inclusions and file loads are good.

## Back end
The core functionality in most of the javascript files has been implemented in more a pythonic mannor and needs to be refactored. While doing this, it's important to retain all outside module loading functonality as components like login and pagnation are working as intended and have no need of being rewritten or even rethought.

What needs the most focus initially is the *overall code structure*. Five things need to happen:  

1. Write **database interface** class  
       - As previously mentioned, having the database code separate is a good idea - but only on a functional level. The interface class should handle all aspects of connecting, querying, caching, cleaning up, and parsing. The class should acheve these tasks on an abstract level, no code should reference anything in html files. 
       
2. Wrap all code in **namespaces**
       - Currently the site could potentially fall into an unknown state either by boucning around the site too fast or by a developer making an error. Namespacing prevents a lot of potential problems. This will be acheved by utilising the config loading code.  
       
3. **Separate DOM outputs** from javascript  
       - Any section of javascript that creates a new DOM element and adds it to the page, should be loading in a .html file and filling in wildcards rather than generating it in code. This will allow easier changes to dynamic elements, as well as allow front-end specific developers to not have to search through javascript to make their required changes.
       
4. **Separate event callbacks** from functionality  
       - Currently, the javascript files implement functionality inside of the same callbacks that are triggered from front-end events. While there's nothing wrong with doing this, it's helpful to pull out that functionality, wrap it in a class and define all your events at the top level as global. The only global's in the files should be those events.  
       
5. Determine what portions of code require their own class structures  
       - While refactoring the code-base, lets think about **which sections of the code** could benefit from being torn out into a class. The members page for example will require a few sections of code to be converted into a class structure - search filters and current user data should both be a class. This will be discussed further later once we start writing new functionality into those areas.  


# Task Summary
While working through the following tasks, keep note of any code structures that may require their own classes.

## Firebase files
- [ ] /public/assets/datatables.\* need to be moved into their own folder and their referenced updated in .html
- [ ] Move firebase code out of assets folder until it's rewritten, update referneces in .html
- [x] Firebase database interface design   
       - [See firebase code analysis & initial database design](./src/README.md)
- [ ] Firebase database interface implementation
- [ ] Separate functionality from database calls in /public/assets/Firebase/\*.js files, add functionality to their respective js files under public/ where functionality leverages the interface

## Page Javascript
- [ ] Wrap all code in namespaces, i.e. setup all files like branch config_handler describes
- [ ] Find all places in code where dom elements are created dynamically
- [ ] Create a directory of .html files named after the elements they contain, where elements are dynamically created DOM's from the previous task
- [ ] Read through .html, find all events that are fired. Read through all js, find all events that are being hooked into.
- [ ] From task above, separate any functionality that is triggered into the namespace, define event hooks at top out of namespace
