<template>
  <main class="methodology">
    <section class="panel panel-tall">
      <p class="section-label">Methodology</p>
      <h2>How the app derives liquidity ratios</h2>

      <div class="prose">
        <p>
          The app renders PDF pages to images in the browser, ranks candidate balance-sheet pages, and
          sends those images to the local Qwen OCR model through the OpenAI-compatible vLLM API.
        </p>
        <p>
          The model is asked for normalized liquidity line items, short evidence snippets, and page
          citations. The app then reconciles those values against the PDF text layer when the report has
          embedded text, which helps recover implied current subtotals and correct obvious OCR mistakes
          before calculating the current ratio, quick ratio, and cash ratio.
        </p>
        <p>
          For banks and insurers, the app still computes the ratios but flags the results as less
          comparable because current asset and liability concepts do not map cleanly to operating-company
          analysis.
        </p>
      </div>
    </section>
  </main>
</template>
