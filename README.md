# Financial Vision Analyzer

Vue 3 SPA for extracting liquidity inputs from annual-report PDFs with a local vLLM-served OCR/vision model and computing:

- current ratio
- quick ratio
- cash ratio

## Workflow

1. Upload a PDF or open a bundled sample report.
2. The app renders PDF pages to images in the browser.
3. Background workers rank likely statement pages and call the local vLLM endpoint.
4. The model output is normalized, then reconciled against the PDF text layer when available before ratios are computed.

## Local model endpoint

Set the app to the vLLM server base URL, for example:

```text
http://192.168.2.124:8000
```

Do not include `/v1`. The app adds the OpenAI-compatible API path automatically and also normalizes pasted values such as `/v1` or `/v1/chat/completions`.

## Development

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 3001
```

## Verification

```bash
npm test
npm run build
```
