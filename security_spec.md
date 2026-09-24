# Security Specification for Firestore Rules

This document outlines the security architecture, data invariants, and threat-modeling payloads used to verify our Firestore rules.

## Data Invariants
1. A user document must have a valid string `userId` and `username`.
2. A user's `userId` must match the document path ID.
3. Users cannot self-banned or self-promote their role to admin/superadmin unless verified.

## Threat Payloads ("The Dirty Dozen")
Below are 12 malicious payloads designed to attempt to breach our security boundaries. All must be denied.

1. **Self-Promotion to Admin**: `{ "role": "admin", "userId": "attacker_id", "username": "attacker" }`
2. **Bypassing Minimum Username Length**: `{ "userId": "attacker_id", "username": "" }`
3. **Invalid ID Character Injection**: Path with characters like `$$%^` targeting `users/`
4. **Giant Payload Exhaustion**: Setting 1MB username string
5. **No Auth Creation**: Attempting to write a document without a `request.auth` context
6. **Altering Another User's Record**: `request.auth.uid == "victim"` while path is `"users/attacker"`
7. **Type Poisoning (Integer as String)**: `{ "money": "one_million", "userId": "attacker_id" }`
8. **Forged Verification State**: Attempting to set `{ "isVerified18": true }` directly on user registration
9. **Role Injection**: `{ "role": "superadmin" }`
10. **Orphaned Record**: Creating a state without proper references
11. **Malicious Special Character Field**: `{ "userId": "attacker_id", "username": "<script>alert('hack')</script>" }`
12. **Null Value Bypass**: `{ "userId": null, "username": "null_user" }`
