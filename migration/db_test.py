"""
    Quick test script to confirm some of my structure theories
"""

import json

# Open that dank database
with open("/home/matthew/Downloads/globalnl-database-export.json") as f:
    # Read json
    db = json.loads( f.read().replace('\n', '') )
    # Extract the separate tables
    moderators = db['moderators']
    private = db['private']
    public = db['public']
    shared = db['shared']

    # Extract different user tables
    private_members = private['members']
    public_members = public['members']
    shared_members = shared['members']

    # Are the private UID's reflected in the rest of the user keys?
    private_uid_in_public = True
    private_uid_in_shared = True
    for private_uid, private_data in private_members.items():
        # Check public table
        if not private_uid in public_members:
            print("{} from private table is missing from the public table".format(private_uid))
            private_uid_in_shared = False
        # Check shared table
        if not private_uid in shared_members:
            print("{} from private table is missing from the shared table".format(private_uid))
            private_uid_in_public = False

    # Are all the UID's in the public set also in the shared set
    public_uid_in_shared = True
    for public_uid, public_data in public_members.items():
        #print("Is {} from public table in shared table?".format(public_uid))
        if not public_uid in shared_members:
            print("{} from public table is missing from the shared table".format(public_uid))
            public_uid_in_shared = False
    
    # Are all UID's in the shared set also in the public set
    shared_uid_in_public = True
    for shared_uid, shared_data in shared_members.items():
        #print("Is {} from public table in shared table?".format(public_uid))
        if not shared_uid in public_members:
            print("{} from shared table is missing from the public table".format(shared_uid))
            shared_uid_in_public = False
    
    # Report UID reflection results
    print("\n================================================\n")
    if  not private_uid_in_public :
        print(" - Private UID's are missing from the public table")
    else:
        print(" - All private UID's are in the public table")
    if not private_uid_in_shared :
        print(" - Private UID's are missing from the shared table")
    else:
        print(" - All private UID's are in the shared table")
    if not public_uid_in_shared :
        print(" - Public UID's are missing from the shared table")
    else:
        print(" - All public UID's are in the shared table")
    if not shared_uid_in_public :
        print(" - Shared UID's are missing from the public table")
    else:
        print(" - All shared UID's are in the public table")
    