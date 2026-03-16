#!/usr/bin/env bash
# Wrapper script for LaunchAgent — avoids Python 3.14 getpath bug
# with spaces in WorkingDirectory.
#
# Root cause: Python 3.14.2 raises InterruptedError when launchd
# spawns it with spaces in the working directory path. Using a
# symlink at ~/pipeline avoids the issue entirely.
#
# Symlink setup: ln -sfn "<real path>" ~/pipeline

REPO_ROOT="/Users/norbot/pipeline"
VENV_PYTHON="${REPO_ROOT}/.venv/bin/python3"

cd "${REPO_ROOT}" || exit 1
exec "${VENV_PYTHON}" scripts/nightly_pipeline.py "$@"
