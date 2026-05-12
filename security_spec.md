# Security Specification for Wealth AI Cloud Sync

## Data Invariants
1. A user's financial data can only be accessed or modified by that specific authenticated user.
2. The `userId` in the document must match the `request.auth.uid`.
3. The `updatedAt` field must be a server-generated timestamp or validated against `request.time`.
4. All numeric values must be non-negative.
5. All IDs must be valid strings.

## The Dirty Dozen Payloads (Red Team Audit)

| ID | Payload Description | Expected Result |
|----|----------------------|-----------------|
| 1  | Read another user's data | PERMISSION_DENIED |
| 2  | Create data with `userId` not matching current UID | PERMISSION_DENIED |
| 3  | Update data and change `userId` to a different user | PERMISSION_DENIED |
| 4  | Set `stocks` to a 1MB string (Resource Poisoning) | PERMISSION_DENIED |
| 5  | Set `currentAge` to 500 (Logical Boundary Failure) | PERMISSION_DENIED |
| 6  | Set `updatedAt` to a client-controlled past date | PERMISSION_DENIED |
| 7  | Delete another user's data | PERMISSION_DENIED |
| 8  | Write to a non-existent collection | PERMISSION_DENIED |
| 9  | Inject "Ghost Field" (e.g., `isAdmin: true`) | PERMISSION_DENIED |
| 10 | List all user data as an unauthenticated user | PERMISSION_DENIED |
| 11 | Set a negative value for `cash` | PERMISSION_DENIED |
| 12 | Write a massive 15KB string as a document ID | PERMISSION_DENIED |

## Technical Implementation Plan
1. Use `rules_version = '2'`.
2. Implement `isValidId`, `isSignedIn`, `isOwner`.
3. Implement `isValidUserFinancialData` helper.
4. Enforce strict `affectedKeys().hasOnly()` for updates.
