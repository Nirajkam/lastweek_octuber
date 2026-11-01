const STORAGE_KEY = "marigold-remembrances-v1";
const fields = {
  name: document.querySelector("#memory-name"),
  favorite_things: document.querySelector("#memory-favorites"),
  story: document.querySelector("#memory-story"),
  qualities: document.querySelector("#memory-qualities"),
  remembrance: document.querySelector("#memory-draft"),
};
const elements = {
  list: document.querySelector("#memory-list"),
  form: document.querySelector("#memory-form"),
  newButton: document.querySelector("#new-memory"),
  deleteButton: document.querySelector("#delete-memory"),
  exportButton: document.querySelector("#export-library"),
  importInput: document.querySelector("#import-library"),
  generateButton: document.querySelector("#generate-draft"),
  modelStatus: document.querySelector("#model-status"),
  modelSelect: document.querySelector("#model-select"),
  refreshModels: document.querySelector("#refresh-models"),
  appStatus: document.querySelector("#app-status"),
  storageWarning: document.querySelector("#storage-warning"),
  editorTitle: document.querySelector("#editor-title"),
};

let remembrances = [];
let selectedId = null;
let storageAvailable = true;

function validRemembrance(item) {
  return item
    && typeof item === "object"
    && typeof item.id === "string"
    && ["name", "favorite_things", "story", "qualities", "remembrance", "createdAt", "updatedAt"]
      .every((key) => typeof item[key] === "string");
}

function announce(message, isError = false) {
  elements.appStatus.textContent = message;
  elements.appStatus.classList.toggle("error", isError);
}

function readLibrary() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  const parsed = JSON.parse(saved);
  if (!Array.isArray(parsed) || parsed.some((item) => !validRemembrance(item))) {
    throw new Error("The saved remembrance file is not in the expected format.");
  }
  return parsed;
}

function persistLibrary() {
  if (!storageAvailable) {
    announce("Saving is disabled because this browser's saved data could not be read.", true);
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remembrances));
    return true;
  } catch (error) {
    announce(`Could not save in this browser: ${error.message}`, true);
    return false;
  }
}

function renderList() {
  elements.list.replaceChildren();
  if (!remembrances.length) {
    const empty = document.createElement("li");
    empty.className = "empty-list";
    empty.textContent = "Your remembrances will find a home here.";
    elements.list.append(empty);
    return;
  }

  for (const remembrance of remembrances) {
    const item = document.createElement("li");
    item.className = "memory-item";
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-current", remembrance.id === selectedId ? "true" : "false");
    button.addEventListener("click", () => selectRemembrance(remembrance.id));
    const name = document.createElement("strong");
    name.textContent = remembrance.name.trim() || "Untitled remembrance";
    const date = document.createElement("span");
    date.textContent = `Saved ${new Date(remembrance.updatedAt).toLocaleDateString()}`;
    button.append(name, date);
    item.append(button);
    elements.list.append(item);
  }
}

function clearEditor() {
  for (const field of Object.values(fields)) field.value = "";
  selectedId = null;
  elements.editorTitle.textContent = "Who are you remembering?";
  elements.deleteButton.hidden = true;
  renderList();
}

function selectRemembrance(id) {
  const remembrance = remembrances.find((item) => item.id === id);
  if (!remembrance) {
    announce("That remembrance could not be found.", true);
    return;
  }
  selectedId = id;
  for (const [key, field] of Object.entries(fields)) field.value = remembrance[key] || "";
  elements.editorTitle.textContent = remembrance.name.trim() || "A remembrance";
  elements.deleteButton.hidden = false;
  announce("");
  renderList();
}

function collectForm() {
  return {
    name: fields.name.value.trim(),
    favorite_things: fields.favorite_things.value.trim(),
    story: fields.story.value.trim(),
    qualities: fields.qualities.value.trim(),
    remembrance: fields.remembrance.value.trim(),
  };
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!storageAvailable) {
    announce("Saving is disabled because this browser's saved data could not be read.", true);
    return;
  }
  const values = collectForm();
  if (!Object.values(values).some(Boolean)) {
    announce("Add a name, a memory, or a few words before saving.", true);
    return;
  }
  const now = new Date().toISOString();
  const existing = remembrances.find((item) => item.id === selectedId);
  const remembrance = {
    id: existing?.id || crypto.randomUUID(),
    ...values,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  if (existing) remembrances = remembrances.map((item) => item.id === selectedId ? remembrance : item);
  else {
    remembrances.unshift(remembrance);
    selectedId = remembrance.id;
  }
  if (persistLibrary()) {
    elements.editorTitle.textContent = values.name || "A remembrance";
    elements.deleteButton.hidden = false;
    renderList();
    announce("Saved on this device.");
  }
});

elements.newButton.addEventListener("click", () => {
  clearEditor();
  announce("A new remembrance is ready.");
  fields.name.focus();
});

elements.deleteButton.addEventListener("click", () => {
  if (!selectedId || !window.confirm("Delete this remembrance from this device?")) return;
  remembrances = remembrances.filter((item) => item.id !== selectedId);
  if (persistLibrary()) {
    clearEditor();
    announce("Remembrance deleted from this device.");
  }
});

elements.exportButton.addEventListener("click", () => {
  const contents = new Blob([JSON.stringify(remembrances, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(contents);
  link.href = url;
  link.download = "marigold-remembrances.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  announce("Your local backup has been exported.");
});

elements.importInput.addEventListener("change", async () => {
  const [file] = elements.importInput.files || [];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported) || imported.some((item) => !validRemembrance(item))) {
      throw new Error("Choose a Marigold JSON backup.");
    }
    const combined = new Map(remembrances.map((item) => [item.id, item]));
    for (const item of imported) combined.set(item.id, item);
    const previous = remembrances;
    remembrances = [...combined.values()];
    if (persistLibrary()) {
      renderList();
      announce(`Imported ${imported.length} remembrance${imported.length === 1 ? "" : "s"}.`);
    } else {
      remembrances = previous;
    }
  } catch (error) {
    announce(`Could not import that backup: ${error.message}`, true);
  } finally {
    elements.importInput.value = "";
  }
});

elements.generateButton.addEventListener("click", async () => {
  const model = elements.modelSelect.value;
  if (!model) {
    announce("Install and select a local Ollama model before generating a draft.", true);
    return;
  }
  elements.generateButton.disabled = true;
  elements.generateButton.textContent = "Gathering the words…";
  announce("Asking your local model for a first draft.");
  try {
    const values = collectForm();
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        memories: {
          name: values.name,
          favorite_things: values.favorite_things,
          story: values.story,
          qualities: values.qualities,
        },
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
    fields.remembrance.value = result.text;
    announce("A first draft is ready. Make it sound like you.");
  } catch (error) {
    announce(`Could not generate a draft: ${error.message}`, true);
  } finally {
    elements.generateButton.disabled = false;
    elements.generateButton.innerHTML = '<span aria-hidden="true">✳</span> Help me find the words';
  }
});

async function loadModels() {
  elements.modelSelect.disabled = true;
  elements.modelSelect.replaceChildren(new Option("Checking for local models…", ""));
  elements.modelStatus.textContent = "Looking for local models…";
  try {
    const response = await fetch("/api/models");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
    if (!result.models.length) {
      elements.modelSelect.replaceChildren(new Option("No models installed", ""));
      elements.modelStatus.textContent = "Ollama is ready, but no model is installed. See the README to get started.";
      return;
    }
    const preferred = result.models.find((name) => name.startsWith("qwen2.5:3b")) || result.models[0];
    elements.modelSelect.replaceChildren(...result.models.map((name) => new Option(name, name)));
    elements.modelSelect.value = preferred;
    elements.modelSelect.disabled = false;
    elements.modelStatus.textContent = "Choose a model running on this computer.";
  } catch (error) {
    elements.modelSelect.replaceChildren(new Option("Local model unavailable", ""));
    elements.modelStatus.textContent = `Local model unavailable: ${error.message}`;
  }
}

elements.refreshModels.addEventListener("click", loadModels);

try {
  remembrances = readLibrary();
  renderList();
} catch (error) {
  storageAvailable = false;
  elements.storageWarning.textContent = `Saved data could not be read, so saving is disabled to protect it: ${error.message}`;
  elements.storageWarning.hidden = false;
  renderList();
}
loadModels();
