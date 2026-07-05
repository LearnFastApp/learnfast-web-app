# BigQuery Setup — LearnFast Intelligence Dataset

## Overview

The Firestore → BigQuery streaming extension keeps a live replica of the analytical
collections (events, measurements, interventions, scoring_versions) in BigQuery for
querying and analysis — without touching production Firestore.

**Identity is deliberately excluded from BigQuery.** PII lives only in Firestore
(presenters collection, deletable per GDPR erasure script). Joins requiring identity
(e.g. contacting a specific user) must be done in Firestore-side admin tooling only.

---

## 1. Install the Extension

In the Firebase console:

1. Go to **Extensions → Explore extensions**
2. Search for **"Stream Firestore to BigQuery"** (by Google)
3. Install with these settings:

| Setting | Value |
|---------|-------|
| Dataset location | `EU` (data residency consistent with GDPR posture) |
| Dataset ID | `learnfast_intelligence` |
| Collections to stream | `events,measurements,interventions,scoring_versions` |
| Transform function | Disabled (use raw events) |
| Backup collection | Disabled |

4. Repeat the install for each collection (the extension supports one collection per instance).

**Do NOT add `identity`, `presenters`, or any PII-bearing collection.**

---

## 2. Verify Streaming

After install, fire a test event through any user flow (e.g., submit a try-page assessment).
Within 60 seconds, check:

```sql
SELECT * FROM `learnfast_intelligence.events_raw_latest`
WHERE JSON_VALUE(data, '$.type') = 'funnel.try_started'
ORDER BY timestamp DESC
LIMIT 5;
```

---

## 3. Saved Example Queries

### Q1 — Measurements per week by kind
```sql
SELECT
  DATE_TRUNC(DATE(TIMESTAMP_MILLIS(CAST(JSON_VALUE(data, '$.ts._seconds') AS INT64) * 1000)), WEEK) AS week,
  JSON_VALUE(data, '$.kind') AS kind,
  COUNT(*) AS count
FROM `learnfast_intelligence.measurements_raw_latest`
WHERE JSON_VALUE(data, '$.backfilled') = 'false'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;
```

### Q2 — Per-user score trajectory (single scoring version only)
```sql
SELECT
  JSON_VALUE(data, '$.user_key') AS user_key,
  CAST(JSON_VALUE(data, '$.sequence_index') AS INT64) AS sequence_index,
  CAST(JSON_VALUE(data, '$.scores.clarity') AS FLOAT64) AS clarity,
  CAST(JSON_VALUE(data, '$.scores.energy') AS FLOAT64) AS energy,
  CAST(JSON_VALUE(data, '$.scores.engagement') AS FLOAT64) AS engagement,
  CAST(JSON_VALUE(data, '$.scores.understanding') AS FLOAT64) AS understanding,
  CAST(JSON_VALUE(data, '$.scores.connection') AS FLOAT64) AS connection,
  CAST(JSON_VALUE(data, '$.scores.composite') AS FLOAT64) AS composite
FROM `learnfast_intelligence.measurements_raw_latest`
WHERE
  JSON_VALUE(data, '$.scoring_version_ref') = 'scoring_versions/sv_2026_07_v1'
  AND JSON_VALUE(data, '$.backfilled') = 'false'
ORDER BY user_key, sequence_index;
```

### Q3 — Intervention completion rate by kind
```sql
SELECT
  JSON_VALUE(data, '$.kind') AS kind,
  COUNT(*) AS total_prescribed,
  COUNTIF(JSON_VALUE(data, '$.status') = 'completed') AS completed,
  COUNTIF(JSON_VALUE(data, '$.status') = 'viewed') AS viewed,
  COUNTIF(JSON_VALUE(data, '$.status') = 'dismissed') AS dismissed,
  ROUND(COUNTIF(JSON_VALUE(data, '$.status') = 'completed') / COUNT(*) * 100, 1) AS completion_rate_pct
FROM `learnfast_intelligence.interventions_raw_latest`
GROUP BY kind
ORDER BY total_prescribed DESC;
```

### Q4 — Audience-loop conversion (audience score → try started)
```sql
-- Users who submitted audience feedback and then started a /try assessment
WITH audience_submitters AS (
  SELECT DISTINCT
    JSON_VALUE(data, '$.payload.session_id') AS session_id,
    TIMESTAMP_MILLIS(CAST(JSON_VALUE(data, '$.ts._seconds') AS INT64) * 1000) AS submitted_at
  FROM `learnfast_intelligence.events_raw_latest`
  WHERE JSON_VALUE(data, '$.type') = 'measurement.audience_score_submitted'
),
try_starts AS (
  SELECT
    JSON_VALUE(data, '$.guest_key') AS guest_key,
    TIMESTAMP_MILLIS(CAST(JSON_VALUE(data, '$.ts._seconds') AS INT64) * 1000) AS try_at,
    JSON_VALUE(data, '$.context.source') AS source
  FROM `learnfast_intelligence.events_raw_latest`
  WHERE
    JSON_VALUE(data, '$.type') = 'funnel.try_started'
    AND JSON_VALUE(data, '$.context.source') = 'audience_loop'
)
SELECT
  COUNT(DISTINCT try_starts.guest_key) AS audience_loop_try_starts,
  COUNT(DISTINCT audience_submitters.session_id) AS unique_sessions_with_audience,
  ROUND(COUNT(DISTINCT try_starts.guest_key) / NULLIF(COUNT(DISTINCT audience_submitters.session_id), 0) * 100, 1) AS conversion_pct
FROM audience_submitters
LEFT JOIN try_starts ON try_starts.try_at > audience_submitters.submitted_at;
```

### Q5 — Week-4 retention by signup cohort
```sql
-- Users who signed up and returned to take a measurement in week 4
WITH signups AS (
  SELECT
    JSON_VALUE(data, '$.user_key') AS user_key,
    DATE(TIMESTAMP_MILLIS(CAST(JSON_VALUE(data, '$.ts._seconds') AS INT64) * 1000)) AS signup_date,
    DATE_TRUNC(DATE(TIMESTAMP_MILLIS(CAST(JSON_VALUE(data, '$.ts._seconds') AS INT64) * 1000)), WEEK) AS cohort_week
  FROM `learnfast_intelligence.events_raw_latest`
  WHERE JSON_VALUE(data, '$.type') = 'funnel.signup'
),
week4_activity AS (
  SELECT DISTINCT
    JSON_VALUE(data, '$.user_key') AS user_key
  FROM `learnfast_intelligence.measurements_raw_latest`
),
cohort_join AS (
  SELECT
    s.cohort_week,
    s.user_key,
    m.user_key IS NOT NULL AS retained_week4
  FROM signups s
  LEFT JOIN week4_activity m ON s.user_key = m.user_key
  WHERE DATE_DIFF(CURRENT_DATE(), s.signup_date, DAY) >= 28
)
SELECT
  cohort_week,
  COUNT(*) AS cohort_size,
  COUNTIF(retained_week4) AS retained,
  ROUND(COUNTIF(retained_week4) / COUNT(*) * 100, 1) AS retention_pct
FROM cohort_join
GROUP BY cohort_week
ORDER BY cohort_week DESC;
```

---

## 4. PII Safety Check

Run this query periodically to confirm no PII has leaked into the warehouse:

```sql
-- Scan for email patterns across all analytical collections
SELECT 'events' AS collection, document_name, JSON_VALUE(data, '$.user_key') AS user_key
FROM `learnfast_intelligence.events_raw_latest`
WHERE REGEXP_CONTAINS(TO_JSON_STRING(data), r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
UNION ALL
SELECT 'measurements', document_name, JSON_VALUE(data, '$.user_key')
FROM `learnfast_intelligence.measurements_raw_latest`
WHERE REGEXP_CONTAINS(TO_JSON_STRING(data), r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}');
-- A clean result returns zero rows.
```
