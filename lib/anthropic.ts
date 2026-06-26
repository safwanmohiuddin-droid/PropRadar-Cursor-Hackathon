import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-3-5-sonnet-20241022";

export function hasAnthropic(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Call Claude expecting a JSON object back. Returns the parsed object, or
 * null on any failure (no key, network error, bad JSON) so callers can fall
 * back to a deterministic mock and never crash the demo.
 */
export async function callClaudeJson<T = unknown>(
  system: string,
  user: string,
): Promise<T | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const cleaned = text
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[anthropic] call failed, using mock:", err);
    return null;
  }
}
