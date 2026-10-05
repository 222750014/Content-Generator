import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, generateImage } from "./ai.server";

export const genContent = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        type: z.string(),
        tone: z.string(),
        audience: z.string(),
        topic: z.string().min(1),
        extra: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const text = await generateText(
      "You are an expert social media copywriter. Write ready-to-post content. No preamble, no markdown headings.",
      `Write 3 distinct versions of a ${data.type} in a ${data.tone} tone.
Topic: ${data.topic}
Audience: ${data.audience || "general"}
Extra instructions: ${data.extra || "none"}
Version 1: professional. Version 2: engaging and conversational, invites discussion. Version 3: creative, Instagram-friendly.
Separate the versions with a line containing only ===VERSION=== . Do not label them.`,
    );
    const versions = text
      .split(/^\s*===VERSION===\s*$/m)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
    return { versions };
  });

export const refineContent = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ text: z.string().min(1), action: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const text = await generateText(
      "You edit social media content. Return only the revised content, nothing else.",
      `Instruction: ${data.action}\n\nContent:\n${data.text}`,
    );
    return { text };
  });

export const genCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ prompt: z.string().min(1), language: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const text = await generateText(
      "You are a senior software engineer. Produce complete, runnable projects.",
      `Build: ${data.prompt}
Preferred language/stack: ${data.language}
Respond in markdown with these sections in order:
## Explanation
## File Structure (a tree in a code block)
## Source Code (each file as a fenced code block, preceded by a line **path/to/file**)
## Requirements
## Installation
## Usage
## Tests (fenced code block if appropriate)
## README (a fenced markdown block)`,
    );
    return { text };
  });

export const codeAction = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().min(1), action: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const text = await generateText(
      "You are a senior software engineer. Respond in concise markdown with fenced code blocks.",
      `Task: ${data.action}\n\nCode/project:\n${data.code.slice(0, 30000)}`,
    );
    return { text };
  });

export const genImage = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ prompt: z.string().min(1), style: z.string(), size: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    const src = await generateImage(`${data.prompt}. Style: ${data.style}.`, data.size);
    return { src };
  });
