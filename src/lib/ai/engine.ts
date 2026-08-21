// Fully local, in-browser LLM — no API key, no server, no paid service.
// Runs via transformers.js (ONNX + WASM), model files are fetched once
// from the Hugging Face CDN and cached by the browser afterwards.
//
// transformers.js itself is dynamically imported (not a static top-level
// import) so its runtime code only downloads when someone actually opens
// the AI assistant, instead of bloating every page's initial bundle.
const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ModelProgress = { status: string; file?: string; progress?: number; loaded?: number; total?: number };

let generatorPromise: Promise<any> | null = null;

export const isModelReady = () => generatorPromise !== null;

export const loadModel = (onProgress?: (p: ModelProgress) => void): Promise<any> => {
  if (!generatorPromise) {
    generatorPromise = import("@huggingface/transformers").then(({ pipeline }) =>
      pipeline("text-generation", MODEL_ID, {
        dtype: "q4",
        progress_callback: onProgress as any,
      }),
    );
  }
  return generatorPromise;
};

export const chat = async (
  messages: ChatMessage[],
  opts: { maxNewTokens?: number; onProgress?: (p: ModelProgress) => void } = {},
): Promise<string> => {
  const generator = await loadModel(opts.onProgress);
  const output: any = await generator(messages as any, {
    max_new_tokens: opts.maxNewTokens ?? 300,
    do_sample: false,
    return_full_text: false,
  });
  const generated = output?.[0]?.generated_text;
  if (typeof generated === "string") return generated.trim();
  if (Array.isArray(generated)) return String(generated[generated.length - 1]?.content ?? "").trim();
  return "";
};
