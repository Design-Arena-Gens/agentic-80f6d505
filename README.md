<div align="center">

# 🤖 NeoChronicle Media Engine

Autonomous factory that researches, writes, designs, and publishes daily AI shorts to YouTube without human intervention.

</div>

## ✨ What the agent does

- **Trend scan** – pulls emerging stories across AGI, robotics, quantum, and future tech.
- **Viral scriptwriting** – crafts sub-15s hooks with punchy pacing and stage direction markup.
- **Synthetic voiceover** – renders energetic audio via OpenAI TTS with on-brand voice profiles.
- **Visual fabrication** – assembles portrait b-roll from Pexels (or procedural glitch loops if offline).
- **Video finishing** – burns captions, glitch layers, color treatment, sci-fi SFX bed, and exports 9:16 mp4.
- **Thumbnail forge** – grabs a hero frame and composites attention-driving copy.
- **Auto-upload** – publishes to YouTube Shorts with SEO title, description, hashtags, and scheduled release.
- **Daily cadence** – expose `POST /api/run` to Vercel Cron or run `npm run agent:run`.

## 🧰 Tech stack

- Next.js 16 (App Router) + Tailwind CSS v4
- Server-side pipeline orchestrated in TypeScript
- OpenAI GPT-4o mini (script + TTS)
- NewsAPI + fallback trend set, optional Pexels API
- ffmpeg CLI for video compositing & thumbnail art
- Native OAuth calls to the YouTube Data API

## 🚀 Getting started

```bash
npm install
npm run dev
# open http://localhost:3000
```

1. On first load, provide **brand color**, **tone**, and **video style** (only asked once).
2. Populate the environment variables below.
3. Trigger a manual build from the dashboard or run `npm run agent:run`.

### Required environment

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Script + speech synthesis |
| `OPENAI_MODEL` (optional) | Defaults to `gpt-4o-mini` |
| `OPENAI_VOICE_MODEL` (optional) | Defaults to `gpt-4o-mini-tts` |
| `NEWS_API_KEY` (optional) | Trend discovery (fallback bundled) |
| `PEXELS_API_KEY` (optional) | Tech-themed b-roll |
| `YOUTUBE_CLIENT_ID` | OAuth client id |
| `YOUTUBE_CLIENT_SECRET` | OAuth secret |
| `YOUTUBE_REFRESH_TOKEN` | Refresh token with `youtube.upload` scope |
| `FFMPEG_PATH` (optional) | Custom ffmpeg binary location |
| `THUMBNAIL_FONT_FILE` (optional) | Path to a .ttf/.otf font for thumbnails |

Create a `.env.local` with the values before running locally or deploying.

### Helpful scripts

- `npm run dev` – dashboard for manual control and monitoring
- `npm run build && npm start` – production bundle
- `npm run agent:run` – execute the entire pipeline headlessly (uses ts-node)

## 🗂️ Key directories

```
data/
  config.json       // brand profile (asked once)
  runs/             // run logs, assets, metadata
src/lib/services/   // topic research, scripting, audio, visuals, uploaders
src/app/api/        // HTTP triggers and history
scripts/run-agent.ts// CLI entrypoint for cron
```

## ☁️ Deployment (Vercel)

1. `npm run build` locally to verify.
2. `vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-80f6d505`
3. After deploy: `curl https://agentic-80f6d505.vercel.app`
4. Add a Vercel Cron job → `POST https://agentic-80f6d505.vercel.app/api/run` daily.

## 🔮 Roadmap ideas

- Multi-clip storyboarding with beat-synchronous editing
- Distributed trend scouting across Reddit/Twitter/TikTok APIs
- Multi-voice ensembles & dynamic voice switching
- Automatic shorts cross-posting (TikTok/Instagram Reels)

---

Enjoy the automation—share what tomorrow looks like ✨
