/**
 * Monitors a Managed Agents scheduled deployment: lists its runs, then opens
 * the event stream on the latest run's session, sends a kickoff message, and
 * prints the agent's text output as it streams.
 *
 * Run from project root (Node 24+, reads .env.local for ANTHROPIC_API_KEY):
 *   node --env-file=.env.local scripts/monitor-deployment.mjs [deployment_id]
 *
 * Defaults to depl_01XMQpym9kopAip9WaNmMR5u if no deployment_id is given.
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // resolves ANTHROPIC_API_KEY from env

const DEPLOYMENT_ID = process.argv[2] ?? "depl_01XMQpym9kopAip9WaNmMR5u";
const KICKOFF_MESSAGE = "Status check — what's your current progress?";

async function main() {
  console.log(`Listing runs for deployment ${DEPLOYMENT_ID}...`);

  const runs = [];
  for await (const run of client.beta.deploymentRuns.list({ deployment_id: DEPLOYMENT_ID })) {
    runs.push(run);
  }

  if (runs.length === 0) {
    console.log("No runs found for this deployment yet.");
    return;
  }

  // deployment_runs.list has no documented default order — sort explicitly.
  runs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  for (const run of runs) {
    const outcome = run.session_id ? `session ${run.session_id}` : `FAILED (${run.error?.type})`;
    console.log(`  ${run.id}  ${run.created_at}  ${outcome}`);
  }

  const latest = runs[0];
  if (!latest.session_id) {
    console.error(
      `\nLatest run (${latest.id}) did not create a session: ${latest.error?.type} — ${latest.error?.message ?? "no message"}`
    );
    process.exitCode = 1;
    return;
  }

  console.log(`\nMonitoring session ${latest.session_id} (from run ${latest.id})`);
  console.log(`Trace: https://platform.claude.com/workspaces/default/sessions/${latest.session_id}\n`);

  await monitorSession(latest.session_id);
}

async function monitorSession(sessionId) {
  // Stream-first: open the stream before sending, so we never miss an event
  // emitted in the gap between kickoff and stream connection.
  const stream = await client.beta.sessions.events.stream(sessionId);

  client.beta.sessions.events
    .send(sessionId, {
      events: [{ type: "user.message", content: [{ type: "text", text: KICKOFF_MESSAGE }] }],
    })
    .catch((err) => console.error("\nFailed to send kickoff message:", err.message));

  for await (const event of stream) {
    switch (event.type) {
      case "agent.message":
        for (const block of event.content) {
          if (block.type === "text") process.stdout.write(block.text);
        }
        break;

      case "session.error":
        console.error(`\n\n[session.error] ${event.error.type}: ${event.error.message}`);
        process.exitCode = 1;
        return;

      case "session.status_terminated":
        console.log("\n\n--- session terminated ---");
        return;

      case "session.status_idle":
        // requires_action means the agent is waiting on us (tool confirmation /
        // custom tool result) — not actually done. Any other stop_reason is terminal.
        if (event.stop_reason?.type !== "requires_action") {
          console.log("\n\n--- session idle — done ---");
          return;
        }
        break;
    }
  }
}

main().catch((err) => {
  if (err instanceof Anthropic.NotFoundError) {
    console.error(`Not found: ${err.message}`);
  } else if (err instanceof Anthropic.RateLimitError) {
    console.error(`Rate limited: ${err.message}`);
  } else if (err instanceof Anthropic.APIConnectionError) {
    console.error(`Connection error: ${err.message}`);
  } else if (err instanceof Anthropic.APIError) {
    console.error(`API error (${err.status}): ${err.message}`);
  } else {
    console.error("Unexpected error:", err);
  }
  process.exitCode = 1;
});
