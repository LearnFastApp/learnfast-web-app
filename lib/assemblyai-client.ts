import { AssemblyAI, type Transcript } from "assemblyai";

function getClient() {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error("ASSEMBLYAI_API_KEY not set");
  return new AssemblyAI({ apiKey: key });
}

export async function uploadAndSubmitTranscription(
  buffer: Buffer,
  opts?: { audioEndAt?: number }
): Promise<string> {
  const client = getClient();
  const uploadUrl = await client.files.upload(buffer);
  const transcript = await client.transcripts.submit({
    audio: uploadUrl,
    speech_models: ["universal-2"],
    sentiment_analysis: true,
    auto_highlights: true,
    disfluencies: true,
    ...(opts?.audioEndAt != null ? { audio_end_at: opts.audioEndAt } : {}),
  });
  return transcript.id;
}

export async function submitTranscription(audioUrl: string): Promise<string> {
  const client = getClient();
  const transcript = await client.transcripts.submit({
    audio: audioUrl,
    speech_models: ["universal-2"],
    sentiment_analysis: true,
    auto_highlights: true,
    disfluencies: true,
  });
  return transcript.id;
}

export async function getTranscription(transcriptId: string): Promise<Transcript> {
  const client = getClient();
  return client.transcripts.get(transcriptId);
}

const EN_FILLERS = new Set(["um", "uh", "umm", "uhh", "hmm"]);
const FR_FILLERS = new Set(["euh", "ben", "alors", "voilà", "donc", "voila"]);

export function countFillerWords(words: Transcript["words"], languageCode?: string): number {
  if (!words) return 0;
  const isFr = languageCode?.startsWith("fr");
  const fillers = isFr ? new Set([...EN_FILLERS, ...FR_FILLERS]) : EN_FILLERS;
  return words.filter((w) => fillers.has(w.text.toLowerCase().replace(/[.,!?]/g, ""))).length;
}
