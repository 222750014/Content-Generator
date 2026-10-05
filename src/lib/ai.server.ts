const BASE = "https://ai.gateway.lovable.dev/v1";
const TEXT_MODEL = "openai/gpt-6-astra";
const IMAGE_MODEL = "openai/gpt-image-2.5-sunburst";

function key() {
  const k = process.env['LOVABLE_API_KEY'];
  if (!k) throw new Error("AI is not configured (missing key).");
  return k;
}

async function fail(res: Response): Promise<never> {
  const body = await res.text().catch(() => "");
  let msg = body;
  try {
    const j = JSON.parse(body);
    msg = j.error?.message || j.message || body;
  } catch {}
  if (res.status === 429) throw new Error("Too many requests — please wait a moment and try again.");
  if (res.status === 402) throw new Error("AI credits are used up. Add credits to continue.");
  throw new Error(msg || `AI request failed (${res.status})`);
}

/** Streams a Responses call and returns the final text. */
export async function generateText(system: string, prompt: string): Promise<string> {
  const res = await fetch(`${BASE}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      instructions: system,
      input: [{ role: "user", content: prompt }],
      reasoning: { effort: "low" },
      store: false,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) await fail(res);
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const ev = JSON.parse(data);
          if (ev.type === "response.output_text.delta") out += ev.delta;
          if (ev.type === "error" || ev.type === "response.failed")
            throw new Error(ev.error?.message || ev.response?.error?.message || "AI error");
        } catch (e) {
          if (e instanceof Error && e.message !== "Unexpected end of JSON input" && !(e instanceof SyntaxError)) throw e;
        }
      }
    }
  }
  if (!out.trim()) throw new Error("The AI returned no text. Try again with a different request.");
  return out.trim();
}

export async function generateImage(prompt: string, size: string): Promise<string> {
  const res = await fetch(`${BASE}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size, n: 1 }),
  });
  if (!res.ok) await fail(res);
  const j = await res.json();
  const b64 = j.data?.[0]?.b64_json;
  if (b64) return `data:image/png;base64,${b64}`;
  if (j.data?.[0]?.url) return j.data[0].url;
  throw new Error("No image was returned.");
}
