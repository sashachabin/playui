# PlayUI

[playui.dev](https://playui.dev)

> **PlayUI is under active development.** Features and setup instructions may change.

**Prototype interfaces and user flows with AI.**

PlayUI is a free, open-source AI playground in the spirit of v0, Lovable, Bolt, and Replit. Use your own design system, test prototypes in a live preview, and refine them in chat.

## Design systems

PlayUI uses your React components so prototypes look and behave like your product. Integrations can include component examples, user flows, and preview settings.

We want to support:

- [Ant Design](https://ant.design/)
- [Gravity UI](https://gravity-ui.com/libraries/uikit)
- [Kontur UI](https://github.com/skbkontur/retail-ui)
- [Material UI (MUI)](https://mui.com/material-ui/)
- [React Spectrum (Adobe)](https://react-spectrum.adobe.com/)
- [shadcn/ui](https://ui.shadcn.com/)

We want to support more design systems, including yours.

## Try PlayUI

```sh
npm install
npm run dev
```

Open the local URL, choose a template, and describe the interface or flow you want to prototype.

## Preview runtime

PlayUI bundles TSX and CSS in the browser and runs the result in a sandboxed iframe.
Use **+** to start a Kontur UI or Ant Design example. Describe a change in chat
and test the result in **Preview**. The assistant can also add pages, switch the
theme or preview size, and manage files through structured actions. Switch
between desktop, tablet and mobile widths using the preview toolbar.

Open **Code** to edit files in Monaco. The file manager can create, rename and
delete files. Renaming updates relative imports. `App.tsx` and
`playui.config.json` are protected entry files.

Draft files and project settings are saved in this browser. Chat history stays
with each draft during the session.

The local API server is only used for AI requests. Editing and preview work
without an API key.

To use another public npm package, add its exact version to
`packages` in `playui.config.json` and import it in your source:

```json
{
  "packages": {
    "clsx": "2.1.1"
  }
}
```

PlayUI loads added packages from [esm.sh](https://esm.sh/) inside the preview.
Kontur UI and Ant Design are bundled with PlayUI and include editor types.
For other packages, you can add declarations to the project.

## Self-hosting

Copy `.env.example` to `.env` and add an API key:

```sh
AI_API_KEY=...
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-flash
```

The server speaks the OpenAI chat-completions protocol, so the same settings
work with DeepSeek, OpenRouter, Groq, OpenAI or a local Ollama server. Keys stay
in the Node server and never reach the browser.

Then start the AI server:

```sh
npm run server
```

Long answers use `AI_MAX_OUTPUT_TOKENS` (default 32768) and are retried once with
a doubled budget if the provider cuts them off.

The server validates every AI answer with esbuild before it reaches the preview.
If the generated code does not compile, the model is asked to fix it once
(`AI_MAX_ATTEMPTS`) using the compiler errors.

PlayUI requires Node.js 22.9 or newer.

## Development

```sh
npm test          # server unit tests
npm run typecheck # TypeScript
npm run lint
npm run format:check
npm run build     # typecheck + production build
```

## GitHub Pages

Push to `main` to publish the browser app with GitHub Actions.
In repository Settings → Pages, select **GitHub Actions** as the source.

The editor and preview run on Pages. For AI, set the repository variable
`VITE_AI_API_URL` to your API server's full `/api/generate` URL.
The API server must allow requests from your Pages origin.
Keep API keys on the server.

The default site address is https://sashachabin.github.io/playui/.
