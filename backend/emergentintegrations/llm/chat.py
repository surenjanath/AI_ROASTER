"""
Local shim for emergentintegrations.llm.chat.
Uses litellm to route to the actual LLM provider.
The EMERGENT_LLM_KEY is treated as a Gemini API key for gemini/* models.
"""
import os
import litellm

litellm.set_verbose = False

# Suppress litellm noise
os.environ.setdefault("LITELLM_LOG", "ERROR")

# Model name aliases: Emergent platform names → litellm names
_MODEL_ALIASES: dict[str, str] = {
    "gemini-3-flash-preview": "gemini-2.5-flash-preview-05-20",
    "gemini-2.5-flash": "gemini-2.5-flash",
    "gemini-2.0-flash": "gemini-2.0-flash",
    "gemini-1.5-flash": "gemini-1.5-flash",
    "gemini-1.5-pro": "gemini-1.5-pro",
}


def _resolve_model(provider: str, model: str) -> str:
    resolved = _MODEL_ALIASES.get(model, model)
    if provider == "openai":
        return resolved
    if provider == "anthropic":
        return f"anthropic/{resolved}"
    return f"gemini/{resolved}"


class UserMessage:
    def __init__(self, text: str):
        self.text = text


class LlmChat:
    def __init__(self, api_key: str, session_id: str, system_message: str = ""):
        self._api_key = api_key
        self._session_id = session_id
        self._system_message = system_message
        self._provider = "gemini"
        self._model = "gemini-2.5-flash"

    def with_model(self, provider: str, model: str) -> "LlmChat":
        self._provider = provider
        self._model = model
        return self

    async def send_message(self, message: UserMessage) -> str:
        messages = []
        if self._system_message:
            messages.append({"role": "system", "content": self._system_message})
        messages.append({"role": "user", "content": message.text})

        litellm_model = _resolve_model(self._provider, self._model)

        kwargs: dict = {
            "model": litellm_model,
            "messages": messages,
            "api_key": self._api_key,
        }

        # For Gemini, also set env var so litellm can pick it up
        if self._provider == "gemini":
            os.environ["GEMINI_API_KEY"] = self._api_key

        response = await litellm.acompletion(**kwargs)
        content = response.choices[0].message.content
        return content if content else ""
