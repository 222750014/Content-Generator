import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/linkedin";

function headers() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const li = process.env["LINKEDIN_API_KEY"];
  if (!lovable || !li) throw new Error("LinkedIn is not connected.");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": li,
    "Content-Type": "application/json",
  };
}

async function check(res: Response, what: string) {
  if (!res.ok) {
    const body = await res.text();
    console.error(`LinkedIn ${what} failed [${res.status}]: ${body}`);
    throw new Error(`LinkedIn ${what} failed (${res.status}): ${body.slice(0, 300)}`);
  }
}

export const postToLinkedIn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ text: z.string().min(1).max(3000) }).parse(d))
  .handler(async ({ data }) => {
    const h = headers();
    const me = await fetch(`${GATEWAY}/v2/userinfo`, { headers: h });
    await check(me, "profile lookup");
    const { sub } = (await me.json()) as { sub: string };

    const res = await fetch(`${GATEWAY}/v2/ugcPosts`, {
      method: "POST",
      headers: { ...h, "X-Restli-Protocol-Version": "2.0.0" },
      body: JSON.stringify({
        author: `urn:li:person:${sub}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: data.text },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    await check(res, "post");
    const id = res.headers.get("x-restli-id") ?? ((await res.json().catch(() => ({}))) as { id?: string }).id;
    return { url: id ? `https://www.linkedin.com/feed/update/${id}/` : "https://www.linkedin.com/feed/" };
  });
