# Migartion to firestore
This directory will only be present on this current working branch, and will document the migration of our current data from Google Real Time Database to Google Firestore.

# Design

## Current structure

Google Real-time database is just a huge json object, it has the following structure:
```json
{
    "moderators" : {
        "UID" : "true|false"
    },
    "private" : {
        "members" : {
            "Private UID" : {
                "ambassador" : "Yes",
                "approved" : "Yes",
                "current_address" : {
                    "administrative_area_level_1" : "Newfoundland and Labrador",
                    "country" : "Canada",
                    "lat" : 47.5615096,
                    "lng" : -52.712576799999965,
                    "locality" : "St. John's"
                },
                "date_created" : 1513808950526,
                "email" : "email@email.ca",
                "first_name" : "John",
                "grad_year" : 1717,
                "hometown_address" : {
                    "administrative_area_level_1" : "Newfoundland and Labrador",
                    "country" : "Canada",
                    "lat" : 47.54690919999999,
                    "lng" : -53.283521500000006,
                    "locality" : "Trout's Pond"
                },
                "industry" : "Technology",
                "interests" : {
                    "connect" : true,
                    "learn" : true,
                    "mentor" : true,
                    "organize" : true,
                    "support" : true
                },
                "last_name" : "Doe",
                "linkedin_profile" : "https://www.linkedin.com/in/johndoe",
                "privacy" : "public",
                "program" : "Bachelor of Win Engineering ",
                "public_uid" : "Public UID",
                "school" : "Memorial University of Newfoundland",
                "status" : "Student"
                }
            }
        }
    },
    "public" : {
        "gmap" : {
            "default_lat" : 47,
            "default_lng" : -51,
            "default_zoom" : 2
        },
        "members" : {
            "Public UID" : {
                "ambassador" : "Yes",
                "current_address" : {
                    "administrative_area_level_1" : "California",
                    "country" : "United States",
                    "lat" : 37.7749295,
                    "lng" : -122.41941550000001,
                    "locality" : "San Francisco"
                },
                "date_created" : 1513526296653,
                "first_name" : "John",
                "grad_year" : 1717,
                "hometown_address" : {
                    "administrative_area_level_1" : "Newfoundland and Labrador",
                    "country" : "Canada",
                    "lat" : 47.5615096,
                    "lng" : -52.712576799999965,
                    "locality" : "St. John's"
                },
                "industry" : "Technology",
                "last_name" : "Doe",
                "linkedin_profile" : "https://www.linkedin.com/in/johndoe",
                "program" : "Win Engineering",
                "public_uid" : "Public UID",
                "school" : "Memorial University of Newfoundland",
                "status" : "Student"
            }
        }
    },
    "shared" : {
        "members" : {
            "ambassador" : "Yes",
            "current_address" : {
                "administrative_area_level_1" : "California",
                "country" : "United States",
                "lat" : 37.7749295,
                "lng" : -122.41941550000001,
                "locality" : "San Francisco"
            },
            "date_created" : 1513526296653,
            "first_name" : "John",
            "grad_year" : 2019,
            "hometown_address" : {
                "administrative_area_level_1" : "Newfoundland and Labrador",
                "country" : "Canada",
                "lat" : 47.5615096,
                "lng" : -52.712576799999965,
                "locality" : "St. John's"
            },
            "industry" : "Technology",
            "last_name" : "Doe",
            "linkedin_profile" : "https://www.linkedin.com/in/johndoe",
            "program" : "Electrical Engineering",
            "public_uid" : "Public UID",
            "school" : "Memorial University of Newfoundland",
            "status" : "Student"
        }
    }
}
```

As intended, there is a lot of repeated data. This is a necessitiy of the realtime database.

### User Data diffs
Private:
 - Full data-set
Public:
 - Doesn't have interests
 - Doesn't have privacy
 - Doesn't have approved
 - Doesn't have email
Shared:
 - Identical to Public

## Firestore Archetecture
Data in firestore is organized as follows:  
**Documents** are the unit of storage, a lightweight record that contains fields that map to values. Each document is identified by a unique name.  
**Collections** are containers for documents.

Data is referenced by it's location in the database, just like the realtime database really ! I.e. myUser = db.collection('user').document('userID')

## What's going to change?
 - I think we can shed our concept of each user having multiple ID's. A user should be able to get a single UID. Need to check the Authentication schema again before confirming this.
 - Collapse public/private/shared and *potentially* moderator
 - Each user will have all the possible required fields with actual data types, as firestore supports real low-level C data types.
 - We can now query for things like, `get all users with privacy == public` instead of having a public table of UID's to pull down and refernece


## Test results
To test my theory's of the structure from inspection, I exported the database as json and ran it through some python:
```
UID Key Report:
 - Private UID's are missing from the public table
 - Private UID's are missing from the shared table
 - All public UID's are in the shared table
 - Shared UID's are missing from the public table
 - Some private member entries are missing public UID's
 - Public UID's from private table are missing from the public table
 - All public UID's from the private table are key's in the shared table
 - All public UID's are present in either shared or public tables as keys
 - All members in the priavte table have a privacy setting
 - All members with privacy=shared have their public ID's as keys in the shared table
 - Some members with privacy=public do not have their public ID's as keys in the public table

================================================
Data Normalization Report:

Count of fields accress all entries in the Private table:
{u'ambassador': 429,
 u'approved': 429,
 u'comments': 412,
 u'current_address': 429,
 u'date_created': 429,
 u'email': 429,
 u'first_name': 429,
 u'grad_year': 64,
 u'hometown_address': 429,
 u'industry': 429,
 u'interests': 429,
 u'last_name': 429,
 u'linkedin_profile': 429,
 u'privacy': 429,
 u'program': 64,
 u'public_uid': 420,
 u'school': 64,
 u'status': 429}

Count of fields accress all entries in the Public table:
{u'ambassador': 248,
 u'current_address': 248,
 u'date_created': 248,
 u'first_name': 248,
 u'grad_year': 43,
 u'hometown_address': 248,
 u'industry': 248,
 u'last_name': 248,
 u'linkedin_profile': 248,
 u'program': 43,
 u'public_uid': 14,
 u'school': 43,
 u'status': 248}

Count of fields accress all entries in the Shared table:
{u'ambassador': 420,
 u'current_address': 420,
 u'date_created': 420,
 u'first_name': 420,
 u'grad_year': 61,
 u'hometown_address': 420,
 u'industry': 420,
 u'last_name': 420,
 u'linkedin_profile': 420,
 u'program': 61,
 u'public_uid': 124,
 u'school': 61,
 u'status': 420}
```

To summarize:
 - All member's have data in the private table
 - Members are assigned a public UID
 - All members have entries in the shared table corresponding to their public UID
 - If a member's private data has a privacy field, it's always set to public
 - If privacy=public, they get an entry in the public table
 - Fields present in public and shared fields are identical, and therefore the only purpose of the separation is for access permissions 

## Design questions for figuring out data structure

### Backwards required data retrieval
 - On init, what type of user is this? ( Moderator, Member, Unregistered )
 - Has this user been approved yet?
 - Grab publicly viewable members
 - Grab members who've stated they'll allow their profiles to be shared
 - Get specific member's dataset who've logged in
 - Write member data to database given user ID from google login

### How to determine a user's access level?
 - The old database structure provides four access levels:
        - Admin
        - Private
        - Public
        - Shared

### How to restrict access to data based on user's access level?
 - Could potentially control this client-side by reading a user's role from the database, but of course from a security perspective this is insanely weak.
 - Could segment Public/Private data into separate documents, as firestore cannot resrict access to specific fields but only entire documents. The problem is querying through private/public data combined becomes a little more difficult and updating through those fields also becomes a little more difficult
         - Can either use Batch updates to atomically update both documents at once 
         - Or sequentially update all the fields
 - Likely the best thing to do is to keep a table of administrators as is in the current structure in a separate collection, as well as the user's shared/public preference in their private data table 
 - Restirct access to a user's private data to only their own UID or an admin ? **I forget if private data can be accessable to other private users ?**


### Wanted Queries:
 - Get all members with field = x
 - Get all shared//public//private members pagnated



## Possible data structures
Major Changes:
 - Remove public_uid 
 - Instead of public_uid we add a field stating weather or not they want their profile public/priavte/shared
 - Collection with admin UID's

### First Idea
 - Members collection where each member gets two documents, one for public data the other for private

**collection**:members
    **document**:<member uid>
        ambassador      (Boolean)
        current_address (Map | document)
        date_created (Datetime)
        first_name (Text String)
        grad_year (Int)
        hometown_address (Map | document)
        industry (Text String)
        last_name (Text String)
        linkedin_profile ( Text String )
        program ( Text String )
        school ( Text String)
        status ( Text String )
    **document**:<member uid> + private_data
        privacy ( Text String ) " Public | Private | Shared "
        interests (Map | document)
        approved ( Boolean )
        email ( Text String )
**collection** : administrators
    **document**:admin_accounts
        uids (Text String Array)
*or*
**collection** : administrators
    **document**:<member uid>
        some junk data maybe?

### Second Iteration
- One collection for public member data documents where ID=UID
       - This document would contain references to their private document in another collection
- Collection with private data documents
- Collection with UID's of moderator UID's

**collection**:public_data
    **document**:<member uid>
        ambassador      (Boolean)
        current_address (Map | document)
        date_created (Datetime)
        first_name (Text String)
        grad_year (Int)
        hometown_address (Map | document)
        industry (Text String)
        last_name (Text String)
        linkedin_profile ( Text String )
        program ( Text String )
        school ( Text String)
        status ( Text String )
**collection**private_data
    **document**:<member uid>
        privacy ( Text String ) " Public | Private | Shared "
        interests (Map | document)
        approved ( Boolean )
        email ( Text String )
**collection** : administrators
    **document**:admin_accounts
        uids (Text String Array)
*or*
**collection** : administrators
    **document**:<member uid>
        some junk data maybe?