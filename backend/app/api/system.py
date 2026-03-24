import logging
import subprocess
from fastapi import APIRouter, BackgroundTasks

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/system", tags=["system"])

PROJECT_DIR = "/app/project"


def _git(args: list[str]) -> str:
    result = subprocess.run(
        ["git", "-C", PROJECT_DIR] + args,
        capture_output=True, text=True, timeout=15,
    )
    return result.stdout.strip()


@router.post("/update")
async def trigger_update(background_tasks: BackgroundTasks):
    """Check for new commits on the current branch and rebuild if available."""
    try:
        # Fetch latest refs from remote
        subprocess.run(
            ["git", "-C", PROJECT_DIR, "fetch", "origin"],
            capture_output=True, timeout=30,
        )

        local  = _git(["rev-parse", "HEAD"])
        branch = _git(["rev-parse", "--abbrev-ref", "HEAD"])
        remote = _git(["rev-parse", f"origin/{branch}"])

        if not local or not remote:
            return {"status": "error", "message": "Repositório git não acessível"}

        if local == remote:
            return {"status": "up_to_date", "commit": local[:8]}

        logger.info(f"Update available: {local[:8]} → {remote[:8]} (branch: {branch})")
        background_tasks.add_task(_do_update, branch)
        return {"status": "updating", "from": local[:8], "to": remote[:8]}

    except Exception as e:
        logger.error(f"System update check failed: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/version")
def get_version():
    """Return current git commit hash — used by frontend to detect when update completes."""
    try:
        commit = _git(["rev-parse", "HEAD"])
        branch = _git(["rev-parse", "--abbrev-ref", "HEAD"])
        return {"commit": commit[:8], "branch": branch, "ok": True}
    except Exception:
        return {"commit": "unknown", "branch": "unknown", "ok": False}


def _do_update(branch: str) -> None:
    """Pull latest code and rebuild Docker containers (runs in background)."""
    try:
        logger.info(f"Pulling from origin/{branch}…")
        pull = subprocess.run(
            ["git", "-C", PROJECT_DIR, "pull", "origin", branch],
            capture_output=True, text=True, timeout=60,
        )
        logger.info(f"git pull: {pull.stdout.strip() or pull.stderr.strip()}")

        logger.info("Rebuilding containers via docker compose…")
        dc = subprocess.run(
            ["docker", "compose", "-f", f"{PROJECT_DIR}/docker-compose.yml",
             "up", "-d", "--build"],
            capture_output=True, text=True, timeout=300,
        )
        if dc.returncode == 0:
            logger.info("docker compose up completed successfully")
        else:
            logger.error(f"docker compose up failed: {dc.stderr.strip()}")

    except Exception as e:
        logger.error(f"_do_update error: {e}")
