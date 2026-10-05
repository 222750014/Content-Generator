import { createFileRoute, Link } from "@tanstack/react-router";
import { PenLine, ImageIcon, Code2, Send, Github, Repeat, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ContentFlow AI — Create Anything With AI" },
      { name: "description", content: "Generate posts, create images and build code from one intelligent AI workspace." },
      { property: "og:title", content: "ContentFlow AI — Create Anything With AI" },
      { property: "og:description", content: "Generate posts, create images and build code from one intelligent AI workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: PenLine, title: "Generate Content", body: "Create professional social-media posts, blogs, emails and more." },
  { icon: ImageIcon, title: "Generate Images", body: "Turn ideas like “a flying cat” or “a diving fish” into AI artwork." },
  { icon: Code2, title: "Generate Code", body: "Build Python, JavaScript, React and other projects with AI." },
  { icon: Send, title: "Publish", body: "Prepare approved content for your social platforms." },
  { icon: Github, title: "GitHub", body: "Turn generated code into organised, downloadable projects." },
  { icon: Repeat, title: "Automate", body: "Refine and repurpose content from one workspace." },
];

function Index() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          ContentFlow AI
        </div>
        <Link to="/studio" className="rounded-full glass px-4 py-2 text-sm hover:border-primary">
          Open Studio
        </Link>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-20 pb-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 font-mono text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Text · Images · Code
        </span>
        <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-7xl">
          Create Anything <span className="text-gradient">With AI.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Generate posts, create images, build code, optimise prompts and manage your digital content from one intelligent workspace.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/studio" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-medium text-primary-foreground shadow-glow transition hover:opacity-90">
            Start Creating <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#features" className="rounded-full glass px-6 py-3 font-medium hover:border-primary">
            Explore Features
          </a>
        </div>
      </section>

      <section id="features" className="mx-auto grid max-w-6xl gap-4 px-6 pb-32 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="lift rounded-2xl gradient-border p-6">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center font-mono text-xs text-muted-foreground">
        ContentFlow AI — AI for Content Creation & Automation
      </footer>
    </div>
  );
}
