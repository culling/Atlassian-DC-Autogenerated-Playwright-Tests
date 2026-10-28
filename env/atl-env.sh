#!/usr/bin/env bash
# Single entry point for Atlassian DC test environments.
# Usage: env/atl-env.sh <profile> <command>
# All version differences come from env/profiles/<profile>.env.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Git Bash rewrites arguments that look like Unix paths (/opt/...). Docker needs them unchanged.
export MSYS_NO_PATHCONV=1

usage() {
  cat >&2 <<'EOF'
Usage: env/atl-env.sh <profile> <command>

Commands:
  download     fetch the .tar.gz into env/downloads/ (skips a valid existing file)
  install      extract into env/instances/<profile>/install
  configure    memory, home dir, context path, Docker network and volumes
  start        start the database and the product; wait until healthy
  stop         stop the product and its database
  status       print state (stopped / starting / FIRST_RUN / RUNNING)
  logs         tail the product log
  reset        stop, delete home dir + DB data, re-configure (clean state)
  setup        run the first-time setup wizard (Playwright, env/setup/)
  install-app  install APP_FILES through UPM and apply the app licence
  snapshot     save home dir + DB dump (run after setup + install-app)
  restore      restore the saved snapshot (fast clean state)
  up           download, install, configure, start, setup, install-app, snapshot
EOF
  exit 2
}

[ $# -eq 2 ] || usage
PROFILE="$1"
COMMAND="$2"

# shellcheck source=lib/common.sh
. "$REPO_ROOT/env/lib/common.sh"
load_env_local
load_profile

cmd_download() {
  mkdir -p "$(dirname "$ARCHIVE_FILE")"
  if [ -f "$ARCHIVE_FILE" ]; then
    if [ -z "${ARCHIVE_MD5:-}" ] || [ "$(md5_of "$ARCHIVE_FILE")" = "$ARCHIVE_MD5" ]; then
      log "archive present and valid: $ARCHIVE_FILE"
      return
    fi
    log "archive checksum does not match; downloading again"
    rm -f "$ARCHIVE_FILE"
  fi
  log "downloading $ARCHIVE_URL"
  # curl.exe (Git for Windows) is a Windows program: with MSYS_NO_PATHCONV=1 it cannot write to a
  # /c/... path ("curl: (23) client returned ERROR on write"), so it gets the C:/ form.
  curl -fL -sS --retry 3 -o "$(hostpath "$ARCHIVE_FILE.part")" "$ARCHIVE_URL" \
    || fail "download failed" "curl -I $ARCHIVE_URL   (or place the archive manually at $ARCHIVE_FILE)"
  mv "$ARCHIVE_FILE.part" "$ARCHIVE_FILE"
  if [ -n "${ARCHIVE_MD5:-}" ] && [ "$(md5_of "$ARCHIVE_FILE")" != "$ARCHIVE_MD5" ]; then
    fail "checksum mismatch for $ARCHIVE_FILE (expected $ARCHIVE_MD5)" "md5sum $ARCHIVE_FILE"
  fi
  log "download complete"
}

cmd_install() {
  [ -f "$ARCHIVE_FILE" ] || fail "archive missing: $ARCHIVE_FILE" "env/atl-env.sh $PROFILE download"
  if [ -f "$INSTALL_DIR/$START_SCRIPT" ]; then
    log "already installed: $INSTALL_DIR"
    return
  fi
  rm -rf "$INSTALL_DIR"
  mkdir -p "$INSTALL_DIR"
  log "extracting into $INSTALL_DIR"
  tar -xzf "$ARCHIVE_FILE" -C "$INSTALL_DIR" --strip-components=1 \
    || fail "extract failed" "tar -tzf $ARCHIVE_FILE | head"
  log "install complete"
}

configure_confluence_files() {
  # 1. JVM memory. setenv.sh ships with a fixed "-Xms1024m -Xmx1024m" line.
  sed -i -E "s/^CATALINA_OPTS=\"-Xms[0-9]+[mMgG] -Xmx[0-9]+[mMgG] /CATALINA_OPTS=\"-Xms${JVM_MIN_MEM} -Xmx${JVM_MAX_MEM} /" \
    "$INSTALL_DIR/bin/setenv.sh"
  grep -q -- "-Xms${JVM_MIN_MEM} -Xmx${JVM_MAX_MEM}" "$INSTALL_DIR/bin/setenv.sh" \
    || fail "could not set JVM memory in setenv.sh" "grep -n Xms $INSTALL_DIR/bin/setenv.sh"

  # 2. Home directory (path inside the container).
  local init="$INSTALL_DIR/confluence/WEB-INF/classes/confluence-init.properties"
  # The shipped file has no trailing newline, so the marker line is written on its own line.
  sed -i -E 's/confluence\.home=\/var\/atlassian\/application-data\/confluence$//; /^confluence\.home=/d' "$init"
  [ -z "$(tail -c1 "$init")" ] || printf '\n' >> "$init"
  printf 'confluence.home=%s\n' "$APP_HOME_IN_CT" >> "$init"

  # 3. Context path.
  sed -i -E "s#<Context path=\"[^\"]*\" docBase=\"../confluence\"#<Context path=\"${CONTEXT_PATH}\" docBase=\"../confluence\"#" \
    "$INSTALL_DIR/conf/server.xml"
}

configure_jira_files() {
  # 1. JVM memory. setenv.sh has JVM_MINIMUM_MEMORY / JVM_MAXIMUM_MEMORY lines.
  sed -i -E "s/^JVM_MINIMUM_MEMORY=\"[^\"]*\"/JVM_MINIMUM_MEMORY=\"${JVM_MIN_MEM}\"/; s/^JVM_MAXIMUM_MEMORY=\"[^\"]*\"/JVM_MAXIMUM_MEMORY=\"${JVM_MAX_MEM}\"/" \
    "$INSTALL_DIR/bin/setenv.sh"
  grep -q "^JVM_MAXIMUM_MEMORY=\"${JVM_MAX_MEM}\"" "$INSTALL_DIR/bin/setenv.sh" \
    || fail "could not set JVM memory in setenv.sh" "grep -n JVM_ $INSTALL_DIR/bin/setenv.sh"

  # 2. Home directory: set with the JIRA_HOME environment variable in start_app (setenv.sh reads it).

  # 3. Context path.
  sed -i -E "s#<Context path=\"[^\"]*\" docBase=\"\\\$\{catalina.home\}/atlassian-jira\"#<Context path=\"${CONTEXT_PATH}\" docBase=\"\${catalina.home}/atlassian-jira\"#" \
    "$INSTALL_DIR/conf/server.xml"
  grep -q "<Context path=\"${CONTEXT_PATH}\" docBase=" "$INSTALL_DIR/conf/server.xml" \
    || fail "could not set the context path in server.xml" "grep -n Context $INSTALL_DIR/conf/server.xml"
}

# Writes a file into the home volume if it does not exist yet. Content comes from stdin.
write_home_file_once() {
  docker run --rm -i -v "$HOME_VOL:/data" "$JAVA_IMAGE" sh -c "[ -f '/data/$1' ] && cat >/dev/null || cat > '/data/$1'" \
    || fail "could not write $1 into $HOME_VOL" "docker volume inspect $HOME_VOL"
}

configure_jira_home() {
  # Database connection: Jira reads dbconfig.xml from the home dir, so the setup wizard skips its
  # database screen. Format: Atlassian "Connecting Jira applications to PostgreSQL".
  write_home_file_once dbconfig.xml <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<jira-database-config>
  <name>defaultDS</name>
  <delegator-name>default</delegator-name>
  <database-type>postgres72</database-type>
  <schema-name>public</schema-name>
  <jdbc-datasource>
    <url>jdbc:postgresql://${DB_CT}:5432/${DB_NAME}</url>
    <driver-class>org.postgresql.Driver</driver-class>
    <username>${DB_USER}</username>
    <password>${DB_PASSWORD}</password>
    <pool-min-size>20</pool-min-size>
    <pool-max-size>20</pool-max-size>
    <pool-max-wait>30000</pool-max-wait>
    <validation-query>select 1</validation-query>
    <pool-test-while-idle>true</pool-test-while-idle>
  </jdbc-datasource>
</jira-database-config>
EOF
  # Secure administrator sessions (websudo) off: test instances only. Jira has no UI setting for it.
  write_home_file_once jira-config.properties <<'EOF'
jira.websudo.is.disabled = true
EOF
}

cmd_configure() {
  [ -f "$INSTALL_DIR/bin/setenv.sh" ] || fail "product not installed" "env/atl-env.sh $PROFILE install"
  "configure_${PRODUCT}_files"

  # 4. Docker network and volumes (database data and home dir live in Docker volumes:
  #    Windows bind mounts are slow and break Lucene index file locking).
  require_docker
  docker network inspect "$NET" >/dev/null 2>&1 || docker network create "$NET" >/dev/null
  docker volume inspect "$DB_VOL" >/dev/null 2>&1 || docker volume create "$DB_VOL" >/dev/null
  docker volume inspect "$HOME_VOL" >/dev/null 2>&1 || docker volume create "$HOME_VOL" >/dev/null
  if [ "$PRODUCT" = jira ]; then configure_jira_home; fi
  mkdir -p "$LOGS_DIR"
  log "configure complete (memory ${JVM_MIN_MEM}/${JVM_MAX_MEM}, port ${HTTP_PORT}, context '${CONTEXT_PATH}')"
}

start_db() {
  if ! ct_exists "$DB_CT"; then
    log "creating database container $DB_CT ($DB_IMAGE, host port $DB_PORT)"
    docker run -d --name "$DB_CT" --network "$NET" -p "127.0.0.1:${DB_PORT}:5432" \
      -e POSTGRES_USER="$DB_USER" -e POSTGRES_PASSWORD="$DB_PASSWORD" -e POSTGRES_DB="$DB_NAME" \
      -v "$DB_VOL:/var/lib/postgresql/data" "$DB_IMAGE" >/dev/null \
      || fail "database container did not start" "docker logs $DB_CT"
  elif ! ct_running "$DB_CT"; then
    docker start "$DB_CT" >/dev/null || fail "database container did not start" "docker logs $DB_CT"
  fi
  local i
  for i in $(seq 1 60); do
    docker exec "$DB_CT" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1 && { log "database ready"; return; }
    sleep 1
  done
  fail "database not ready after 60 s" "docker logs $DB_CT"
}

start_app() {
  ct_running "$APP_CT" && return
  # The container holds no state (install dir, home volume and logs are mounted), so a stopped
  # container is always re-created. This applies any change to the profile settings.
  ct_exists "$APP_CT" && docker rm "$APP_CT" >/dev/null
  log "creating product container $APP_CT ($JAVA_IMAGE, $BASE_URL)"
  # JIRA_HOME is read by Jira's setenv.sh; Confluence ignores it.
  docker run -d --name "$APP_CT" --network "$NET" -p "127.0.0.1:${HTTP_PORT}:${APP_PORT_IN_CT}" \
    -v "$(hostpath "$INSTALL_DIR"):$APP_INSTALL_IN_CT" \
    -v "$HOME_VOL:$APP_HOME_IN_CT" \
    -v "$(hostpath "$LOGS_DIR"):$APP_HOME_IN_CT/$LOG_SUBDIR" \
    -e JIRA_HOME="$APP_HOME_IN_CT" \
    -e CATALINA_OPTS="-Duser.language=en -Duser.country=US -Duser.timezone=UTC ${EXTRA_JVM_OPTS:-}" \
    "$JAVA_IMAGE" "$APP_INSTALL_IN_CT/$START_SCRIPT" -fg >/dev/null \
    || fail "product container did not start" "docker logs $APP_CT"
}

wait_healthy() {
  local timeout=${1:-900} waited=0 state
  log "waiting for $BASE_URL/status (timeout ${timeout} s)"
  while [ "$waited" -lt "$timeout" ]; do
    ct_running "$APP_CT" || fail "product container exited" "docker logs --tail 200 $APP_CT"
    state=$(product_state)
    case "$state" in
      RUNNING|FIRST_RUN) log "state: $state after ${waited} s"; return ;;
      ERROR) fail "product reports state ERROR" "env/atl-env.sh $PROFILE logs" ;;
    esac
    sleep 5
    waited=$((waited + 5))
  done
  fail "product not healthy after ${timeout} s (last state: $state)" "env/atl-env.sh $PROFILE logs"
}

cmd_start() {
  require_docker
  [ -f "$INSTALL_DIR/$START_SCRIPT" ] || fail "product not installed" "env/atl-env.sh $PROFILE install"
  cmd_configure
  start_db
  start_app
  wait_healthy
  log "open $BASE_URL"
}

cmd_stop() {
  require_docker
  if ct_running "$APP_CT"; then log "stopping $APP_CT"; docker stop -t 120 "$APP_CT" >/dev/null; fi
  if ct_running "$DB_CT"; then log "stopping $DB_CT"; docker stop "$DB_CT" >/dev/null; fi
  log "stopped"
}

cmd_status() {
  require_docker
  echo "$(product_state)"
}

cmd_logs() {
  local f="$LOGS_DIR/$LOG_FILE_NAME"
  if [ -f "$f" ]; then tail -n 200 -f "$f"; else docker logs --tail 200 -f "$APP_CT"; fi
}

cmd_reset() {
  require_docker
  log "reset: removing containers, volumes and logs (snapshot in $SNAPSHOT_DIR is kept)"
  ct_exists "$APP_CT" && docker rm -f "$APP_CT" >/dev/null
  ct_exists "$DB_CT" && docker rm -f "$DB_CT" >/dev/null
  docker volume rm -f "$HOME_VOL" "$DB_VOL" >/dev/null
  rm -rf "$LOGS_DIR"
  cmd_configure
  log "reset complete; next: env/atl-env.sh $PROFILE start"
}

run_playwright_setup() {
  ( cd "$REPO_ROOT" && ATL_PROFILE="$PROFILE" ATL_BASE_URL="$BASE_URL" ATL_SETUP_WIZARD="$SETUP_WIZARD" \
      ATL_DB_HOST="$DB_CT" ATL_DB_NAME="$DB_NAME" ATL_DB_USER="$DB_USER" ATL_DB_PASSWORD="$DB_PASSWORD" \
      ATL_HOST_LICENSE="${!LICENSE_ENV_VAR:-}" \
      npx playwright test --config env/setup/playwright.config.ts ) \
    || fail "setup wizard failed" "npx playwright show-report env/setup/playwright-report"
}

cmd_setup() {
  require_docker
  require_var "$LICENSE_ENV_VAR" "add $LICENSE_ENV_VAR to .env.local (see .env.local.example)"
  require_var ATL_ADMIN_USER "add ATL_ADMIN_USER to .env.local"
  require_var ATL_ADMIN_PASSWORD "add ATL_ADMIN_PASSWORD to .env.local"
  local state
  state=$(product_state)
  [ "$state" = "FIRST_RUN" ] || [ "$state" = "RUNNING" ] || fail "product state is $state" "env/atl-env.sh $PROFILE start"
  log "running setup wizard (state: $state)"
  run_playwright_setup
  log "setup complete"
}

upm() {
  # upm <curl args...>   authenticated call to the Universal Plugin Manager REST API
  curl -sS --max-time 300 -u "$ATL_ADMIN_USER:$ATL_ADMIN_PASSWORD" -H "X-Atlassian-Token: no-check" "$@"
}

cmd_install_app() {
  require_docker
  require_var ATL_ADMIN_USER "add ATL_ADMIN_USER to .env.local"
  [ "$(product_state)" = "RUNNING" ] || fail "product is not RUNNING" "env/atl-env.sh $PROFILE status"
  local file token resp task status i
  for file in $APP_FILES; do
    [ -f "$REPO_ROOT/$file" ] || fail "app file missing: $REPO_ROOT/$file" "ls $REPO_ROOT/$(dirname "$file")"
    token=$(upm -I "$BASE_URL/rest/plugins/1.0/?os_authType=basic" | tr -d '\r' | sed -n -E 's/^upm-token: *//Ip')
    [ -n "$token" ] || fail "no UPM token (check admin credentials)" "curl -I -u USER:PASS $BASE_URL/rest/plugins/1.0/"
    log "uploading $file"
    resp=$(upm -F "plugin=@$(hostpath "$REPO_ROOT/$file")" "$BASE_URL/rest/plugins/1.0/?token=$token")
    task=$(printf '%s' "$resp" | sed -n -E 's/.*"self" *: *"([^"]+)".*/\1/p')
    [ -n "$task" ] || fail "UPM upload was not accepted: $resp" "env/atl-env.sh $PROFILE logs"
    for i in $(seq 1 60); do
      status=$(upm "${BASE_URL%"$CONTEXT_PATH"}$task")
      case "$status" in *'"done":true'*|*'"enabled"'*) break ;; esac
      sleep 2
    done
    case "$status" in *'"errorMessage"'*|*'"subCode"'*) fail "UPM install error: $status" "env/atl-env.sh $PROFILE logs" ;; esac
  done

  upm "$BASE_URL/rest/plugins/1.0/$APP_KEY-key" | grep -q '"enabled":true' \
    || fail "app $APP_KEY is not enabled after install" "curl -u USER:PASS $BASE_URL/rest/plugins/1.0/$APP_KEY-key"
  log "app $APP_KEY installed and enabled"

  if [ -n "${APP_LICENSE_ENV_VAR:-}" ]; then
    require_var "$APP_LICENSE_ENV_VAR" "add $APP_LICENSE_ENV_VAR to .env.local"
    resp=$(upm -X PUT -H "Content-Type: application/vnd.atl.plugins+json" \
      --data "{\"rawLicense\":\"${!APP_LICENSE_ENV_VAR}\"}" \
      "$BASE_URL/rest/plugins/1.0/$APP_KEY-key/license")
    case "$resp" in
      *'"valid":true'*) log "app licence applied and valid" ;;
      *) fail "app licence not accepted: $resp" "open $BASE_URL/plugins/servlet/upm/manage/user-installed" ;;
    esac
  fi
}

cmd_snapshot() {
  require_docker
  ct_exists "$APP_CT" || fail "no product container" "env/atl-env.sh $PROFILE start"
  mkdir -p "$SNAPSHOT_DIR"
  log "stopping product for a consistent snapshot"
  ct_running "$APP_CT" && docker stop -t 120 "$APP_CT" >/dev/null
  start_db
  docker exec "$DB_CT" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -f /tmp/snapshot.dump \
    || fail "pg_dump failed" "docker logs $DB_CT"
  docker cp "$DB_CT:/tmp/snapshot.dump" "$(hostpath "$SNAPSHOT_DIR/db.dump")" >/dev/null
  docker run --rm -v "$HOME_VOL:/data" -v "$(hostpath "$SNAPSHOT_DIR"):/backup" "$JAVA_IMAGE" \
    tar --exclude="./$LOG_SUBDIR" --exclude=./temp -C /data -czf /backup/home.tgz . \
    || fail "home dir archive failed" "docker volume inspect $HOME_VOL"
  date -u +%Y-%m-%dT%H:%M:%SZ > "$SNAPSHOT_DIR/created"
  log "snapshot saved in $SNAPSHOT_DIR"
  start_app
  wait_healthy
}

cmd_restore() {
  require_docker
  [ -f "$SNAPSHOT_DIR/db.dump" ] && [ -f "$SNAPSHOT_DIR/home.tgz" ] \
    || fail "no snapshot in $SNAPSHOT_DIR" "env/atl-env.sh $PROFILE up"
  cmd_configure
  ct_running "$APP_CT" && docker stop -t 120 "$APP_CT" >/dev/null
  start_db
  log "restoring database"
  docker cp "$(hostpath "$SNAPSHOT_DIR/db.dump")" "$DB_CT:/tmp/snapshot.dump" >/dev/null
  docker exec "$DB_CT" dropdb -U "$DB_USER" --if-exists "$DB_NAME"
  docker exec "$DB_CT" createdb -U "$DB_USER" "$DB_NAME"
  docker exec "$DB_CT" pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner /tmp/snapshot.dump \
    || fail "pg_restore failed" "docker logs $DB_CT"
  log "restoring home dir"
  docker run --rm -v "$HOME_VOL:/data" -v "$(hostpath "$SNAPSHOT_DIR"):/backup" "$JAVA_IMAGE" \
    sh -c 'find /data -mindepth 1 -maxdepth 1 ! -name '$LOG_SUBDIR' -exec rm -rf {} + && tar -C /data -xzf /backup/home.tgz' \
    || fail "home dir restore failed" "docker volume inspect $HOME_VOL"
  rm -rf "$LOGS_DIR" && mkdir -p "$LOGS_DIR"
  start_app
  wait_healthy
  log "restore complete (snapshot from $(cat "$SNAPSHOT_DIR/created" 2>/dev/null || echo unknown))"
}

cmd_up() {
  cmd_download
  cmd_install
  cmd_start
  if [ "$(product_state)" = "FIRST_RUN" ]; then cmd_setup; fi
  cmd_install_app
  cmd_snapshot
}

case "$COMMAND" in
  download)    cmd_download ;;
  install)     cmd_install ;;
  configure)   cmd_configure ;;
  start)       cmd_start ;;
  stop)        cmd_stop ;;
  status)      cmd_status ;;
  logs)        cmd_logs ;;
  reset)       cmd_reset ;;
  setup)       cmd_setup ;;
  install-app) cmd_install_app ;;
  snapshot)    cmd_snapshot ;;
  restore)     cmd_restore ;;
  up)          cmd_up ;;
  *)           usage ;;
esac
