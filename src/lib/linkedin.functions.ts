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

export const postLinkedInImage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ image: z.string().min(10), text: z.string().max(3000).optional().default("") }).parse(d))
  .handler(async ({ data }) => {
    const h = headers();
    const me = await fetch(`${GATEWAY}/v2/userinfo`, { headers: h });
    await check(me, "profile lookup");
    const { sub } = (await me.json()) as { sub: string };

    const meta = data.image.slice(0, data.image.indexOf(","));
    const mime = /image\/\w+/.exec(meta)?.[0] ?? "image/png";
    const b64 = data.image.slice(data.image.indexOf(",") + 1);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    // Register the image so LinkedIn gives us a one-time upload URL + media URN.
    const reg = await fetch(`${GATEWAY}/v2/images?action=registerUpload`, {
      method: "POST",
      headers: { ...h, "X-Restli-Protocol-Version": "2.0.0" },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: `urn:li:person:${sub}`,
          serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
        },
      }),
    });
    await check(reg, "image upload registration");
    const regJson = (await reg.json()) as {
      value?: { uploadMechanism?: { "com.linkedin.digitalmediaPosting.AsyncMediaUploadMechanism"?: { uploadUrl?: string } }; asset?: string };
    };
    const uploadUrl = regJson.value?.uploadMechanism?.["com.linkedin.digitalmediaPosting.AsyncMediaUploadMechanism"]?.uploadUrl;
    const asset = regJson.value?.asset;
    if (!uploadUrl || !asset) throw new Error("LinkedIn did not return an upload URL.");

    // PUT the raw image bytes to the one-time upload URL (no auth headers there).
    const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": mime }, body: bytes });
    if (!put.ok) {
      const body = await put.text();
      console.error(`LinkedIn image upload failed [${put.status}]: ${body}`);
      throw new Error(`LinkedIn image upload failed (${put.status}): ${body.slice(0, 300)}`);
    }

    const res = await fetch(`${GATEWAY}/v2/ugcPosts`, {
      method: "POST",
      headers: { ...h, "X-Restli-Protocol-Version": "2.0.0" },
      body: JSON.stringify({
        author: `urn:li:person:${sub}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: data.text },
            shareMediaCategory: "IMAGE",
            media: [{ status: "READY", mediaUrn: asset }],
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    await check(res, "post");
    const id = res.headers.get("x-restli-id") ?? ((await res.json().catch(() => ({}))) as { id?: string }).id;
    return { url: id ? `https://www.linkedin.com/feed/update/${id}/` : "https://www.linkedin.com/feed/" };
  });
