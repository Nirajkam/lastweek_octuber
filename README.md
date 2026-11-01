# Marigold

A private, local-first digital ofrenda for gathering memories and shaping them into an editable remembrance. Marigold uses a locally running Ollama model for drafting; it does not send stories to a hosted AI service.

## What it does

- Keeps saved remembrances in this browser's local storage.
- Uses an open-weight model through Ollama on your computer to help write a first draft.
- Lets you edit, delete, export, and import your memories.
- Makes no analytics or third-party network requests.

The local model only receives the fields you enter when you choose **Help me find the words**. The app does not contact the model until you press that button.

## Run it

1. Install [Ollama](https://ollama.com/download) and download a model once:

   ```sh
   ollama pull qwen2.5:3b
   ```

2. Start Ollama if it is not already running.
3. From this folder, start the app:

   ```sh
   python3 server.py
   ```

4. Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

The first model download needs internet. After it is downloaded, the app and model run locally and can be used without internet. You can use any model installed in Ollama; Marigold automatically selects `qwen2.5:3b` when present, otherwise the first installed model.

## Privacy and backups

Remembrances stay in the browser's local storage on this device. The app sends memory fields only to Ollama running at `127.0.0.1:11434`, and only when you request a draft. Export a JSON backup if you want to move or preserve your entries. Clearing browser data will remove saved entries unless you have an export.

Generated writing is a suggestion, not a source of facts. Local models can still invent details despite instructions, so verify every sentence and remove anything that does not feel true before keeping or sharing a draft.
# lastweek_octuber
