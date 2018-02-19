# globalnl -b restructure
The purpose of this branch is to demonstrate tearing javascipt out of templating files.

# Why separate javascript and templating ?
- **Portability**
    - Having functional code separate from templating files (html in our case) allows the code to be used in multiple places apposed to having to port it from file to file. 
- **Maintainability**
    - Maintaining multiple copies of the same code is a nightmare - its much better to modifiy a single copy that is imported whereever it is to be used.

# What did i do ?
Simply removed all the <script></script> blocks that implemented functionality out into their own javascirpt files and imported them in the files that utilised the functionality.