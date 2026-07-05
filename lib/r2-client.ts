import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID!;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
const bucket = process.env.R2_BUCKET ?? "learnfast-rehearsals";
const publicUrl = process.env.R2_PUBLIC_URL!;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

// ── Raw artifact bundles ──────────────────────────────────────────────────────
// Stored under raw/{user_key}/{measurement_id}/ — immutable, no lifecycle deletion
// except the GDPR erasure script (scripts/gdpr-erase-user.mjs).

async function putRawObject(key: string, body: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(body, "utf-8"),
      ContentType: "application/json",
    })
  );
}

export interface RawAssessmentBundle {
  transcript_text: string;
  assemblyai_response: Record<string, unknown>;
  analysis_response: Record<string, unknown>;
}

/**
 * Upload all raw artifacts for an AI assessment in one call.
 * Returns the R2 path prefix (raw/{user_key}/{measurement_id}).
 */
export async function uploadRawAssessmentBundle(
  user_key: string,
  measurement_id: string,
  bundle: RawAssessmentBundle
): Promise<string> {
  const prefix = `raw/${user_key}/${measurement_id}`;
  await Promise.all([
    putRawObject(`${prefix}/transcript.txt`, bundle.transcript_text),
    putRawObject(`${prefix}/assemblyai.json`, JSON.stringify(bundle.assemblyai_response)),
    putRawObject(`${prefix}/analysis.json`, JSON.stringify(bundle.analysis_response)),
  ]);
  return prefix;
}

export interface RawRehearsalBundle {
  transcript_text: string;
  assemblyai_response: Record<string, unknown>;
  coaching_response: Record<string, unknown>;
}

/**
 * Upload all raw artifacts for a rehearsal take.
 * Returns the R2 path prefix.
 */
export async function uploadRawRehearsalBundle(
  user_key: string,
  measurement_id: string,
  bundle: RawRehearsalBundle
): Promise<string> {
  const prefix = `raw/${user_key}/${measurement_id}`;
  await Promise.all([
    putRawObject(`${prefix}/transcript.txt`, bundle.transcript_text),
    putRawObject(`${prefix}/assemblyai.json`, JSON.stringify(bundle.assemblyai_response)),
    putRawObject(`${prefix}/coaching.json`, JSON.stringify(bundle.coaching_response)),
  ]);
  return prefix;
}

export async function uploadTakeAudio(
  takeId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "webm";
  const key = `takes/${takeId}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return `${publicUrl}/${key}`;
}
