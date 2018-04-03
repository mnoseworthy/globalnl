"""
    Quick test script to confirm some of my structure theories
"""

import json
import pprint

# Open that dank database
with open("/home/matthew/Downloads/globalnl-database-export.json") as f:

    ####################################################################
    #   Setup
    ####################################################################

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

    ####################################################################
    #   Private UID's as keys in Public//Shared
    ####################################################################

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

    ####################################################################
    #   Key's shared between public & shared
    ####################################################################
    
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
    
    ####################################################################
    #   Public UID's stored in private table are Keys of public/shared 
    #   table
    ####################################################################
    public_uid_keys_of_public = True
    public_uid_keys_of_shared = True
    public_uid_in_either_public_or_shared = True
    private_table_always_has_public_uid = True
    privacy_either_public_or_shared = True
    for private_uid, private_data in private_members.items():
        if private_data:
            if u"public_uid" in private_data:
                public_uid = private_data["public_uid"]
            else:
                private_table_always_has_public_uid = False
            if not public_uid in public_members:
                print("Public UID {} missing from public members").format(public_uid)
                public_uid_keys_of_public = False
            if not public_uid in shared_members:
                print("Public UID {} missing from shared members").format(public_uid)
                public_uid_keys_of_shared = False
            if not public_uid in public_members and not public_uid in shared_members:
                privacy_either_public_or_shared = False
        else:
            print("Public UID {} missing from both shared and public").format(public_uid)
            private_table_always_has_public_uid = False
    
    ####################################################################
    #   Members with privacy=public are in public, shared are in shared
    #   and not in both at once
    ####################################################################
    privacy_shared_in_shared = True
    privacy_public_in_public = True
    all_members_have_privacy_setting = True
    
    for private_uid, private_data in private_members.items():
        if private_data:
            if u"privacy" in private_data:
                if u"public_uid" in private_data:
                    if private_data["privacy"] == u"public":
                        if not private_data["public_uid"] in public_data:
                            privacy_public_in_public = False 
                    elif private_data["privacy"] == u"shared":
                        if not private_data["public_uid"] in shared_data:
                            privacy_shared_in_shared = False
                    else:
                        privacy_either_public_or_shared = False
            else:
                all_members_have_privacy_setting = False
    ####################################################################
    #   Count field occurances in each dataset
    ####################################################################
    private_entry_compare = {}
    # We're just going to iterate over each member entry and increment a
    # a counter for each field to determine what fields are missing from
    # some entries
    for private_uid, private_data in private_members.items():
        if private_data:
            for field, value in private_data.items():
                if field in private_entry_compare:
                    private_entry_compare[field] = private_entry_compare[field] + 1
                else:
                    private_entry_compare[field] = 1


    public_entry_compare = {}
    for public_uid, public_data in public_members.items():
        if public_data:
            for field, value in public_data.items():
                if field in public_entry_compare:
                    public_entry_compare[field] = public_entry_compare[field] + 1
                else:
                    public_entry_compare[field] = 1

    shared_entry_compare = {}
    for shared_uid, shared_data in shared_members.items():
        if shared_data:
            for field, value in shared_data.items():
                if field in shared_entry_compare:
                    shared_entry_compare[field] = shared_entry_compare[field] + 1
                else:
                    shared_entry_compare[field] = 1
    


    ####################################################################
    #   Check which fields from private table are missing from shared
    #   or public
    ####################################################################
    missing_field_count_private = {}
    missing_field_count_public = {}
    #for private_uid, private_data in private_members.items():
        # On first iteration populate fields to check for
    #    if missing_field_count_private = {}:

    #    for public_uid



    ####################################################################
    # Report UID reflection results
    ####################################################################
    print("\n================================================\n\nUID Key Report:")
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
    if private_table_always_has_public_uid:
        print(" - All entries in the private table have a public UID property") 
    else:
        print(" - Some private member entries are missing public UID's")
    if public_uid_keys_of_public:
        print(" - All public UID's from the private table are key's in the public table")
    else:
        print( " - Public UID's from private table are missing from the public table")
    if public_uid_keys_of_shared:
        print(" - All public UID's from the private table are key's in the shared table")
    else:
        print( " - Public UID's from private table are missing from the shared table")
    if public_uid_in_either_public_or_shared:
        print(" - All public UID's are present in either shared or public tables as keys")
    else:
        print( " - Some public UID's aren't present in either shared or public tables")
    if all_members_have_privacy_setting:
        print(" - All members in the priavte table have a privacy setting")
    else:
        print(" - Some members in the private table don't have a privacy setting")
    if privacy_shared_in_shared:
        print(" - All members with privacy=shared have their public ID's as keys in the shared table")
    else:
        print(" - Some members with privacy=shared do not have their public ID's as keys in the shared table")
    if privacy_public_in_public:
        print(" - All members with privacy=public have their public ID's as keys in the public table")
    else:
        print(" - Some members with privacy=public do not have their public ID's as keys in the public table")

    ####################################################################
    # Report UID reflection results
    ####################################################################
    print("\n================================================\nData Normalization Report:")
    print("\nCount of fields accress all entries in the Private table:")
    pprint.pprint(private_entry_compare)
    print("\nCount of fields accress all entries in the Public table:")
    pprint.pprint(public_entry_compare)
    print("\nCount of fields accress all entries in the Shared table:")
    pprint.pprint(shared_entry_compare)