# Shared helpers. Sourced by env/atl-env.sh. Expects REPO_ROOT and PROFILE to be set.

log()  { printf '[atl-env %s] %s\n' "$PROFILE" "$*" >&2; }
fail() {
  # fail "<what failed>" "<command to run for diagnosis>"
  printf '\n[atl-env %s] FAILED: %s\n' "$PROFILE" "$1" >&2
  [ -n "${2:-}" ] && printf '[atl-env %s] Next step for diagnosis: %s\n' "$PROFILE" "$2" >&2
  exit 1
}

# Convert a host path into a form Docker accepts. On Git Bash (Windows) this gives C:/... paths.
hostpath() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi
}

load_env_local() {
  local f="$REPO_ROOT/.env.local"
  if [ -f "$f" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$f"
    set +a
  fi
}

load_profile() {
  local f="$REPO_ROOT/env/profiles/$PROFILE.env"
  [ -f "$f" ] || fail "profile file not found: $f" "ls $REPO_ROOT/env/profiles"
  set -a
  # shellcheck disable=SC1090
  . "$f"
  set +a
  # Product differences (not version differences: those are in the profile).
  case "$PRODUCT" in
    confluence)
      START_SCRIPT=bin/start-confluence.sh
      APP_PORT_IN_CT=8090
      LOG_SUBDIR=logs
      LOG_FILE_NAME=atlassian-confluence.log
      ;;
    jira)
      START_SCRIPT=bin/start-jira.sh
      APP_PORT_IN_CT=8080
      LOG_SUBDIR=log
      LOG_FILE_NAME=atlassian-jira.log
      ;;
    *) fail "unknown PRODUCT '$PRODUCT' in $f" "grep PRODUCT $f" ;;
  esac
  INSTANCE_DIR="$REPO_ROOT/env/instances/$PROFILE"
  INSTALL_DIR="$INSTANCE_DIR/install"
  # Product log directory inside the home dir, bind-mounted here so the log can be read from the host.
  LOGS_DIR="$INSTANCE_DIR/home/$LOG_SUBDIR"
  SNAPSHOT_DIR="$INSTANCE_DIR/snapshot"
  ARCHIVE_FILE="$REPO_ROOT/env/downloads/$(basename "$ARCHIVE_URL")"
  # 127.0.0.1, not localhost: on this Windows machine localhost resolves to ::1 first, and ::1 is
  # held by wslrelay, which accepts connections but never answers (docs/notes/hosts.md).
  BASE_URL="http://127.0.0.1:${HTTP_PORT}${CONTEXT_PATH}"
  # Docker object names, one set per profile.
  NET="atl-$PROFILE"
  DB_CT="atl-$PROFILE-db"
  APP_CT="atl-$PROFILE-app"
  HOME_VOL="atl-$PROFILE-home"
  DB_VOL="atl-$PROFILE-pgdata"
  APP_HOME_IN_CT=/var/atlassian/application-data/$PRODUCT
  APP_INSTALL_IN_CT=/opt/atlassian/$PRODUCT
}

require_docker() {
  # A terminal opened before Docker Desktop was installed does not have it on PATH yet.
  if ! command -v docker >/dev/null 2>&1; then
    local d
    for d in "${LOCALAPPDATA:-}/Programs/DockerDesktop/resources/bin" "${ProgramFiles:-}/Docker/Docker/resources/bin"; do
      [ -x "$d/docker.exe" ] && PATH="$PATH:$(cygpath -u "$d" 2>/dev/null || printf '%s' "$d")" && break
    done
  fi
  command -v docker >/dev/null 2>&1 || fail "docker is not on PATH" "install Docker Desktop, then open a new terminal and run: docker version"
  docker info >/dev/null 2>&1 || fail "docker daemon is not reachable" "start Docker Desktop, then run: docker info"
}

require_var() {
  # require_var <name of variable> <hint>
  [ -n "${!1:-}" ] || fail "variable $1 is empty" "$2"
}

md5_of() {
  if command -v md5sum >/dev/null 2>&1; then md5sum "$1" | cut -d' ' -f1; else md5 -q "$1"; fi
}

ct_exists()  { docker container inspect "$1" >/dev/null 2>&1; }
ct_running() { [ "$(docker container inspect -f '{{.State.Running}}' "$1" 2>/dev/null)" = "true" ]; }

# Prints the "state" value from the /status endpoint, or "stopped"/"starting".
product_state() {
  if ! ct_running "$APP_CT"; then echo stopped; return; fi
  local body
  body=$(curl -s --max-time 5 "$BASE_URL/status" || true)
  case "$body" in
    *'"state"'*) printf '%s' "$body" | sed -E 's/.*"state" *: *"([A-Z_]+)".*/\1/' ;;
    *) echo starting ;;
  esac
}
