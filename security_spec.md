# Security Specification - Alquimia do Prato

## 1. Data Invariants
- A recipe must have a valid title (max 100 chars).
- A recipe must belong to a category from the allowed enum.
- Ingredients and Instructions lists must be within reasonable sizes (max 50 items each).
- `ownerId` must match the `request.auth.uid`.
- `createdAt` and `updatedAt` must be server-side timestamps.

## 2. The Dirty Dozen Payloads (Rejection Tests)
1. **Identity Spoofing**: Attempt to create a recipe with someone else's `ownerId`.
2. **Path Variable Poisoning**: Attempt to access a recipe with a document ID that is 1MB long.
3. **Ghost Field Injection**: Attempt to add `isFeatured: true` when it's not in the schema.
4. **Type Poisoning**: Sending `ingredients` as a string instead of a list.
5. **Denial of Wallet**: Sending 10,000 ingredients in a single recipe.
6. **Immutable Field Attack**: Attempting to change `createdAt` during an update.
7. **Role Escalation**: Attempting to set `ownerId` to an admin UID in a regular update.
8. **PII Leakage**: (N/A for recipes, but we ensure profiles are isolated if added later).
9. **Update Gap**: Attempting to update `title` without providing a new `updatedAt` server timestamp.
10. **State Shortcutting**: (N/A for recipes, no workflow status).
11. **Blanket Query**: Unrestricted list query (we'll ensure indexable fields).
12. **Missing Reference**: Creating a recipe without a valid `ownerId`.

## 3. Operations
- `read`: Anyone can read (get/list) recipes.
- `create`: Authenticated users can create recipes if they own it.
- `update`: Only the owner can update their recipe.
- `delete`: Only the owner can delete their recipe.
