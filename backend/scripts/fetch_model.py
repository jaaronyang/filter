"""Download the official English Laya checkpoint into this project."""
from pathlib import Path

from huggingface_hub import snapshot_download

MODEL_DIR = Path(__file__).resolve().parents[1] / "models" / "laya"


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_download(
        repo_id="convaiinnovations/laya",
        local_dir=MODEL_DIR,
        allow_patterns=[
            "rl_agent_config.json",
            "model.safetensors",
            "tokenizer/*",
            "encoder/*",
        ],
    )
    print(f"Laya checkpoint available at {MODEL_DIR}")


if __name__ == "__main__":
    main()
