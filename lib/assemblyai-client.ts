import { AssemblyAI, type Transcript } from "assemblyai";

function getClient() {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error("ASSEMBLYAI_API_KEY not set");
  return new AssemblyAI({ apiKey: key });
}

export async function submitTranscription(audioUrl: string): Promise<string> {
  const client = getClient();
  const transcript = await client.transcripts.submit({
    audio: audioUrl,
    speech_model: "best",
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

export function countFillerWords(words: Transcript["words"]): number {
  if (!words) return 0;
  const fillers = new Set(["um", "uh", "umm", "uhh", "hmm"]);
  return words.filter((w) => fillers.has(w.text.toLowerCase().replace(/[.,!?]/g, ""))).length;
}
