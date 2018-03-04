# Task List
List of current development required, order is not significant.
## Overall
- [ ] Separate repeated code that gets used on every page into a page module or something similar to that
       - logout callback
       - user information at top of screen
       - formatting functions for things like location strings
- [ ] If time allows make some fancy loading overlay. We don't have an actual backend and all data is being loaded and parsed in the browser so this can possibly slow things down on low-end pc's. We don't want user's thinking the page has died or something.
- [ ] Implement Linkeded API to query more data about the user
- [ ] Use meta data about user to fill in data, e.g. geo location
## Documentation
- [ ] Write development guide ( How to clone, setup local server, make changes, see changes)
- [ ] Write contribution guide ( basically just point to other github pages for this )
## member page
- [ ] Implement search filters
- [ ] Reformat html as per design doc
## profile page
- [ ] Redo front-end as per design doc
- [ ] Batch modified data from the front-end, validate selections, write to database, reload
- [ ] Add auto-complete fields to DOM elements, as per warnings in console
## Registration Page
- [ ] Add form validation
       - Regex for each field
       - For location enforce that the user used google api
       - For linked in, make a http request to the page to verifiy it exists and is on linkedin's domain

