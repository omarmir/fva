# Windows Bun Single-Exe Local Distribution Plan

## Summary

Build a Windows x64 CPU-first distributable where one Bun-compiled `.exe` serves the existing Vue UI and owns local inference through a managed `llama.cpp` sidecar. The first run downloads the CPU `llama-server.exe` package and `ggml-org/Qwen2.5-VL-3B-Instruct-GGUF:Q4_K_M`; later runs reuse the local cache. The browser UI will no longer accept or call an external vLLM URL.

References used while drafting this plan:

- Bun single-file executables support Windows x64 targets and embedded assets.
- llama.cpp and Hugging Face document OpenAI-compatible serving for `ggml-org/Qwen2.5-VL-3B-Instruct-GGUF:Q4_K_M`.

## Key Changes

- Add a Bun server entrypoint that:
  - Serves the built Vue app from embedded/static `dist` assets.
  - Starts on `127.0.0.1` with an available port, prints the URL, and opens the browser unless `--no-open` is passed.
  - Creates `%LOCALAPPDATA%/FinancialVisionAnalyzer` with `bin/`, `models/`, `cache/`, and `logs/`.
  - Downloads and extracts `llama-b9222-bin-win-cpu-x64.zip` from `ggml-org/llama.cpp` releases if missing.
  - Launches `llama-server.exe -hf ggml-org/Qwen2.5-VL-3B-Instruct-GGUF:Q4_K_M --host 127.0.0.1 --port <internal-port> --ctx-size 8192 --threads <cpu_count_minus_one>`.
  - Polls `/v1/models` until inference is ready and shuts down the child process when the Bun app exits.

- Replace browser-facing vLLM configuration with internal endpoints:
  - `GET /api/runtime/status`: install/download/launch/model readiness state.
  - `POST /api/runtime/install`: explicit retry path for failed first-run setup.
  - `GET /api/models`: proxy to internal llama.cpp `/v1/models`.
  - `POST /api/chat/completions`: proxy existing multimodal requests to internal llama.cpp `/v1/chat/completions`.
  - Keep the request payload shape close to the current OpenAI-compatible flow so extraction code changes stay small.

- Update the Vue app:
  - Remove editable vLLM base URL from settings/source rail.
  - Show local runtime/model status instead: installing, downloading, starting, ready, failed.
  - Keep the current PDF upload/sample UI, page ranking, worker flow, extraction normalization, ratio computation, and manual field editing.
  - Rename vLLM-specific helpers/messages to local inference terminology.

- Update packaging scripts:
  - `bun run build:web`: current `vue-tsc -b && vite build`.
  - `bun run build:exe`: builds web assets, then runs `bun build --compile --target=bun-windows-x64-baseline server/index.ts --outfile dist/fva.exe`.
  - Keep `npm test`/`bun test` equivalent verification working for existing unit tests.

## Test Plan

- Unit tests:
  - URL/helper tests updated from vLLM naming to local inference naming.
  - Server runtime tests for app-data path selection, download-needed detection, sidecar command construction, and proxy error formatting.
  - Existing extraction normalization, ratios, text-layer reconciliation, and worker tests remain green.

- Integration checks:
  - Build the Vue app.
  - Build the Windows x64 Bun executable.
  - Run server in development mode with a mocked llama.cpp process and verify `/api/runtime/status`, `/api/models`, and `/api/chat/completions`.
  - Run a sample-report extraction against a real local llama.cpp server when model files are available.

- Manual acceptance:
  - On a clean Windows x64 machine, launch `fva.exe`.
  - App downloads the sidecar/model, opens the UI, analyzes a bundled sample PDF, and produces ratios without any external vLLM setting.
  - Relaunch works offline after the first successful setup.

## Assumptions

- First target is Windows x64 CPU-only.
- Default model is `ggml-org/Qwen2.5-VL-3B-Instruct-GGUF:Q4_K_M`.
- The release artifact is a single Bun app executable, but first run may create cached sidecar/model files under `%LOCALAPPDATA%`; embedding multi-GB model files into the `.exe` is intentionally out of scope.
- Docker/vLLM docs and compose config can be removed or moved to legacy notes once the local distribution path is working.
