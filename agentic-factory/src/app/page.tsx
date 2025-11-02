"use client";

import { useMemo, useState } from "react";

type LogEntry = {
  id: string;
  level: "info" | "success" | "error";
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
};

const DEFAULT_PROMPT =
  "An energetic golden retriever puppy sprinting through a sunlit dog park, bounding over obstacles and chasing a bright red frisbee in cinematic slow motion.";
const DEFAULT_DESCRIPTION =
  "Watch this adorable pup tear up the dog park! Like, share, and subscribe for more tail-wagging shorts. 🐶✨";

const ASPECT_RATIOS = [
  { label: "Vertical 9:16", value: "9:16" },
  { label: "Widescreen 16:9", value: "16:9" },
  { label: "Square 1:1", value: "1:1" },
];

const VISIBILITY_OPTIONS = [
  { label: "Public", value: "public" },
  { label: "Unlisted", value: "unlisted" },
  { label: "Private", value: "private" },
];

const createLogId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
};

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [uploadToYoutube, setUploadToYoutube] = useState(true);
  const [keepLocalFile, setKeepLocalFile] = useState(false);
  const [visibility, setVisibility] = useState("unlisted");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [durationSeconds, setDurationSeconds] = useState(15);
  const [batchCount, setBatchCount] = useState(1);

  const hasMockWarning = useMemo(
    () =>
      logs.some(
        (log) =>
          log.level === "info" &&
          log.message.toLowerCase().includes("mock mode"),
      ),
    [logs],
  );

  const addLog = (entry: Omit<LogEntry, "id" | "timestamp">) => {
    setLogs((prev) => [
      {
        id: createLogId(),
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...prev,
    ]);
  };

  const resetLogs = () => setLogs([]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    resetLogs();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const prompt = String(formData.get("prompt") ?? DEFAULT_PROMPT);
    const titleTemplate = String(formData.get("title") ?? "Dog Park Dash");
    const description = String(
      formData.get("description") ?? DEFAULT_DESCRIPTION,
    );
    const hashtagsRaw = String(formData.get("hashtags") ?? "");
    const stylePreset = String(formData.get("stylePreset") ?? "");
    const negativePrompt = String(formData.get("negativePrompt") ?? "");
    const publishAtRaw = String(formData.get("publishAt") ?? "");

    const tags = hashtagsRaw
      .split(/[,\s]+/)
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean);

    const safeDuration = Math.min(Math.max(Number(durationSeconds), 3), 120);
    const safeBatchCount = Math.min(Math.max(Number(batchCount), 1), 10);

    try {
      for (let index = 0; index < safeBatchCount; index += 1) {
        const label =
          safeBatchCount > 1 ? `Batch ${index + 1}/${safeBatchCount}` : "Run";

        addLog({
          level: "info",
          message: `${label}: Dispatching Veo generation job…`,
        });

        const payload = {
          prompt,
          aspectRatio,
          durationSeconds: safeDuration,
          negativePrompt: negativePrompt || undefined,
          stylePreset: stylePreset || undefined,
          title:
            safeBatchCount > 1
              ? `${titleTemplate.trim()} #${index + 1}`
              : titleTemplate.trim(),
          description,
          tags,
          visibility,
          publishAt: publishAtRaw || undefined,
          uploadToYoutube,
          keepLocalFile,
        };

        const response = await fetch("/api/pipeline", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          const errorMessage =
            data?.error ??
            `Pipeline failed with status ${response.status}. Check server logs for details.`;
          addLog({
            level: "error",
            message: `${label}: ${errorMessage}`,
            context: data?.details,
          });
          continue;
        }

        addLog({
          level: "success",
          message: `${label}: Video generation completed (job ${data.result.video.jobId}).`,
        });

        if (
          data.result.video.metadata?.mock &&
          uploadToYoutube &&
          data.result.youtube?.status === "skipped"
        ) {
          addLog({
            level: "info",
            message:
              "Pipeline is running in mock mode. Provide VEO credentials to enable real video output and YouTube uploads.",
          });
        }

        if (data.result.youtube) {
          const youtubeResult = data.result.youtube;
          if (youtubeResult.status === "uploaded") {
            addLog({
              level: "success",
              message: `${label}: Uploaded to YouTube (visibility: ${youtubeResult.visibility})`,
              context: {
                videoId: youtubeResult.videoId,
              },
            });
          } else {
            addLog({
              level: "info",
              message: `${label}: YouTube upload skipped: ${youtubeResult.reason}`,
            });
          }
        }
      }
    } catch (error) {
      addLog({
        level: "error",
        message:
          error instanceof Error ? error.message : "Unexpected pipeline error.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 md:px-12">
        <header className="flex flex-col gap-3 text-left">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-300 shadow">
            Dog-First AI Content Factory
          </span>
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
            Generate Veo-powered dog shorts and launch them on YouTube in one
            click.
          </h1>
          <p className="max-w-3xl text-sm text-slate-300 md:text-base">
            Configure your prompt, run batch generations, and optionally push
            each finished short straight to your channel. Supply your Veo and
            YouTube credentials in environment variables to unlock the full
            pipeline.
          </p>
        </header>

        <main className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur">
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    Core Prompt
                  </span>
                  <textarea
                    name="prompt"
                    defaultValue={DEFAULT_PROMPT}
                    rows={5}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/20 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    Negative Prompt (optional)
                  </span>
                  <textarea
                    name="negativePrompt"
                    placeholder="Fast cuts, camera shake, blurred footage…"
                    rows={5}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/20 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    Title Template
                  </span>
                  <input
                    name="title"
                    defaultValue="Ultimate Dog Park Dash"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/20 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  />
                  <span className="text-xs text-slate-400">
                    Batch runs append #1, #2, etc. Use placeholders like
                    “Ultimate Fetch Wars”.
                  </span>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    Hashtags
                  </span>
                  <input
                    name="hashtags"
                    defaultValue="#dogshorts #dogsoftiktok #doglover"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/20 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  />
                  <span className="text-xs text-slate-400">
                    Comma or space separated. We will strip the # for YouTube.
                  </span>
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">
                  Video Description
                </span>
                <textarea
                  name="description"
                  defaultValue={DEFAULT_DESCRIPTION}
                  rows={4}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/20 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    Aspect Ratio
                  </span>
                  <select
                    name="aspectRatio"
                    value={aspectRatio}
                    onChange={(event) => setAspectRatio(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/20 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  >
                    {ASPECT_RATIOS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    Duration (seconds)
                  </span>
                  <input
                    name="durationSeconds"
                    type="number"
                    min={3}
                    max={120}
                    value={durationSeconds}
                    onChange={(event) =>
                      setDurationSeconds(Number(event.target.value))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/20 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    Batch Size
                  </span>
                  <input
                    name="batchCount"
                    type="number"
                    min={1}
                    max={10}
                    value={batchCount}
                    onChange={(event) =>
                      setBatchCount(Number(event.target.value))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/20 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  />
                  <span className="text-xs text-slate-400">
                    Each run will sequentially generate and optionally upload.
                  </span>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    Style Preset (optional)
                  </span>
                  <input
                    name="stylePreset"
                    placeholder="cinematic, documentary, anime…"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/20 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  />
                  <span className="text-xs text-slate-400">
                    Fed directly into Veo&apos;s style controls.
                  </span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    Scheduled Publish (optional)
                  </span>
                  <input
                    name="publishAt"
                    type="datetime-local"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/20 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  />
                  <span className="text-xs text-slate-400">
                    Must be in ISO timezone-aware format. Leave empty to publish
                    immediately.
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                      checked={uploadToYoutube}
                      onChange={(event) =>
                        setUploadToYoutube(event.target.checked)
                      }
                    />
                    Upload to YouTube
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                      checked={keepLocalFile}
                      onChange={(event) =>
                        setKeepLocalFile(event.target.checked)
                      }
                    />
                    Keep local file after pipeline run
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  {VISIBILITY_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setVisibility(item.value)}
                      className={`rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                        visibility === item.value
                          ? "border-blue-500 bg-blue-500/20 text-blue-300"
                          : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-slate-400">
                  Provide valid YouTube OAuth credentials via environment
                  variables to activate uploads. Visibility defaults to{" "}
                  <span className="font-semibold text-slate-200">
                    {visibility}
                  </span>
                  .
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-blue-600/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Running pipeline…" : "Generate & Launch"}
              </button>
            </form>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-5 shadow-2xl shadow-slate-950/50 backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-100">
                Pipeline Activity
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Newest events appear first. Inspect the server logs on Vercel if
                a run fails unexpectedly.
              </p>
              <div className="mt-4 flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 px-4 py-10 text-center text-sm text-slate-500">
                    Pipeline logs arrive here once you trigger a generation.
                  </div>
                ) : (
                  logs.map((log) => (
                    <article
                      key={log.id}
                      className={`rounded-2xl border px-4 py-3 text-sm shadow ${
                        log.level === "error"
                          ? "border-red-500/60 bg-red-500/10 text-red-200"
                          : log.level === "success"
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                          : "border-slate-700 bg-slate-950 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">
                          {log.message}
                        </span>
                        <time
                          dateTime={log.timestamp}
                          className="text-xs text-slate-400"
                        >
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </time>
                      </div>
                      {log.context && (
                        <pre className="mt-2 max-h-32 overflow-auto rounded-xl bg-black/40 p-2 text-xs text-slate-300">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-5 shadow-2xl shadow-slate-950/50 backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-100">
                Quick Integration Checklist
              </h2>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">
                <li>
                  Add your Veo API key to <code className="text-blue-300">VEO_API_KEY</code>.
                </li>
                <li>
                  Populate YouTube OAuth secrets (<code className="text-blue-300">YOUTUBE_CLIENT_ID</code>,{" "}
                  <code className="text-blue-300">YOUTUBE_CLIENT_SECRET</code>,
                  <code className="text-blue-300">YOUTUBE_REFRESH_TOKEN</code>).
                </li>
                <li>Deploy to Vercel and set the same env vars in the project settings.</li>
                <li>Monitor the logs to confirm upload success and gather video IDs.</li>
              </ul>
              {hasMockWarning && (
                <p className="mt-4 rounded-2xl border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Mock mode detected: provide live credentials to switch to full generations.
                </p>
              )}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
