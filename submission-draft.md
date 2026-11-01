# Marigold: A Quiet Ofrenda for the Ghost in the Machine

<!-- Cover image: upload images/marigold-cover.png and set it as the DEV cover image. -->

## What I Built

Marigold is a private, local-first digital ofrenda: a small place to collect the details, stories, and qualities that help keep someone close.

The “ghost” here is not an AI pretending to speak for someone who has died. It is the way memory lingers in ordinary details. Marigold lets you write those details yourself, or—if you choose—ask a local model for help getting past a blank page.

You can save, edit, and delete remembrances in your browser, and export or import a JSON backup. When you press **Help me find the words**, Marigold sends the fields you entered to an Ollama model running on your own computer. The result is a short, editable suggestion. The app reminds you to check it, because a local model can still invent details.

<!-- Supporting image: upload images/marigold-writing-flow.png and insert it here. -->

## Demo

There is no hosted demo yet; Marigold runs locally. Install [Ollama](https://ollama.com/download), download the default model, start Ollama, and run:

```sh
python3 server.py
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000). The full setup is in the repository README.

## Code

<!-- Before publishing, push the current workspace files so the repository link contains the source. -->
[GitHub repository](https://github.com/Nirajkam/lastweek_octuber)

The project is released under the MIT License.

## How I Built It

The interface is plain HTML, CSS, and JavaScript. A small Python standard-library server serves the app and provides two local endpoints: one to discover installed Ollama models and one to request a draft. Remembrances stay in browser `localStorage`; the model is contacted only after the person asks for a draft.

The README uses `qwen2.5:3b` as the suggested Ollama model. Marigold prefers it when installed and otherwise lets you select another installed model. No hosted AI API or analytics service is part of the app.

<!-- Supporting image: upload images/marigold-local-architecture.png and insert it here. -->

## Why Does Open Innovation Matter?

Open-weight models and a local runtime make privacy a practical choice, not just a promise from a hosted service. There is no API key or remote inference provider between a person and their remembrance. Once the model is downloaded, the app can be used offline.

The small codebase is also inspectable and adaptable: people can see what text is sent to the model, change the prompt, or choose another model that works with Ollama.

## The Spirit of It

I wanted the AI to have a deliberately modest role. It can help someone find a first sentence, but it should not impersonate a loved one, claim to know them, or turn missing details into plausible-sounding facts. The person remembers; the model offers a draft; the person decides what is true enough to keep.

