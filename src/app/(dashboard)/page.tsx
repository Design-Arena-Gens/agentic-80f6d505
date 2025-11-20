"use client";

import { useEffect, useMemo, useState } from "react";

type BrandConfig = {
  brandColor: string;
  accentColor: string;
  tone: "educational" | "hype" | "mysterious" | "playful" | "analytical";
  videoStyle: "glitch" | "holographic" | "cyberpunk" | "minimal-future" | "neon";
  voiceProfile: "openai_alloy" | "openai_nova" | "openai_orion";
  channelName: string;
  tagline: string;
  hashtags: string[];
  keywords: string[];
};

type RunResult = {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: "success" | "failed";
  topic?: {
    title: string;
    summary: string;
    angle: string;
  };
  script?: {
    hook: string;
    body: string;
    outro: string;
    estimatedDurationSeconds: number;
  };
  videoPath?: string;
  thumbnail?: { path: string };
  upload?:
    | {
        title: string;
        description: string;
        hashtags: string[];
        keywords: string[];
        scheduledAt: string;
        watchUrl?: string;
      }
    | null;
  error?: string;
};

type HistoryResponse = {
  latest: RunResult | null;
  history: RunResult[];
};

type Stage = "idle" | "saving" | "running" | "success" | "error";

const toneOptions: BrandConfig["tone"][] = ["educational", "hype", "mysterious", "playful", "analytical"];
const styleOptions: BrandConfig["videoStyle"][] = ["glitch", "holographic", "cyberpunk", "minimal-future", "neon"];
const voiceOptions: BrandConfig["voiceProfile"][] = ["openai_alloy", "openai_nova", "openai_orion"];

export default function Dashboard() {
  const [config, setConfig] = useState<BrandConfig | null>(null);
  const [history, setHistory] = useState<RunResult[]>([]);
  const [latest, setLatest] = useState<RunResult | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const [configRes, historyRes] = await Promise.all([
        fetch("/api/config").then((response) => response.json()),
        fetch("/api/history").then((response) => response.json() as Promise<HistoryResponse>),
      ]);
      setConfig(configRes.config ?? null);
      setLatest(historyRes.latest ?? null);
      setHistory(historyRes.history ?? []);
    };
    bootstrap();
  }, []);

  const hasConfig = useMemo(() => !!config, [config]);

  const updateConfigField = (field: keyof BrandConfig, value: string) => {
    if (!config) {
      setConfig({
        brandColor: "#12F7FF",
        accentColor: "#FF2E63",
        tone: "hype",
        videoStyle: "cyberpunk",
        voiceProfile: "openai_alloy",
        channelName: "FutureFlash AI",
        tagline: "Daily neural jolts about tomorrow.",
        hashtags: ["#AIShorts"],
        keywords: ["AI"],
        [field]: value,
      } as BrandConfig);
      return;
    }
    setConfig({ ...config, [field]: value } as BrandConfig);
  };

  const updateListField = (field: "hashtags" | "keywords", raw: string) => {
    const items = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!config) return;
    setConfig({ ...config, [field]: items });
  };

  const saveConfig = async () => {
    if (!config) return;
    setStage("saving");
    setError(null);
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save brand profile.");
      }
      setConfig(payload.config);
      setStage("success");
      setTimeout(() => setStage("idle"), 2000);
    } catch (err) {
      setStage("error");
      setError((err as Error).message);
    }
  };

  const triggerRun = async () => {
    setStage("running");
    setError(null);
    try {
      const response = await fetch("/api/run", { method: "POST" });
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error ?? "Run failed");
      }
      setLatest(payload.result);
      setHistory((current) => [payload.result, ...current].slice(0, 20));
      setStage("success");
      setTimeout(() => setStage("idle"), 4000);
    } catch (err) {
      setStage("error");
      setError((err as Error).message);
    }
  };

  const statusChip = stage === "running" ? "animate-pulse bg-amber-500 text-black" : "bg-slate-900 text-slate-100";

  return (
    <main className="min-h-screen bg-black text-slate-100 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-black to-slate-950 p-8 shadow-[0_0_40px_rgba(18,247,255,0.08)]">
          <div className="flex flex-col gap-2">
            <span className="text-sm uppercase tracking-[0.3em] text-slate-400">Agent Control</span>
            <h1 className="text-4xl font-semibold text-white md:text-5xl">NeoChronicle Media Engine</h1>
          </div>
          <p className="max-w-2xl text-slate-300">
            Fully autonomous daily pipeline for AI shorts: trending research, viral scripting, synthetic voiceover,
            glitch visuals, render, thumbnail, and direct YouTube push. Configure your brand once—then let the agent
            keep posting.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium tracking-wider">
            <span className={`rounded-full px-3 py-1 ${statusChip}`}>
              {stage === "running" ? "RUNNING" : stage === "saving" ? "SAVING" : stage === "error" ? "ERROR" : "IDLE"}
            </span>
            {stage === "error" && error ? <span className="text-rose-400">{error}</span> : null}
            {!hasConfig ? (
              <span className="rounded-full border border-amber-500/50 px-3 py-1 text-amber-400">
                Provide brand color, tone & style once to deploy autonomy
              </span>
            ) : null}
          </div>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.6fr,1fr]">
          <div className="space-y-8 rounded-3xl border border-slate-900 bg-slate-950/60 p-8 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Brand DNA (one-time setup)</h2>
              <button
                className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                onClick={saveConfig}
                disabled={!config || stage === "saving"}
              >
                Save profile
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Brand Color</span>
                <input
                  type="color"
                  value={config?.brandColor ?? "#12F7FF"}
                  onChange={(event) => updateConfigField("brandColor", event.target.value)}
                  className="h-12 w-full cursor-pointer rounded-xl border border-slate-800 bg-slate-900"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Accent Color</span>
                <input
                  type="color"
                  value={config?.accentColor ?? "#FF2E63"}
                  onChange={(event) => updateConfigField("accentColor", event.target.value)}
                  className="h-12 w-full cursor-pointer rounded-xl border border-slate-800 bg-slate-900"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Tone</span>
                <select
                  value={config?.tone ?? "hype"}
                  onChange={(event) => updateConfigField("tone", event.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100"
                >
                  {toneOptions.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Video Style</span>
                <select
                  value={config?.videoStyle ?? "cyberpunk"}
                  onChange={(event) => updateConfigField("videoStyle", event.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100"
                >
                  {styleOptions.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Voice Profile</span>
                <select
                  value={config?.voiceProfile ?? "openai_alloy"}
                  onChange={(event) => updateConfigField("voiceProfile", event.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100"
                >
                  {voiceOptions.map((voice) => (
                    <option key={voice} value={voice}>
                      {voice}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Channel Name</span>
                <input
                  type="text"
                  value={config?.channelName ?? ""}
                  onChange={(event) => updateConfigField("channelName", event.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100"
                  placeholder="Neural Nexus"
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Tagline</span>
                <input
                  type="text"
                  value={config?.tagline ?? ""}
                  onChange={(event) => updateConfigField("tagline", event.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100"
                  placeholder="Daily jolts from the edge of tomorrow."
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Hashtags (comma separated)</span>
                <input
                  type="text"
                  value={(config?.hashtags ?? []).join(", ")}
                  onChange={(event) => updateListField("hashtags", event.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Keywords (comma separated)</span>
                <input
                  type="text"
                  value={(config?.keywords ?? []).join(", ")}
                  onChange={(event) => updateListField("keywords", event.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100"
                />
              </label>
            </div>
          </div>

          <aside className="flex flex-col justify-between gap-8 rounded-3xl border border-slate-900 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Mission Status</h2>
              <p className="text-sm text-slate-300">
                Once the brand profile is saved, the agent runs autonomously each day via scheduled call or manual
                trigger. It researches AI breakthroughs, writes a <span className="text-cyan-300">15s short</span>, builds
                audio & visuals, renders the edit, creates the thumbnail, and uploads with SEO metadata.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={triggerRun}
                className="rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black transition hover:opacity-90 disabled:opacity-50"
                disabled={!hasConfig || stage === "running"}
              >
                {stage === "running" ? "Running..." : "Run Agent Now"}
              </button>
              <div className="rounded-2xl border border-slate-800 bg-black/40 p-4 text-xs text-slate-300">
                <p className="font-semibold text-slate-200">Automation Hooks</p>
                <ol className="mt-2 space-y-1 list-decimal pl-4">
                  <li>Deploy to Vercel.</li>
                  <li>Add a Vercel Cron for POST /api/run every day.</li>
                  <li>Provide env vars for OpenAI, News API, Pexels, and YouTube.</li>
                </ol>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.8fr,1fr]">
          <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Latest Production</h2>
              {latest ? (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    latest.status === "success" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {latest.status.toUpperCase()}
                </span>
              ) : null}
            </div>

            {!latest ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-800 p-6 text-sm text-slate-400">
                No runs yet. Configure your brand DNA and launch the first short.
              </div>
            ) : (
              <dl className="mt-6 grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <dt className="text-xs uppercase tracking-widest text-slate-500">Topic</dt>
                  <dd className="text-base font-medium text-slate-100">{latest.topic?.title}</dd>
                  <p className="text-sm text-slate-400">{latest.topic?.summary}</p>
                </div>
                <div className="space-y-2">
                  <dt className="text-xs uppercase tracking-widest text-slate-500">Hook</dt>
                  <dd className="text-base font-medium text-cyan-300">{latest.script?.hook}</dd>
                  <p className="text-sm text-slate-400">{latest.script?.body}</p>
                </div>
                <div className="space-y-2">
                  <dt className="text-xs uppercase tracking-widest text-slate-500">Duration</dt>
                  <dd className="text-base font-medium text-slate-100">
                    ≈ {latest.script?.estimatedDurationSeconds ?? 0}s
                  </dd>
                </div>
                <div className="space-y-2">
                  <dt className="text-xs uppercase tracking-widest text-slate-500">YouTube</dt>
                  <dd className="text-base font-medium">
                    {latest.upload?.watchUrl ? (
                      <a
                        href={latest.upload.watchUrl}
                        className="text-cyan-300 hover:text-cyan-200"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Short ↗
                      </a>
                    ) : (
                      <span className="text-slate-400">Awaiting credentials</span>
                    )}
                  </dd>
                </div>
                {latest.error ? (
                  <div className="sm:col-span-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
                    {latest.error}
                  </div>
                ) : null}
              </dl>
            )}
          </div>

          <div className="rounded-3xl border border-slate-900 bg-slate-950/60 p-8">
            <h2 className="text-xl font-semibold text-white">Pipeline Log</h2>
            <ul className="mt-4 space-y-4 text-sm text-slate-300">
              {history.slice(0, 5).map((run) => (
                <li key={run.id} className="rounded-2xl border border-slate-800 bg-black/40 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-500">
                    <span>{new Date(run.startedAt).toLocaleString()}</span>
                    <span className={run.status === "success" ? "text-emerald-300" : "text-rose-300"}>
                      {run.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-slate-100">{run.topic?.title ?? "Topic unavailable"}</p>
                  {run.error ? <p className="mt-2 text-xs text-rose-300">{run.error}</p> : null}
                </li>
              ))}
              {history.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-slate-800 bg-black/20 p-4 text-center text-xs uppercase tracking-widest text-slate-500">
                  Pipeline history empty.
                </li>
              ) : null}
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-900 bg-slate-950/60 p-8">
          <h2 className="text-xl font-semibold text-white">Environment Variables Checklist</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["OPENAI_API_KEY", "Used for scriptwriting + TTS voiceover"],
              ["NEWS_API_KEY", "Optional: trending topic scraping (fallback built-in)"],
              ["PEXELS_API_KEY", "Optional: vertical stock b-roll (fallback generates visuals)"],
              ["YOUTUBE_CLIENT_ID", "OAuth client ID for channel upload"],
              ["YOUTUBE_CLIENT_SECRET", "OAuth client secret"],
              ["YOUTUBE_REFRESH_TOKEN", "Refresh token for unattended uploads"],
            ].map(([key, description]) => (
              <div key={key} className="rounded-2xl border border-slate-800 bg-black/40 p-4">
                <p className="text-sm font-semibold text-cyan-300">{key}</p>
                <p className="mt-1 text-xs text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
