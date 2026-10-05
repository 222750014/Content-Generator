import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PenLine, ImageIcon, Code2, Sparkles, Copy, Download, RefreshCw, Check, Loader2, Wand2, Send, Share2 } from "lucide-react";
import { genContent, refineContent, genCode, codeAction, genImage } from "@/lib/ai.functions";
import { postToLinkedIn, postLinkedInImage } from "@/lib/linkedin.functions";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — ContentFlow AI" },
      { name: "description", content: "Generate social posts, AI images and full code projects in the ContentFlow AI studio." },
      { property: "og:title", content: "Studio — ContentFlow AI" },
      { property: "og:description", content: "Generate social posts, AI images and full code projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

type Tab = "content" | "image" | "code";

function Studio() {
  const [tab, setTab] = useState<Tab>("content");
  const tabs = [
    { id: "content" as const, label: "Content", icon: PenLine },
    { id: "image" as const, label: "Images", icon: ImageIcon },
    { id: "code" as const, label: "Code", icon: Code2 },
  ];
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          ContentFlow AI
        </Link>
        <nav className="flex gap-1 rounded-full glass p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${tab === t.id ? "bg-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24">
        {tab === "content" && <ContentStudio />}
        {tab === "image" && <ImageStudio />}
        {tab === "code" && <CodeStudio />}
      </main>
    </div>
  );
}

/* ---------- shared UI ---------- */
const field = "w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select className={field} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}
function PrimaryBtn({ loading, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...p} disabled={loading || p.disabled} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-medium text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {children}
    </button>
  );
}
function GhostBtn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 text-xs transition hover:border-primary hover:text-primary disabled:opacity-50">
      {children}
    </button>
  );
}
function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl glass p-5 ${className}`}>{children}</div>;
}
function copy(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied");
}
function download(name: string, content: string, type = "text/plain") {
  const a = document.createElement("a");
  a.href = content.startsWith("data:") ? content : URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
}
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

const SOCIALS: { name: string; url: (t: string) => string; paste?: boolean }[] = [
  { name: "X (Twitter)", url: (t) => `https://x.com/intent/post?text=${encodeURIComponent(t.slice(0, 280))}` },
  { name: "WhatsApp", url: (t) => `https://wa.me/?text=${encodeURIComponent(t)}` },
  { name: "Facebook", url: () => "https://www.facebook.com/", paste: true },
  { name: "Instagram", url: () => "https://www.instagram.com/", paste: true },
  { name: "Threads", url: (t) => `https://www.threads.net/intent/post?text=${encodeURIComponent(t)}` },
];

function ShareMenu({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const share = (s: (typeof SOCIALS)[number]) => {
    navigator.clipboard.writeText(text).catch(() => {});
    window.open(s.url(text), "_blank", "noopener");
    toast.success(s.paste ? `Copied — paste it into your ${s.name} post` : `Opening ${s.name}…`);
    setOpen(false);
  };
  return (
    <div className="relative">
      <GhostBtn onClick={() => setOpen((o) => !o)}><Share2 className="h-3.5 w-3.5" /> Share to socials</GhostBtn>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg glass p-1 shadow-glow">
          {SOCIALS.map((s) => (
            <button key={s.name} onClick={() => share(s)} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary">
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Content ---------- */
const TYPES = ["Instagram Post", "LinkedIn Post", "Blog Post", "Email", "Caption", "Advertisement", "Product Description", "Professional Announcement", "Educational Post", "Personal Learning Post", "Project Showcase", "AI/Technology Post", "Story", "Quote", "Short-form Content"];
const TONES = ["Professional", "Friendly", "Educational", "Inspirational", "Funny", "Creative", "Technical", "Casual", "Persuasive", "Conversational"];
const REFINE = ["Improve Writing", "Make More Professional", "Make More Casual", "Make Shorter", "Make Longer", "Add Hook", "Add CTA", "Generate Hashtags", "Remove Hashtags", "Fix Grammar", "Rewrite", "Simplify", "Make More Engaging"];
const LABELS = ["Professional", "Engaging", "Creative"];

function ContentStudio() {
  const gen = useServerFn(genContent);
  const refine = useServerFn(refineContent);
  const [f, setF] = useState({ type: "LinkedIn Post", tone: "Professional", audience: "", topic: "", extra: "" });
  const [versions, setVersions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState<string | null>(null);

  const run = async () => {
    if (!f.topic.trim()) { toast.error("Add a topic first"); return; }
    setLoading(true);
    try {
      const r = await gen({ data: f });
      setVersions(r.versions);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  };
  const post = useServerFn(postToLinkedIn);
  const [posting, setPosting] = useState(false);
  const doPost = async () => {
    if (!draft.trim()) return;
    if (!window.confirm("Publish this post publicly to your LinkedIn now?")) return;
    setPosting(true);
    try {
      const r = await post({ data: { text: draft } });
      toast.success("Posted to LinkedIn", { action: { label: "View", onClick: () => window.open(r.url, "_blank") } });
    } catch (e) { toast.error(errMsg(e)); } finally { setPosting(false); }
  };
  const doRefine = async (action: string) => {
    setRefining(action);
    try {
      const r = await refine({ data: { text: draft, action } });
      setDraft(r.text);
    } catch (e) { toast.error(errMsg(e)); } finally { setRefining(null); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Panel className="h-fit space-y-4">
        <Field label="Content type"><Select value={f.type} onChange={(type) => setF({ ...f, type })} options={TYPES} /></Field>
        <Field label="Tone"><Select value={f.tone} onChange={(tone) => setF({ ...f, tone })} options={TONES} /></Field>
        <Field label="Audience"><input className={field} placeholder="AI students and young developers" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} /></Field>
        <Field label="Topic"><textarea rows={3} className={field} placeholder="How I used AI to build my first content generator" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></Field>
        <Field label="Additional instructions"><textarea rows={2} className={field} placeholder="Keep it under 200 words" value={f.extra} onChange={(e) => setF({ ...f, extra: e.target.value })} /></Field>
        <PrimaryBtn loading={loading} onClick={run}>{versions.length ? "Regenerate" : "Generate Content"}</PrimaryBtn>
      </Panel>

      <div className="space-y-6">
        {draft && (
          <Panel className="gradient-border">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Your draft</h3>
              <div className="flex flex-wrap gap-2">
                <GhostBtn disabled={posting} onClick={doPost}>{posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Post to LinkedIn</GhostBtn>
                <ShareMenu text={draft} />
                <GhostBtn onClick={() => copy(draft)}><Copy className="h-3.5 w-3.5" /> Copy</GhostBtn>
                <GhostBtn onClick={() => download("post.txt", draft)}><Download className="h-3.5 w-3.5" /> Download</GhostBtn>
              </div>
            </div>
            <textarea className={`${field} min-h-[220px] leading-relaxed`} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <div className="mt-3 flex flex-wrap gap-2">
              {REFINE.map((a) => (
                <GhostBtn key={a} disabled={!!refining} onClick={() => doRefine(a)}>
                  {refining === a && <Loader2 className="h-3 w-3 animate-spin" />} {a}
                </GhostBtn>
              ))}
            </div>
          </Panel>
        )}

        {versions.length === 0 && !loading && (
          <Panel className="grid min-h-[300px] place-items-center text-center text-muted-foreground">
            <div><PenLine className="mx-auto mb-3 h-8 w-8 text-primary" />Fill in a topic and generate 3 versions to compare.</div>
          </Panel>
        )}
        {loading && <Panel className="grid min-h-[300px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Panel>}

        {!loading && versions.length > 0 && (
          <div className="grid gap-4 xl:grid-cols-3">
            {versions.map((v, i) => (
              <Panel key={i} className="lift flex flex-col">
                <span className="font-mono text-xs uppercase text-primary">Version {i + 1} · {LABELS[i]}</span>
                <p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-relaxed">{v}</p>
                <div className="mt-4 flex gap-2">
                  <GhostBtn onClick={() => { setDraft(v); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Check className="h-3.5 w-3.5" /> Use This Version</GhostBtn>
                  <GhostBtn onClick={() => copy(v)}><Copy className="h-3.5 w-3.5" /></GhostBtn>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Image ---------- */
const STYLES = ["Photorealistic", "Cinematic", "3D", "Cartoon", "Anime", "Illustration", "Digital Art", "Minimalist", "Cyberpunk", "Futuristic", "Corporate", "Abstract"];
const RATIOS: Record<string, string> = {
  "Square 1:1 — Instagram": "1024x1024",
  "Portrait 2:3 — Instagram": "1024x1536",
  "Landscape 3:2 — LinkedIn": "1536x1024",
};
const EXAMPLES = [
  "A flying orange cat wearing futuristic goggles above a futuristic city",
  "A colourful tropical fish diving through an underwater cyberpunk city",
  "A cinematic African sunset over a futuristic city",
];

function ImageStudio() {
  const gen = useServerFn(genImage);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Cinematic");
  const [ratio, setRatio] = useState<string>("Square 1:1 — Instagram");
  const [images, setImages] = useState<{ src: string; prompt: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async (p = prompt) => {
    if (!p.trim()) { toast.error("Describe your image first"); return; }
    setLoading(true);
    try {
      const r = await gen({ data: { prompt: p, style, size: RATIOS[ratio] ?? "1024x1024" } });
      setImages((xs) => [{ src: r.src, prompt: p }, ...xs]);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  };
  const current = images[0];
  const postImg = useServerFn(postLinkedInImage);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const doPost = async () => {
    if (!current) return;
    if (!window.confirm("Publish this image publicly to your LinkedIn now?")) return;
    setPosting(true);
    try {
      const r = await postImg({ data: { image: current.src, text: caption.trim() || current.prompt } });
      toast.success("Posted to LinkedIn", { action: { label: "View", onClick: () => window.open(r.url, "_blank") } });
    } catch (e) { toast.error(errMsg(e)); } finally { setPosting(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Panel className="h-fit space-y-4">
        <Field label="Describe your image"><textarea rows={4} className={field} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={EXAMPLES[0]} /></Field>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((x) => <GhostBtn key={x} onClick={() => setPrompt(x)}>{x.slice(0, 28)}…</GhostBtn>)}
        </div>
        <Field label="Style"><Select value={style} onChange={setStyle} options={STYLES} /></Field>
        <Field label="Aspect ratio"><Select value={ratio} onChange={setRatio} options={Object.keys(RATIOS)} /></Field>
        <PrimaryBtn loading={loading} onClick={() => run()}>Generate Image</PrimaryBtn>
      </Panel>

      <div className="space-y-4">
        <Panel className="grid min-h-[420px] place-items-center">
          {loading ? (
            <div className="text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />Painting your image… this can take up to a minute.</div>
          ) : current ? (
            <div className="w-full">
              <img src={current.src} alt={current.prompt} className="mx-auto max-h-[560px] rounded-xl" />
              <div className="mt-4 space-y-3">
                <input className={field} placeholder="Caption (used when posting — leave empty to use your prompt)" value={caption} onChange={(e) => setCaption(e.target.value)} />
                <div className="flex flex-wrap justify-center gap-2">
                  <GhostBtn disabled={posting} onClick={doPost}>{posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Post to LinkedIn</GhostBtn>
                  <ImageShareMenu src={current.src} text={caption.trim() || current.prompt} />
                  <GhostBtn onClick={() => run(current.prompt)}><RefreshCw className="h-3.5 w-3.5" /> Regenerate</GhostBtn>
                  <GhostBtn onClick={() => run(current.prompt + ", alternative variation")}><Sparkles className="h-3.5 w-3.5" /> Create Variation</GhostBtn>
                  <GhostBtn onClick={() => setPrompt(current.prompt)}><PenLine className="h-3.5 w-3.5" /> Edit Prompt</GhostBtn>
                  <GhostBtn onClick={() => download("contentflow-image.png", current.src)}><Download className="h-3.5 w-3.5" /> Download</GhostBtn>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground"><ImageIcon className="mx-auto mb-3 h-8 w-8 text-primary" />Your image will appear here.</div>
          )}
        </Panel>
        {images.length > 1 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {images.slice(1).map((im, i) => (
              <button key={i} onClick={() => setImages((xs) => [im, ...xs.filter((x) => x !== im)])}>
                <img src={im.src} alt={im.prompt} className="aspect-square w-full rounded-lg object-cover lift" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Code ---------- */
const LANGS = ["Python", "JavaScript", "TypeScript", "React", "Node.js", "HTML/CSS", "Java", "Go"];
const ACTIONS = ["Explain Code", "Improve Code", "Find Bugs", "Generate Tests", "Refactor", "Generate README"];

function CodeStudio() {
  const gen = useServerFn(genCode);
  const act = useServerFn(codeAction);
  const [prompt, setPrompt] = useState("");
  const [lang, setLang] = useState("Python");
  const [out, setOut] = useState("");
  const [extra, setExtra] = useState<{ title: string; text: string } | null>(null);
  const [feature, setFeature] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const run = async () => {
    if (!prompt.trim()) { toast.error("Describe what to build"); return; }
    setLoading("gen"); setExtra(null);
    try { setOut((await gen({ data: { prompt, language: lang } })).text); }
    catch (e) { toast.error(errMsg(e)); } finally { setLoading(null); }
  };
  const doAction = async (action: string) => {
    setLoading(action);
    try {
      const r = await act({ data: { code: out, action } });
      if (action.startsWith("Add Feature")) { setOut(r.text); setExtra(null); }
      else setExtra({ title: action, text: r.text });
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(null); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Panel className="h-fit space-y-4">
        <Field label="What do you want to build?"><textarea rows={4} className={field} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Create a Python web scraper" /></Field>
        <Field label="Language / stack"><Select value={lang} onChange={setLang} options={LANGS} /></Field>
        <PrimaryBtn loading={loading === "gen"} onClick={run}>Generate Project</PrimaryBtn>
        {out && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap gap-2">
              {ACTIONS.map((a) => <GhostBtn key={a} disabled={!!loading} onClick={() => doAction(a)}>{loading === a && <Loader2 className="h-3 w-3 animate-spin" />}{a}</GhostBtn>)}
            </div>
            <div className="flex gap-2">
              <input className={field} placeholder="Add a feature…" value={feature} onChange={(e) => setFeature(e.target.value)} />
              <GhostBtn disabled={!feature || !!loading} onClick={() => doAction(`Add Feature: ${feature}. Return the full updated project in the same section format.`)}>Add</GhostBtn>
            </div>
            <GhostBtn onClick={() => download("project.md", out, "text/markdown")}><Download className="h-3.5 w-3.5" /> Download Project</GhostBtn>
          </div>
        )}
      </Panel>

      <div className="space-y-6">
        {loading === "gen" && <Panel className="grid min-h-[300px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Panel>}
        {!out && !loading && <Panel className="grid min-h-[300px] place-items-center text-center text-muted-foreground"><div><Code2 className="mx-auto mb-3 h-8 w-8 text-primary" />Describe a project to get code, file structure, README and more.</div></Panel>}
        {extra && <Panel className="gradient-border"><h3 className="mb-3 font-semibold text-primary">{extra.title}</h3><Markdown text={extra.text} /></Panel>}
        {out && loading !== "gen" && <Panel><Markdown text={out} /></Panel>}
      </div>
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  const parts = text.split(/```(\w*)\n([\s\S]*?)```/g);
  const nodes: ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    const prose = parts[i];
    if (prose?.trim()) {
      nodes.push(
        <div key={`p${i}`} className="space-y-2 text-sm leading-relaxed">
          {prose.trim().split("\n").map((l, j) =>
            l.startsWith("#") ? <h3 key={j} className="pt-3 text-lg font-semibold">{l.replace(/^#+\s*/, "")}</h3>
            : <p key={j} className="text-muted-foreground">{l.replace(/\*\*/g, "")}</p>)}
        </div>,
      );
    }
    if (parts[i + 2] !== undefined) nodes.push(<CodeBlock key={`c${i}`} lang={parts[i + 1] ?? ""} code={parts[i + 2] ?? ""} />);
  }
  return <div className="space-y-4">{nodes}</div>;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const lines = code.replace(/\n$/, "").split("\n");
  const ext: Record<string, string> = { python: "py", javascript: "js", typescript: "ts", tsx: "tsx", jsx: "jsx", html: "html", css: "css", json: "json", markdown: "md", bash: "sh", go: "go", java: "java" };
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background/80">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{lang || "text"}</span>
        <div className="flex gap-1.5">
          <GhostBtn onClick={() => copy(code)}><Copy className="h-3 w-3" /></GhostBtn>
          <GhostBtn onClick={() => download(`file.${ext[lang] ?? "txt"}`, code)}><Download className="h-3 w-3" /></GhostBtn>
        </div>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-5">
        {lines.map((l, i) => (
          <div key={i} className="flex">
            <span className="mr-4 w-8 shrink-0 select-none text-right text-muted-foreground/50">{i + 1}</span>
            <span className="whitespace-pre text-foreground">{l || " "}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
