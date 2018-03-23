# Migartion to firestore
This directory will only be present on this current working branch, and will document the migration of our current data from Google Real Time Database to Google Firestore.

# Value Prop

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