/**
 * Simulated agent output for Agent Battles.
 *
 * Actually invoking an arbitrary agent's `apiEndpoint` from the browser
 * isn't something this frontend can do safely or generically (arbitrary
 * CORS targets, no auth handling, no sandboxing of untrusted responses),
 * so a battle "run" is a labeled simulation: a short, deterministic,
 * category-flavored response per agent, revealed with a typewriter effect
 * so the two panels still feel like a live side-by-side comparison. This
 * is disclosed in the UI, not hidden.
 */
import type { Agent } from "@/types";

const OPENERS: Record<string, string[]> = {
  Writing: ["Draft ready — here's a tightened version:", "Here's a first pass, three sentences in:"],
  Research: ["Pulled the top sources and summarized:", "Here's what the evidence actually says:"],
  Trading: ["Ran the numbers against recent volatility:", "Signal check complete —"],
  Education: ["Broke it down into a five-minute explanation:", "Here's the simplest correct version:"],
  Healthcare: ["Note: this is general info, not medical advice.", "Summarizing the relevant guidance:"],
  Programming: ["Here's a working implementation:", "Patched the bug — root cause was:"],
  Marketing: ["Three hooks worth testing:", "Here's the angle with the best CTR history:"],
  "Customer Support": ["Resolved — here's the fix and a follow-up macro:", "Escalation avoided. Here's why:"],
  Finance: ["Modeled it out across three scenarios:", "Here's the breakdown, conservative first:"],
  Crypto: ["Checked on-chain activity for the last 24h:", "Gas-optimized version below:"],
  Productivity: ["Turned that into a checklist:", "Here's the plan, ordered by leverage:"],
  "Image Generation": ["Rendered 4 variations, picking the strongest:", "Composition locked, refining lighting:"],
  Video: ["Storyboard's ready, 6 shots:", "Cut down to the tightest 30 seconds:"],
  Voice: ["Script timed to 22 seconds at natural pace:", "Tone adjusted — warmer, less scripted:"],
  Automation: ["Workflow wired end to end:", "Trigger conditions set, here's the flow:"],
  Custom: ["Here's the output:", "Task complete —"],
};

const CLOSERS = [
  "Want me to go a level deeper on any part of this?",
  "Happy to iterate — just point at what's off.",
  "This is the fast pass; say the word for the thorough one.",
  "Confidence is high here, but flag anything that looks wrong.",
];

// Small deterministic hash so the same agent + task always renders the same
// "output" in a given battle, rather than reshuffling on every re-render.
function seedFrom(...parts: string[]): number {
  const str = parts.join("|");
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function simulateAgentResponse(agent: Agent, task: string): string {
  const openers = OPENERS[agent.category] ?? OPENERS.Custom;
  const seed = seedFrom(agent.id, task);
  const opener = openers[seed % openers.length];
  const closer = CLOSERS[seed % CLOSERS.length];
  const trimmedTask = task.length > 140 ? `${task.slice(0, 140)}…` : task;

  return `${opener}\n\nTask: "${trimmedTask}"\n\n${agent.name} applied its ${agent.capabilities[seed % Math.max(agent.capabilities.length, 1)] ?? "core"} capability and produced a result consistent with its ${agent.trustScore.score}/100 trust score and ${agent.usageCount.toLocaleString()} completed jobs.\n\n${closer}`;
}
