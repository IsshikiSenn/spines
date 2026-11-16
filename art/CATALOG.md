# Artwork catalog research

Research checked on 2026-11-16. Each subject gets its own generated case with an official logo image reference, brand-directed typography and materials, an individually chosen width, upright emblems and top-to-bottom spine lettering. Finished files retain their generated proportions after cropping and height normalization.

## Production list

The existing badge catalog covers the following subjects. Remaining images are tracked in [WANTED.md](WANTED.md), and finished images are indexed in [art.generated.json](../apps/web/src/art.generated.json).

| Category | Subjects |
| --- | --- |
| AI products and development tools | Anthropic, Claude, Gemini, Copilot, Cursor, Windsurf, DeepSeek, Mistral AI, Perplexity, Meta AI, Ollama, Hugging Face, Replicate, OpenRouter, LangChain, LangGraph, CrewAI, Dify, n8n, v0, Replit |
| Model families added from research | Qwen, Kimi, GLM, Llama, Gemma, gpt-oss |
| Programming languages and runtimes | TypeScript, JavaScript, Python, Rust, Go, Swift, Kotlin, C++, .NET, Java, PHP, Ruby, Elixir, Zig, Lua, Haskell, Dart, WebAssembly, Node.js, Bun, Deno |
| Application frameworks and build tools | React, Next.js, Vue.js, Nuxt, Svelte, Angular, Astro, Hono, Django, FastAPI, Flutter, Electron, Tauri, Tailwind CSS, Vite, Prisma |
| ML development | PyTorch, TensorFlow, Jupyter |
| Infrastructure and deployment | Docker, Kubernetes, Cloudflare, Workers, Vercel, GitHub, Git, Linux, NGINX, Terraform |
| Data services | PostgreSQL, MySQL, SQLite, Redis, MongoDB, Supabase, Firebase, GraphQL |
| Everyday development and productivity tools | pnpm, Figma, Notion, Obsidian, Neovim, Zed, JetBrains, Raycast, Warp, Ghostty, Apple, Android |

## Verified references and finished artwork

These sources were inspected before generating the corresponding complete cases. Visual treatments are art direction derived from those references.

| Subject | Official source | Treatment | Finished file |
| --- | --- | --- | --- |
| Ollama | [Official site](https://ollama.com) | Cream paper, dark letterpress slab lettering, upright outlined llama | [ollama.png](ai/ollama.png) |
| Hugging Face | [Brand assets](https://huggingface.co/brand) | Sunny yellow, orange halftone, rounded lettering, upright hugging-face mark | [huggingface.png](ai/huggingface.png) |
| Dify | [Brand guidelines](https://dify.ai/brand-guidelines) | Current blue joined-if icon, blue workflow linework, worn white paper | [dify.png](ai/dify.png) |
| Mistral AI | [Brand assets](https://mistral.ai/brand/) | Official pixel emblem, sunset bands, oversized black grotesk | [mistralai.png](ai/mistralai.png) |
| Gemini | [Official site](https://gemini.google.com) | Official multicolor sparkle, iridescent blue-violet printed folds | [googlegemini.png](ai/googlegemini.png) |
| OpenRouter | [Official site and current v2 assets](https://openrouter.ai) | Current lime ligature, black stock and white geometric lettering | [openrouter.png](ai/openrouter.png) |
| n8n | [Official site](https://n8n.io) | Current connected glyph, coral workflow print and bold rounded lettering | [n8n.png](ai/n8n.png) |
| Python | [PSF logo resources](https://www.python.org/community/logos/) | Two-snakes emblem, navy and yellow paper layers, humanist lettering | [python.png](stack/python.png) |
| Rust | [Official site](https://rust-lang.org) | Cogwheel emblem, oxidized kraft stock and heavy slab typography | [rust.png](stack/rust.png) |
| Docker | [Official site](https://www.docker.com) | Navy whale, faded blue maritime print and cream lettering | [docker.png](stack/docker.png) |
| Next.js | [Official site](https://nextjs.org) | Official N device, narrow black sleeve and white architectural geometry | [nextdotjs.png](stack/nextdotjs.png) |
| Qwen | [Official site](https://qwen.ai), [official model organization](https://huggingface.co/Qwen) | Current blue segmented emblem, cobalt geometric lettering and frosted stock | [Qwen.png](models/Qwen.png) |
| Kimi | [Official site](https://www.kimi.com) | Official K device, black lunar photographic stock and italic lettering | [Kimi.png](models/Kimi.png) |
| GLM | [Official model organization](https://huggingface.co/zai-org), [Z.ai](https://chat.z.ai) | Official provider Z device, silver-black stock and angular typography | [GLM.png](models/GLM.png) |
| Llama | [Verified official organization](https://huggingface.co/meta-llama), [official repository artwork](https://github.com/meta-llama/llama-models) | Meta provider emblem, blue paper and purple alpaca artwork from the official repository | [Llama.png](models/Llama.png) |
| Gemma | [Google DeepMind model page](https://deepmind.google/models/gemma/) | Official hollow blue star, lavender paper and pale gemstone facets | [Gemma.png](models/Gemma.png) |
| gpt-oss | [Official repository and banner](https://github.com/openai/gpt-oss) | Official OpenAI provider emblem, cyan-blue photographic folds and editorial type | [gpt-oss.png](models/gpt-oss.png) |

Model-family images are available through `/art/qwen.svg`, `/art/kimi.svg`, `/art/glm.svg`, `/art/llama.svg`, `/art/gemma.svg` and `/art/gpt-oss.svg`, and as `art:<slug>` shelf items.

The remaining badge subjects require the same official-reference inspection and individual generation before they can be marked finished.
