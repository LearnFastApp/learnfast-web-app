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

⚠️ **DECISION NEEDED — Research/training use:**
If LearnFast intends to use pseudonymised measurement data to train or fine-tune AI models
(including future recommendation engine development), this likely requires explicit consent
OR a separate legitimate interests assessment specifically covering research/training use.
The current privacy policy does not include a research-use clause.

**Recommended action:** Add a clause to the privacy policy such as:
*"We may use anonymised and pseudonymised records of your presentation scores and
improvement patterns to improve our scoring algorithms and develop personalised
recommendations. This data cannot be linked back to you once your account is deleted."*

Do not ship this clause without your review. Flag to legal if required.

---

### Audio and Media Retention

⚠️ **DECISION NEEDED — Audio retention for model training:**
Current behaviour: audio files are not retained by LearnFast beyond the transcription
window (Bunny.net CDN, short TTL). Transcript text is retained in raw artifact bundles.

If LearnFast later wants to train on audio (prosody, tone, voice characteristics), it will
need to:
1. Retain audio files explicitly.
2. Obtain specific consent (audio biometric data may be sensitive personal data in some
   jurisdictions).
3. Update the privacy policy and DPA.

This is a future decision. Current implementation does NOT retain audio.

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
