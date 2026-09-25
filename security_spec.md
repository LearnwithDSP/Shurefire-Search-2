# Shurefire Firestore Security Spec (Phase 0 TDD)

This specification defines the validation requirements and the zero-trust authorization model for the Shurefire Firestore database.

## 1. Data Invariants

1. **Materials (`/materials/{materialId}`)**:
   - Status: Read-Only for standard public users. Write-Only for platforms administrators.
   - Price must be a positive integer representing Nigeria local Naira (₦) rates.
   - ID must be valid and conform to `isValidId()`.

2. **Suppliers (`/suppliers/{supplierId}`)**:
   - Status: Read-Only for standard public users. Write-Only for platform administrators.
   - Requires valid contact details & rating score between `1.0` and `5.0`.

3. **Search Cache (`/search_cache/{cacheId}`)**:
   - Create: Dynamic search query entries are insertable by active sessions (inclusive of Guests and Authenticated builders) for instant caching.
   - Read: Publicly readable to provide ultra-fast loading of repeat queries.
   - Update/Delete: STRICTLY FORBIDDEN. Cache documents are write-once (immutable) to prevent poisoning of verified prices, stock counts, and AI-summaries.

4. **Leads (`/leads/{leadId}`)**:
   - Create: Standard public users can submit sourcing leads/RFQs.
   - Read: Strictly prohibited for public users to prevent contact harvesting. Only registered platform administrators with matching credentials can read.
   - Update/Delete: Prohibited for public users. Only admins can edit or shift status.

---

## 2. The "Dirty Dozen" Payloads

Here are fourteen highly designed attack vectors aimed at breaking the data laws of Identity, Integrity, and State.

### Payload 1: Shadow Admin Escalation on Suppliers
**Attack**: Anonymous hacker tries to write a supplier document.
**Expected**: `PERMISSION_DENIED` (only registered platform admins can write suppliers).
```json
{
  "id": "sup-hack",
  "name": "Malicious Timber Yard",
  "marketName": "Fake Market",
  "city": "Lagos",
  "state": "Lagos",
  "contactPhone": "+234000",
  "rating": 5,
  "isVerified": true,
  "apiConnected": false,
  "apiLatencyMs": 0
}
```

### Payload 2: Price Poisoning on Public Materials
**Attack**: Competitive supplier tries to alter price index of standard cement.
**Expected**: `PERMISSION_DENIED` (write is forbidden to standard users).
```json
{
  "price": 100
}
```

### Payload 3: Injecting Giant Garbage ID (Denial of Wallet)
**Attack**: Attacker attempts to inject a 1MB junk-character string as search_cache ID.
**Expected**: `PERMISSION_DENIED` (ID length must be shorter than 128 characters and match alphanumeric standard).

### Payload 4: Overwriting Verified AI Analysis in Cache (State Shortcutting)
**Attack**: Competitive scrapers try to update existing search answer to write false market indices.
**Expected**: `PERMISSION_DENIED` (update is strictly forbidden on search_cache).
```json
{
  "answer": "All cement in Nigeria is now free!"
}
```

### Payload 5: Splicing Ghost Fields into Search Cache (Shadow Update)
**Attack**: Malicious client injects a 'ghost field' `isAdminWrite: true` into search cache creation.
**Expected**: `PERMISSION_DENIED` (keys must perfectly match allowed attributes).
```json
{
  "queryKey": "cement-lagos-all",
  "query": "cement",
  "region": "Lagos",
  "category": "Cement & Binders",
  "answer": "Dangote pricing is ₦7850.",
  "lastUpdated": "2026-05-28T09:00:00Z",
  "materials": [],
  "apiLogs": [],
  "isAdminWrite": true
}
```

### Payload 6: Deleting Material Catalog (Resource Poisoning)
**Attack**: Deletion attempt on the catalog of active cement rates.
**Expected**: `PERMISSION_DENIED` (delete restricted to admins).

### Payload 7: Deleting Search Query Logs
**Attack**: Deletion request for target `search_cache` documents.
**Expected**: `PERMISSION_DENIED`.

### Payload 8: Negative Price Invariant Breach
**Attack**: Admin attempts to inject negative cement price (e.g., `₦-5000`).
**Expected**: `PERMISSION_DENIED` (price MUST be >= 0).

### Payload 9: Empty Search Terms Logging
**Attack**: Attempting to cache empty queries.
**Expected**: `PERMISSION_DENIED` (query length size constraints).

### Payload 10: High Latitude Latency Flood
**Attack**: Attempt to log false latency metrics (e.g. `999999999ms`) into cache logs.
**Expected**: `PERMISSION_DENIED`.

### Payload 11: Email Verification Bypass in Admins collection
**Attack**: Creating an admin file with `email_verified = false`.
**Expected**: `PERMISSION_DENIED`.

### Payload 12: Invalid Enum category on material cache creation
**Attack**: Creating material with non-existent category folder.
**Expected**: `PERMISSION_DENIED`.

### Payload 13: Lead Information Harvesting (PII Blanket Hack)
**Attack**: Attacker attempts to list or read the `/leads` collection using `getDocs()` or direct ID querying to download prospective buyers' numbers and emails.
**Expected**: `PERMISSION_DENIED` (read/querying leads is strictly restricted to platform admins).

### Payload 14: Lead Status Hijacking (State Alteration)
**Attack**: Guest user attempts to edit a submitted lead's status to `passed_to_merchant` or delete a lead.
**Expected**: `PERMISSION_DENIED` (only admins can edit or delete lead documents).

---

## 3. Security Rule Integration Checkpoints

Rules are verified locally via typescript simulations and standard lint definitions. We enforce standard strict schemas for immutable caches.
