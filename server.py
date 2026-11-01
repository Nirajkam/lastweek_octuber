import json
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
OLLAMA_URL = "http://127.0.0.1:11434"
MAX_REQUEST_SIZE = 131_072
MAX_MEMORY_SIZE = 8_000
MODEL_PATTERN = re.compile(r"^[A-Za-z0-9._:/-]{1,128}$")
SYSTEM_PROMPT = (
    "You help someone write a respectful remembrance for a loved one. "
    "Use only details the person provides. Do not invent biographical facts, "
    "sensory details, beliefs, or events. Do not add a setting, relationship, "
    "or first-person memory that was not explicitly provided. Do not claim to "
    "contact or speak for the deceased. If details are unclear or absent, omit "
    "them. Write 2-4 warm, plain sentences and leave room for the person to edit."
)


class OfrendaHandler(SimpleHTTPRequestHandler):
    server_version = "OfrendaLocal/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path == "/api/models":
            try:
                with urlopen(f"{OLLAMA_URL}/api/tags", timeout=5) as response:
                    payload = json.loads(response.read())
                models = [
                    model["name"]
                    for model in payload.get("models", [])
                    if isinstance(model.get("name"), str)
                ]
                self._send_json(200, {"models": models})
            except (URLError, TimeoutError, json.JSONDecodeError) as error:
                self._send_json(
                    503,
                    {"error": f"Could not reach Ollama at 127.0.0.1:11434: {error}"},
                )
            return
        super().do_GET()

    def do_POST(self):
        if self.path != "/api/generate":
            self._send_json(404, {"error": "Not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"error": "Invalid request length"})
            return
        if length < 1 or length > MAX_REQUEST_SIZE:
            self._send_json(413, {"error": "Request is empty or too large"})
            return

        try:
            data = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_json(400, {"error": "Request must contain valid JSON"})
            return
        if not isinstance(data, dict):
            self._send_json(400, {"error": "Request must be a JSON object"})
            return

        model = data.get("model", "")
        memories = data.get("memories", {})
        if not isinstance(model, str) or not MODEL_PATTERN.fullmatch(model):
            self._send_json(400, {"error": "Choose a valid local Ollama model name"})
            return
        if not isinstance(memories, dict) or any(
            not isinstance(memories.get(key, ""), str)
            for key in ("name", "favorite_things", "story", "qualities")
        ):
            self._send_json(400, {"error": "Memory details must be text"})
            return

        details = {
            key: memories.get(key, "").strip()
            for key in ("name", "favorite_things", "story", "qualities")
        }
        if not any(details.values()):
            self._send_json(400, {"error": "Add a memory before asking for a draft"})
            return
        if any(len(value) > MAX_MEMORY_SIZE for value in details.values()):
            self._send_json(413, {"error": "Each memory field must be under 8,000 characters"})
            return

        prompt = (
            "Write a short remembrance using only the facts below. Never fill in "
            "missing details with plausible or poetic guesses. Do not use first person "
            "unless the story below is explicitly written in first person. Do not add "
            "a title, and do not mention that you are an AI.\n\n"
            f"Name: {details['name']}\n"
            f"Favorite things: {details['favorite_things']}\n"
            f"A story: {details['story']}\n"
            f"Qualities to remember: {details['qualities']}"
        )
        request = Request(
            f"{OLLAMA_URL}/api/chat",
            data=json.dumps(
                {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "stream": False,
                    "options": {"temperature": 0.1},
                }
            ).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=180) as response:
                payload = json.loads(response.read())
            text = payload.get("message", {}).get("content")
            if not isinstance(text, str) or not text.strip():
                self._send_json(502, {"error": "Ollama returned an empty draft"})
                return
            self._send_json(200, {"text": text.strip()})
        except HTTPError as error:
            detail = error.read(1_000).decode("utf-8", errors="replace")
            self._send_json(502, {"error": f"Ollama returned HTTP {error.code}: {detail}"})
        except (URLError, TimeoutError, json.JSONDecodeError) as error:
            self._send_json(502, {"error": f"Local model request failed: {error}"})

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        if self.path.startswith("/api/"):
            return
        super().log_message(format, *args)


if __name__ == "__main__":
    address = ("127.0.0.1", 8000)
    print(f"Open http://{address[0]}:{address[1]} to visit the local ofrenda.")
    ThreadingHTTPServer(address, OfrendaHandler).serve_forever()
