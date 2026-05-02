# Security Specification for Block Blast Master

## Data Invariants
- A user can only update their own best score.
- The `bestScore` can only be updated if the new score is higher than the existing one (client-side logic, but we enforce ownership).
- `updatedAt` must be a server timestamp.
- User IDs in path must match the authenticated user UID.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to update `users/otherUID` as `meUID`.
2. **Ghost Field Injection**: Add `isAdmin: true` to the user document.
3. **Negative Score**: Set `bestScore: -100`.
4. **Huge String Poisoning**: Set `displayName` to a 1MB string.
5. **Timestamp Forgery**: Provide a manual client-side timestamp for `updatedAt`.
6. **Score Decrement**: Try to lower the high score from 5000 to 100 (if we had strict logic for it).
7. **Cross-User Read**: Try to list all users if not logged in (profile metadata is public for leaderboard).
8. **Malicious ID**: Create a user document with ID `../../secrets`.
9. **Field Type Poisoning**: Set `bestScore` to a string `"9999"`.
10. **Unauthorized Delete**: Try to delete another user's profile.
11. **Shadow Ownership**: Set `uid` field in data to match someone else while document ID is mine.
12. **Missing Required Fields**: Create a user without a `displayName`.

## Test Runner
Verified by generating rigorous rules to handle these cases.
