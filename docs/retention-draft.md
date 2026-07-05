# Data Retention — DRAFT FOR OLLIE'S REVIEW
# Do not publish without review. See flags below marked ⚠️ DECISION NEEDED.

---

## LearnFast Data Retention Policy (Analytical Layer)

*This section covers the data collections introduced as part of the Communication
Intelligence Data Foundation (V1). It supplements the existing privacy policy.*

---

### Collections and Retention Periods

| Collection | Contains | Retention | Erasure behaviour |
|------------|----------|-----------|-------------------|
| `events` | Pseudonymous event log (user_key, timestamps, event type, payload — no PII) | Indefinite | user_key column becomes unattributable on identity erasure; row retained |
| `measurements` | Scored performance records (user_key, scores, context — no PII) | Indefinite | Same as events |
| `interventions` | Prescribed recommendations (user_key, kind, status — no PII) | Indefinite | Same as events |
| `scoring_versions` | AI model and prompt version registry — no personal data | Indefinite | N/A |
| `presenters/{uid}` | Profile PII (email, name, industry) | Until account deletion | Hard-deleted on erasure request |
| Raw artifact bundles (R2 storage) | Transcript text + full AI/AssemblyAI JSON per measurement | Until identity erasure | Deleted from R2 on erasure request |

---

### Pseudonymisation by Design

All analytical collections reference users only by `user_key` — an opaque UUID with no
mathematical or structural relationship to the Firebase auth UID, email address, or any
other identifier. The mapping (`user_key → uid`) exists only in the `presenters` collection.

On a valid erasure request:
1. The `presenters/{uid}` document PII fields are deleted.
2. Raw artifact bundles (which contain transcript text) are deleted from R2.
3. The Firebase Auth account is deleted.

After these steps, the `events`, `measurements`, and `interventions` records keyed to that
`user_key` no longer "relate to an identified or identifiable natural person" as defined by
GDPR Article 4(1), because the only mapping capable of re-identification has been destroyed.
These records are retained as no-longer-attributable research data.

This approach is consistent with GDPR Recital 26: "The principles of data protection should
not apply to anonymous information, namely information which does not relate to an identified
or identifiable natural person or to personal data rendered anonymous in such a manner that
the data subject is not or no longer identifiable."

---

### Lawful Basis

| Processing activity | Lawful basis | Notes |
|--------------------|--------------|-------|
| Operating the product (scoring, reports, session feedback) | Contract (Article 6(1)(b)) | Necessary to deliver the service |
| Pseudonymised event log for product improvement | Legitimate interests (Article 6(1)(f)) | LIA: improvement of service quality; low privacy risk due to pseudonymisation |
| Scoring version registry | Legitimate interests | No personal data involved |

✅ **RESOLVED (2026-07-05) — Research/training use:**
Clause added to privacy policy sections 3 (How We Use Your Data) and 7 (Data Retention).
Lawful basis: legitimate interests. Decision made by Ollie Richardson.

---

### Audio and Media Retention

✅ **RESOLVED (2026-07-05) — Audio retention for model training:**
Decision: do NOT retain audio. Current implementation does not retain audio beyond the
transcription window. Revisit only with explicit opt-in consent flow and legal review.
Decision made by Ollie Richardson.

---

### Subject Access Requests

Users may request a copy of their data. For the analytical layer, the appropriate response is:
- Provide the measurement records (scores, dates, context) keyed to their user_key.
- **Do not** export raw BigQuery data — it may contain records from other users.
- Use the admin Firestore query: `measurements.where("user_key", "==", user_key).get()`

A self-service data export feature is planned for a future build. Until then, handle
manually via the admin SDK with a response time of ≤30 days per GDPR Article 12.

---

*Draft prepared: 2026-07-05. Requires Ollie's review before inclusion in published privacy policy.*
