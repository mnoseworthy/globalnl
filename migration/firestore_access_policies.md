# Firestore access policies
See the [security policy reference docs](https://firebase.google.com/docs/firestore/reference/security/) for more info.

# Required functionality
List of restrictions:
## Member table
Read if:
    - User is authenticated
Create if:
    - User's UID doesn't not already exist in the collection & all fields match parsing rules
        - Just match types against expected, perhaps more validation down the road
Delete if:
    - User's UID is in the Moderator collection
## Specific Document in Member table
Read if:
    - User is authenticated
Update if:
    - User's UID matches the document name
    - Moderator
Delete if:
    - User's UID is in the Moderator collection
## Private table
Read if:
    - User's UID is in the Moderator collection
Create if:
    - User's UID doesn't not already exist in the collection & all fields match parsing rules
        -   Enforce that Approved == false
## Specific document in private table
read if:
    - moderator 
    - UID matches ref id
Update if:
    - User's UID is in the Moderator collection
    - User's UID matches the document name & the field is not the approved status
Delete if:
    - User's UID is in the Moderator collection
 

# Implementation
``` javascript
service cloud.firestore {
  match /databases/{database}/documents {
	function isModerator()
    {
        return exists(/databases/$(database)/documents/moderators/$(request.auth.uid)) 
    }
    match /members 
    {
        allow read:  if request.auth != null;
        allow create: if !exists(/databases/$(database)/documents/members/$(request.auth.uid));
        match /{member}
        {
            allow read: if request.auth != null;
            allow update: if ( request.auth.uid == $member ) || isModerator();
        }    
    }
    match /private_data
    {
    		allow read: if isModerator();
        allow create: if !exists(/databases/$(database)/documents/private_data/$(request.auth.uid));
    		match /{member}
        {
        		allow read: if isModerator() || ( request.auth.uid == $member );
            allow update: if isModerator() || ( request.auth.uid == $member );
        }
    }

  }
}
```