#!/usr/bin/env bash
#
# Install, update and run Logstyx on a single Docker host.
#
#   ./install.sh                   check the env file (asks only for what is missing), then deploy everything
#   ./install.sh auth core         deploy only these (gateway auth cache utility core)
#   ./install.sh configure         ask every question again (enter keeps the current value), do not deploy
#   ./install.sh status            show what is running and which colour is live
#   ./install.sh --force core      recreate even when the image and config did not change
#   ./install.sh rotate-key        new MASTER_KEY: re-encrypt every ENC_* value (a backup is kept), then redeploy
#   ./install.sh down              stop and remove every container (data volumes and settings are kept)
#   ./install.sh down --yes        the same, without asking first
#
# It also works straight from the web:  curl -fsSL https://raw.githubusercontent.com/devatlogstyx/logstyx/main/install.sh | bash
#
# The script only needs Docker, openssl and curl. It keeps its state in the directory it runs from:
#   .env.encrypted                 all settings; ENC_* values are encrypted with MASTER_KEY (chmod 600, back it up)
#                                  An existing file is read and kept: only missing settings are asked for.
#   gateway/include.d/             the gateway's live upstreams (blue/green)
#
# API services (auth, cache, utility, core) are deployed blue/green: the new colour starts next to the old one,
# must pass /health, the gateway switches to it, then the old one is removed. The gateway serves the dashboard
# at / and the API at /api/v1. It is recreated in place, so the site is down for a few seconds while it restarts.

set -euo pipefail

if [[ -n ${BASH_SOURCE[0]-} && -f ${BASH_SOURCE[0]} ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    SCRIPT_DIR="$(pwd)" # piped from curl
fi
ENV_FILE="${LOGSTYX_ENV_FILE:-$SCRIPT_DIR/.env.encrypted}"
INCLUDE_DIR="$SCRIPT_DIR/gateway/include.d"
NETWORK="logstyx"

# service -> port; order matters: everything reads from cache, core is last as it serves the SDK
API_SERVICES=(cache auth utility core)
declare -A PORTS=([auth]=5001 [cache]=5002 [utility]=5003 [core]=5004)
ALL_TARGETS=(cache auth utility core gateway)

# keys only this script uses; they are not passed to the containers
DEPLOY_ONLY_KEYS="REGISTRY|IMAGE_TAG|MONGO_MODE|RABBITMQ_MODE|REDIS_MODE|RABBITMQ_PASSWORD|BIND_ADDRESS|GATEWAY_PORT"
# set per container by this script (dev.sh adds local values of these to the env file)
CONTAINER_KEYS="PORT|AUTH_WSHOST|CACHE_WSHOST|UTILITY_WSHOST|CORE_WSHOST|MONGODB_HOST|AMQP_HOST|REDIS_URL"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

info() { echo -e "${BLUE}$*${NC}"; }
ok() { echo -e "${GREEN}✓ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠ $*${NC}"; }
die() { echo -e "${RED}✗ $*${NC}" >&2; exit 1; }
section() { echo -e "\n${BLUE}=== $* ===${NC}\n"; }

banner() {
    echo -e "${BLUE}"
    cat <<"EOF"
╦  ╔═╗╔═╗╔═╗╔╦╗╦ ╦═╗ ╦
║  ║ ║║ ╦╚═╗ ║ ╚╦╝╔╩╦╝
╩═╝╚═╝╚═╝╚═╝ ╩  ╩ ╩ ╚═
EOF
    echo -e "${NC}"
}

# ---------------------------------------------------------------------------
# terminal: answers come from the terminal, also when the script itself is piped in (curl | bash)
# ---------------------------------------------------------------------------

has_tty() { [[ ${LOGSTYX_ANSWERS_ON_STDIN-} == 1 ]] || { true </dev/tty; } 2>/dev/null; }

prompt() { # prompt VAR "text" [-s]
    local __var=$1 __text=$2 __silent=${3-} __value
    if [[ ${LOGSTYX_ANSWERS_ON_STDIN-} == 1 ]]; then
        read -r $__silent -p "$__text" __value
    else
        read -r $__silent -p "$__text" __value </dev/tty
    fi
    [[ -n $__silent ]] && echo
    printf -v "$__var" '%s' "$__value"
}

# ---------------------------------------------------------------------------
# env file
# ---------------------------------------------------------------------------

has_kv() { [[ -f "$ENV_FILE" ]] && grep -q "^$1=" "$ENV_FILE"; }
get_kv() { if has_kv "$1"; then grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2-; fi; }

set_kv() {
    local key=$1 value=$2 tmp
    touch "$ENV_FILE" && chmod 600 "$ENV_FILE"
    tmp=$(mktemp "$ENV_FILE.XXXXXX")
    if has_kv "$key"; then
        KEY="$key" VALUE="$value" awk -F= '$1 == ENVIRON["KEY"] { print ENVIRON["KEY"] "=" ENVIRON["VALUE"]; next } { print }' "$ENV_FILE" >"$tmp"
    else
        cat "$ENV_FILE" >"$tmp"
        # the old installer did not end the file with a newline
        [[ -s $tmp && $(tail -c1 "$tmp" | od -An -tx1 | tr -d ' ') != 0a ]] && echo >>"$tmp"
        printf '%s=%s\n' "$key" "$value" >>"$tmp"
    fi
    chmod 600 "$tmp" && mv "$tmp" "$ENV_FILE"
}

del_kv() {
    local tmp
    has_kv "$1" || return 0
    tmp=$(mktemp "$ENV_FILE.XXXXXX")
    KEY="$1" awk -F= '$1 != ENVIRON["KEY"]' "$ENV_FILE" >"$tmp"
    chmod 600 "$tmp" && mv "$tmp" "$ENV_FILE"
}

# set only when the key is not in the file yet
ensure_kv() { has_kv "$1" || set_kv "$1" "$2"; }

random_secret() { openssl rand -hex 16; } # 32 chars = the 32 byte keys AES-256 needs

to_hex() { od -An -v -tx1 | tr -d ' \n'; }

# same format as common/function/encryptor.js: aes-256-ctr, `ivHex:contentHex`
encrypt_with() { # encrypt_with MASTER_KEY VALUE
    local key_hex iv
    key_hex=$(printf '%s' "$1" | to_hex)
    iv=$(openssl rand -hex 16)
    printf '%s:%s' "$iv" "$(printf '%s' "$2" | openssl enc -aes-256-ctr -K "$key_hex" -iv "$iv" | to_hex)"
}

decrypt_with() { # decrypt_with MASTER_KEY IV:CONTENT
    local key_hex iv=${2%%:*} content=${2#*:}
    key_hex=$(printf '%s' "$1" | to_hex)
    printf '%b' "$(printf '%s' "$content" | sed 's/../\\x&/g')" | openssl enc -d -aes-256-ctr -K "$key_hex" -iv "$iv"
}

encrypt() { encrypt_with "$(get_kv MASTER_KEY)" "$1"; }
decrypt() { decrypt_with "$(get_kv MASTER_KEY)" "$1"; }

require_tty() {
    # LOGSTYX_ANSWERS_ON_STDIN=1 lets you pipe answers in, e.g. for a scripted first install
    has_tty || die "$1 is not set in $ENV_FILE and there is no terminal to ask. Run ./install.sh interactively once."
}

# ask KEY "question" [default] [flags]
#   flags: required secret encrypt url urls bool number
# A key already in the file is not asked again (unless it is required and empty, or on ./install.sh configure).
ask() {
    local key=$1 question=$2 default=${3-} flags=${4-}
    local exists=0 current="" value hint

    if has_kv "$key"; then
        exists=1
        current=$(get_kv "$key")
        if [[ $RECONFIGURE != 1 ]] && [[ -n $current || $flags != *required* ]]; then
            return 0
        fi
    fi

    # a new setting with a default (or an optional one) and nobody to ask: take the default rather than stop an
    # unattended update
    if ! has_tty && [[ $exists == 0 ]] && [[ -n $default || $flags != *required* ]]; then
        [[ -n $default && $flags == *encrypt* ]] && default=$(encrypt "$default")
        set_kv "$key" "$default"
        warn "$key was not set; using the default (change it with ./install.sh configure)"
        return 0
    fi
    require_tty "$key"

    # an encrypted or secret value cannot be shown, so offer to keep it instead
    if [[ $exists == 1 && -n $current && ($flags == *secret* || $flags == *encrypt*) ]]; then
        hint=" [enter = keep current]"
        [[ $flags != *required* ]] && hint=" [enter = keep current, - = clear]"
    elif [[ $exists == 1 && -n $current ]]; then
        default=$current
        hint=" [$default]"
        [[ $flags != *required* ]] && hint=" [$default, - = clear]"
    else
        hint=${default:+ [$default]}
    fi

    while true; do
        if [[ $flags == *secret* ]]; then
            prompt value "  $question$hint: " -s
        else
            prompt value "  $question$hint: "
        fi

        if [[ $value == "-" && $flags != *required* ]]; then
            set_kv "$key" ""
            return 0
        fi
        if [[ -z $value && $exists == 1 && -n $current && ($flags == *secret* || $flags == *encrypt*) ]]; then
            return 0
        fi
        value=${value:-$default}

        if [[ -z $value ]]; then
            if [[ $flags == *required* ]]; then
                echo -e "  ${RED}required${NC}"
                continue
            fi
            break
        fi
        if [[ $flags == *urls* ]]; then
            local url bad=0
            value=$(echo "$value" | tr -d ' ')
            IFS=',' read -ra urls <<<"$value"
            for url in "${urls[@]}"; do
                [[ $url =~ ^https?://[^[:space:]/]+$ ]] || bad=1
            done
            if [[ $bad == 1 ]]; then
                echo -e "  ${RED}comma separated origins like https://app.example.com:3000 (protocol, domain, optional port, no path)${NC}"
                continue
            fi
        elif [[ $flags == *url* && ! $value =~ ^https?://[^[:space:]]+$ ]]; then
            echo -e "  ${RED}must start with http:// or https://${NC}"
            continue
        fi
        if [[ $flags == *bool* && ! $value =~ ^(true|false)$ ]]; then
            echo -e "  ${RED}true or false${NC}"
            continue
        fi
        if [[ $flags == *number* && ! $value =~ ^[0-9]+$ ]]; then
            echo -e "  ${RED}must be a number${NC}"
            continue
        fi
        break
    done

    if [[ -n $value && $flags == *encrypt* ]]; then
        value=$(encrypt "$value")
    fi
    set_kv "$key" "$value"
}

# generated once and never replaced: changing them breaks logins and encrypted data
ensure_generated_secret() {
    if [[ -z $(get_kv "$1") ]]; then
        set_kv "$1" "$(encrypt "$(random_secret)")"
        ok "generated $1"
    fi
}

# choose KEY URL_KEY "what" default "value:label"...
# Asked once (or again on ./install.sh configure). Switching clears URL_KEY, so the old URL is not reused.
choose() {
    local key=$1 url_key=$2 what=$3 default=$4
    shift 4
    local current
    current=$(get_kv "$key")
    if [[ -n $current && $RECONFIGURE != 1 ]]; then
        return 0
    fi
    if [[ -z $current ]] && ! has_tty; then
        set_kv "$key" "$default"
        warn "$key was not set; using $default (change it with ./install.sh configure)"
        return 0
    fi
    [[ -n $current ]] && default=$current

    echo "  $what:"
    local i=1 default_n=1 opt
    for opt in "$@"; do
        echo "    $i) ${opt#*:}"
        [[ ${opt%%:*} == "$default" ]] && default_n=$i
        i=$((i + 1))
    done

    local choice
    while true; do
        prompt choice "  Choice [$default_n]: "
        choice=${choice:-$default_n}
        if [[ $choice =~ ^[0-9]+$ ]] && ((choice >= 1 && choice <= $#)); then
            break
        fi
    done

    local picked=${!choice}
    picked=${picked%%:*}
    if [[ -n $current && $picked != "$current" ]]; then
        del_kv "$url_key"
    fi
    set_kv "$key" "$picked"
}

# A file from the old installer has the secrets but no *_MODE keys: an ENC_ URL in it meant an external
# server, none meant the bundled container. Keep that choice instead of asking again.
adopt_legacy_modes() {
    has_kv ENC_CRYPTO_SECRET || return 0
    if ! has_kv MONGO_MODE; then
        if [[ -n $(get_kv ENC_MONGODB_HOST) ]]; then set_kv MONGO_MODE url; else set_kv MONGO_MODE container; fi
        ok "MongoDB: kept $(get_kv MONGO_MODE) from the existing file"
    fi
    if ! has_kv RABBITMQ_MODE; then
        if [[ -n $(get_kv ENC_AMQP_HOST) ]]; then set_kv RABBITMQ_MODE url; else set_kv RABBITMQ_MODE container; fi
        ok "RabbitMQ: kept $(get_kv RABBITMQ_MODE) from the existing file"
    fi
    if ! has_kv REDIS_MODE; then
        if [[ -n $(get_kv ENC_REDIS_URL) ]]; then set_kv REDIS_MODE url; else set_kv REDIS_MODE container; fi
        ok "Redis: kept $(get_kv REDIS_MODE) from the existing file"
    fi
}

configure() {
    local new_file=0
    [[ -f $ENV_FILE ]] || new_file=1

    if [[ $new_file == 1 ]]; then
        require_tty "the configuration"
        section "First run: creating $(basename "$ENV_FILE")"
        echo "Answer a few questions; everything is saved to $ENV_FILE."
        echo "Secrets are encrypted with a MASTER_KEY generated here. Keep the file safe and backed up."
    else
        info "Using the settings in $ENV_FILE (only missing ones are asked for)"
    fi

    if [[ -z $(get_kv MASTER_KEY) ]]; then
        if [[ -f $ENV_FILE ]] && grep -Eq '^ENC_[A-Z0-9_]+=.+' "$ENV_FILE"; then
            die "MASTER_KEY is missing but $ENV_FILE has encrypted values. Restore it from your backup."
        fi
        set_kv MASTER_KEY "$(random_secret)"
        ok "generated MASTER_KEY"
    fi
    local master_key
    master_key=$(get_kv MASTER_KEY)
    [[ ${#master_key} == 32 ]] || die "MASTER_KEY in $ENV_FILE must be exactly 32 characters"

    local before
    before=$(sha256sum "$ENV_FILE" | cut -d' ' -f1)

    section "General"
    ask ENC_SELF_PROJECT_TITLE "Project title (Logstyx logs its own services into this project)" "My Logstyx Project" "required encrypt"
    ask ENC_ALLOWED_ORIGIN "Extra CORS origins, comma separated, e.g. https://app.example.com:3000 (empty = none)" "" "urls encrypt"
    ask BIND_ADDRESS "Host address to publish the site on (127.0.0.1 if a proxy on this host terminates TLS)" "0.0.0.0" "required"
    ask GATEWAY_PORT "Host port for the site (dashboard + /api)" "5000" "required number"
    ask REGISTRY "Docker image namespace" "devatlogstyx" "required"
    ask IMAGE_TAG "Image tag" "latest" "required"

    section "Database and queues"
    adopt_legacy_modes

    choose MONGO_MODE ENC_MONGODB_HOST "MongoDB" container \
        "container:Run it here as a container (single-node replica set)" \
        "url:Use an existing server (e.g. MongoDB Atlas)"
    if [[ $(get_kv MONGO_MODE) == container ]]; then
        # mongo must stay a bare host: services append /<DbName> themselves
        [[ -n $(get_kv ENC_MONGODB_HOST) ]] || set_kv ENC_MONGODB_HOST "$(encrypt "mongodb://logstyx_mongodb:27017")"
        ok "MongoDB: container logstyx_mongodb"
    else
        echo "  It must be a replica set (transactions). Give the server only, no /database."
        ask ENC_MONGODB_HOST "MongoDB URL, e.g. mongodb+srv://user:pass@cluster.example.net" "" "required secret encrypt"
        ok "MongoDB: external URL"
    fi

    choose RABBITMQ_MODE ENC_AMQP_HOST "RabbitMQ" container \
        "container:Run it here as a container" \
        "url:Use an existing server (e.g. Amazon MQ)"
    if [[ $(get_kv RABBITMQ_MODE) == container ]]; then
        if [[ -z $(get_kv ENC_AMQP_HOST) ]]; then
            if exists logstyx_rabbitmq; then
                # started by the old docker compose setup, with the image's default user
                set_kv ENC_AMQP_HOST "$(encrypt "amqp://logstyx_rabbitmq:5672")"
            else
                [[ -n $(get_kv RABBITMQ_PASSWORD) ]] || set_kv RABBITMQ_PASSWORD "$(random_secret)"
                set_kv ENC_AMQP_HOST "$(encrypt "amqp://logstyx:$(get_kv RABBITMQ_PASSWORD)@logstyx_rabbitmq:5672")"
            fi
        fi
        ok "RabbitMQ: container logstyx_rabbitmq"
    else
        ask ENC_AMQP_HOST "RabbitMQ URL, e.g. amqps://user:pass@host:5671" "" "required secret encrypt"
        ok "RabbitMQ: external URL"
    fi

    choose REDIS_MODE ENC_REDIS_URL "Redis (cache)" container \
        "container:Run it here as a container" \
        "url:Use an existing server (e.g. ElastiCache)" \
        "memory:None, cache in memory (fine for a single host)"
    case $(get_kv REDIS_MODE) in
    container)
        [[ -n $(get_kv ENC_REDIS_URL) ]] || set_kv ENC_REDIS_URL "$(encrypt "redis://logstyx_redis:6379")"
        ok "Redis: container logstyx_redis"
        ;;
    url)
        ask ENC_REDIS_URL "Redis URL, e.g. rediss://user:pass@host:6379" "" "required secret encrypt"
        ok "Redis: external URL"
        ;;
    memory)
        set_kv ENC_REDIS_URL ""
        ok "Redis: none, in-memory cache"
        ;;
    esac

    section "Security"
    ensure_generated_secret ENC_CRYPTO_SECRET
    ensure_generated_secret ENC_USER_AUTHENTICATION_JWT_SECRET
    ensure_generated_secret ENC_REFRESH_TOKEN_SECRET
    ok "CRYPTO, JWT and refresh token secrets are set (never regenerated)"
    echo "  Every user can turn on two-factor authentication (an authenticator app) in their profile."
    ask MFA_REQUIRED "Require two-factor authentication for every user (true/false)" "false" "required bool"

    if [[ $new_file == 1 || $before != "$(sha256sum "$ENV_FILE" | cut -d' ' -f1)" ]]; then
        ok "saved $ENV_FILE"
        if [[ $new_file == 1 ]]; then
            warn "Back up $ENV_FILE: without its MASTER_KEY and secrets the data cannot be decrypted."
        fi
    else
        ok "$(basename "$ENV_FILE") is complete"
    fi
}

# New MASTER_KEY: every ENC_* value is decrypted with the old key and encrypted with the new one.
rotate_key() {
    [[ -f $ENV_FILE ]] || die "$ENV_FILE does not exist; run ./install.sh first"
    local old_key new_key backup line key value
    old_key=$(get_kv MASTER_KEY)
    [[ ${#old_key} == 32 ]] || die "MASTER_KEY in $ENV_FILE is missing or not 32 characters"

    if [[ $ASSUME_YES != 1 ]]; then
        require_tty "a confirmation"
        local answer
        prompt answer "Re-encrypt $(basename "$ENV_FILE") with a new MASTER_KEY? Type 'rotate' to continue: "
        [[ $answer == rotate ]] || die "cancelled"
    fi

    section "Master key rotation"
    backup="$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    (umask 077 && cp "$ENV_FILE" "$backup")
    ok "backup: $backup"

    new_key=$(random_secret)
    local tmp
    tmp=$(mktemp "$ENV_FILE.XXXXXX")
    while IFS= read -r line || [[ -n $line ]]; do
        key=${line%%=*}
        value=${line#*=}
        if [[ $key == MASTER_KEY ]]; then
            echo "MASTER_KEY=$new_key"
        elif [[ $key == ENC_* && -n $value && $line == *=* ]]; then
            echo "$key=$(encrypt_with "$new_key" "$(decrypt_with "$old_key" "$value")")"
            echo -e "  re-encrypted ${BLUE}$key${NC}" >&2
        else
            echo "$line"
        fi
    done <"$backup" >"$tmp"
    chmod 600 "$tmp" && mv "$tmp" "$ENV_FILE"

    ok "MASTER_KEY rotated. Keep $(basename "$backup") until the new key is verified, then delete it."
}

# ---------------------------------------------------------------------------
# docker helpers
# ---------------------------------------------------------------------------

is_running() { [[ $(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null) == true ]]; }
exists() { docker inspect "$1" >/dev/null 2>&1; }
image_of() { echo "$(get_kv REGISTRY)/logstyx-$1-service:$(get_kv IMAGE_TAG)"; }

# what a container was started with, so unchanged deploys can be skipped
config_hash() { cat "$APP_ENV" <(echo "$*") | sha256sum | cut -c1-16; }

is_up_to_date() {
    local name=$1 image=$2 hash=$3
    [[ $FORCE == 1 ]] && return 1
    is_running "$name" || return 1
    [[ $(docker inspect -f '{{.Image}}' "$name") == $(docker image inspect -f '{{.Id}}' "$image") ]] || return 1
    [[ $(docker inspect -f '{{index .Config.Labels "logstyx.config"}}' "$name") == "$hash" ]]
}

# large images take minutes on a first pull; a stalled registry should not hang the install forever
PULL_TIMEOUT=${LOGSTYX_PULL_TIMEOUT:-1200}

pull() {
    local image=$1 status=0
    echo -e "  pulling ${DIM}$image${NC}"

    # docker's own progress bars on a terminal; quiet when piped (CI, logs)
    local quiet=()
    [[ -t 1 ]] || quiet=(-q)
    if command -v timeout >/dev/null; then
        timeout "$PULL_TIMEOUT" docker pull "${quiet[@]}" "$image" || status=$?
    else
        docker pull "${quiet[@]}" "$image" || status=$?
    fi

    if [[ $status == 124 ]]; then
        die "pulling $image took longer than ${PULL_TIMEOUT}s. Check the network and disk space (df -h /var/lib/docker), then run ./install.sh again (finished layers are kept). LOGSTYX_PULL_TIMEOUT=<seconds> changes the limit."
    elif [[ $status != 0 ]]; then
        die "could not pull $image. Check REGISTRY and IMAGE_TAG in $(basename "$ENV_FILE") (./install.sh configure)."
    fi
}

# wait until a command succeeds, while the container stays up
wait_for() {
    local name=$1 seconds=$2
    shift 2
    local start=$SECONDS
    while ((SECONDS - start < seconds)); do
        if ! is_running "$name"; then
            echo
            warn "$name stopped. Last log lines:"
            docker logs --tail 40 "$name" 2>&1 | sed 's/^/    /'
            return 1
        fi
        if "$@" >/dev/null 2>&1; then
            echo
            return 0
        fi
        printf '.'
        sleep 2
    done
    echo
    warn "$name is not healthy after ${seconds}s. Last log lines:"
    docker logs --tail 40 "$name" 2>&1 | sed 's/^/    /'
    return 1
}

http_ok() { # inside the container, any HTTP answer below 500
    docker exec "$1" node -e "fetch('http://127.0.0.1:$2$3').then(r => process.exit(r.status < 500 ? 0 : 1), () => process.exit(1))"
}

# ---------------------------------------------------------------------------
# infrastructure
# ---------------------------------------------------------------------------

ensure_network() {
    docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create "$NETWORK" >/dev/null
}

on_network() { docker inspect -f '{{json .NetworkSettings.Networks}}' "$1" | grep -q "\"$NETWORK\""; }

ensure_container() { # ensure_container NAME docker-run-args...
    local name=$1
    shift
    if exists "$name"; then
        # containers from the old docker compose setup keep their data; they only join this network
        on_network "$name" || docker network connect "$NETWORK" "$name"
        if is_running "$name"; then
            echo -e "  $name ${DIM}running${NC}"
        else
            docker start "$name" >/dev/null
            echo "  $name started"
        fi
    else
        docker run -d --name "$name" --network "$NETWORK" --restart unless-stopped "$@" >/dev/null
        echo "  $name created"
    fi
}

deploy_infra() {
    section "Infrastructure"
    ensure_network
    if [[ $(get_kv MONGO_MODE) == container ]]; then
        ensure_container logstyx_mongodb -v logstyx-mongo-data:/data/db mongo:7 --replSet rs0 --bind_ip_all
    else
        echo -e "  MongoDB ${DIM}external URL${NC}"
        not_used logstyx_mongodb
    fi
    if [[ $(get_kv RABBITMQ_MODE) == container ]]; then
        ensure_container logstyx_rabbitmq --hostname logstyx_rabbitmq -v logstyx-rabbitmq-data:/var/lib/rabbitmq \
            -e RABBITMQ_DEFAULT_USER=logstyx -e "RABBITMQ_DEFAULT_PASS=$(get_kv RABBITMQ_PASSWORD)" rabbitmq:3-management
    else
        echo -e "  RabbitMQ ${DIM}external URL${NC}"
        not_used logstyx_rabbitmq
    fi
    case $(get_kv REDIS_MODE) in
    container) ensure_container logstyx_redis -v logstyx-redis-data:/data redis:7-alpine redis-server --appendonly yes ;;
    url)
        echo -e "  Redis ${DIM}external URL${NC}"
        not_used logstyx_redis
        ;;
    *)
        echo -e "  Redis ${DIM}none, in-memory cache${NC}"
        not_used logstyx_redis
        ;;
    esac

    if [[ $(get_kv MONGO_MODE) == container ]]; then
        printf '  waiting for the MongoDB replica set'
        wait_for logstyx_mongodb 120 docker exec logstyx_mongodb mongosh --quiet --eval "
            try { rs.status().ok } catch (e) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'logstyx_mongodb:27017' }] }) }
            if (!db.hello().isWritablePrimary) quit(1)" || die "MongoDB did not become ready"
    fi
    if [[ $(get_kv RABBITMQ_MODE) == container ]]; then
        printf '  waiting for RabbitMQ'
        wait_for logstyx_rabbitmq 120 docker exec logstyx_rabbitmq rabbitmq-diagnostics -q check_running || die "RabbitMQ did not become ready"
    fi
    ok "infrastructure ready"
}

# a container left over after switching to a URL is not removed automatically: it may hold data
not_used() {
    if exists "$1"; then
        warn "$1 is no longer used. Remove it once its data is migrated: docker rm -f $1 (its data volume is kept)"
    fi
}

# ---------------------------------------------------------------------------
# gateway upstreams (blue/green)
# ---------------------------------------------------------------------------

# the gateway image includes auth_service.conf, core_service.conf and utility_service.conf; cache_service.conf
# is not routed by nginx, it only records cache's live colour
upstream_file() { echo "$INCLUDE_DIR/$1_service.conf"; }

write_upstream() { # write_upstream SERVICE COLOUR
    cat >"$(upstream_file "$1")" <<EOF
upstream $1_service_http {
    server logstyx_$1_service_$2:${PORTS[$1]};
    keepalive 256;
}
EOF
}

live_colour() { grep -oE 'service_(blue|green)' "$(upstream_file "$1")" | cut -d_ -f2; }

ensure_upstreams() {
    mkdir -p "$INCLUDE_DIR"
    local svc
    for svc in "${API_SERVICES[@]}"; do
        [[ -f $(upstream_file "$svc") ]] || write_upstream "$svc" green
    done
}

reload_gateway() {
    is_running logstyx_gateway || return 0
    docker exec logstyx_gateway nginx -t >/dev/null 2>&1 && docker exec logstyx_gateway nginx -s reload >/dev/null 2>&1
}

# ---------------------------------------------------------------------------
# deploys
# ---------------------------------------------------------------------------

deploy_api() {
    local svc=$1 port=${PORTS[$1]}
    local image old new name hash
    image=$(image_of "$svc")
    old=$(live_colour "$svc")
    pull "$image"

    local env_args=(
        -e "PORT=$port"
        -e "CACHE_WSHOST=ws://logstyx-cache:5002/rpc"
        -e "AUTH_WSHOST=ws://logstyx-auth:5001/rpc"
        -e "UTILITY_WSHOST=ws://logstyx-utility:5003/rpc"
        -e "CORE_WSHOST=ws://logstyx-core:5004/rpc"
    )
    hash=$(config_hash "${env_args[@]}")

    if is_up_to_date "logstyx_${svc}_service_$old" "$image" "$hash"; then
        ok "$svc is up to date ($old)"
        RESULTS+=("[--] $svc  unchanged, $old")
        return 0
    fi

    new=blue
    [[ $old == blue ]] && new=green
    name="logstyx_${svc}_service_$new"
    exists "$name" && docker rm -f "$name" >/dev/null

    echo "  starting $name"
    docker run -d --name "$name" --network "$NETWORK" --network-alias "logstyx-$svc" --restart unless-stopped \
        --env-file "$APP_ENV" "${env_args[@]}" --label "logstyx.config=$hash" \
        --log-opt max-size=20m --log-opt max-file=5 \
        "$image" >/dev/null

    printf '  waiting for /health'
    if ! wait_for "$name" 120 http_ok "$name" "$port" /health; then
        docker rm -f "$name" >/dev/null
        die "$svc failed its health check; $old is still live"
    fi

    write_upstream "$svc" "$new"
    if is_running logstyx_gateway && ! reload_gateway; then
        write_upstream "$svc" "$old"
        reload_gateway || true
        docker rm -f "$name" >/dev/null
        die "the gateway rejected the switch to $new; $old is still live"
    fi
    echo "  now serving $svc from $new"

    local change="new, $new"
    if exists "logstyx_${svc}_service_$old"; then
        sleep 5 # let in-flight requests on the old colour finish
        docker stop -t 30 "logstyx_${svc}_service_$old" >/dev/null
        docker rm "logstyx_${svc}_service_$old" >/dev/null
        echo "  removed logstyx_${svc}_service_$old"
        change="$old -> $new"
    fi
    ok "$svc deployed ($change)"
    RESULTS+=("[OK] $svc  $change")
}

publish_host() {
    local bind
    bind=$(get_kv BIND_ADDRESS)
    [[ $bind == 0.0.0.0 ]] && bind=127.0.0.1
    echo "$bind"
}

# the stateless containers of the old docker compose setup; the new ones replace them
LEGACY_APP_CONTAINERS=(logstyx_gateway_service logstyx_auth_service logstyx_cache_service logstyx_utility_service logstyx_core_service)

remove_legacy_apps() {
    local name
    for name in "${LEGACY_APP_CONTAINERS[@]}"; do
        if exists "$name"; then
            docker rm -f "$name" >/dev/null
            echo "  removed $name (from the old docker compose setup)"
        fi
    done
}

deploy_gateway() {
    local image hash svc
    image=$(image_of gateway)
    pull "$image"

    for svc in "${API_SERVICES[@]}"; do
        is_running "logstyx_${svc}_service_$(live_colour "$svc")" || die "deploy $svc before the gateway (nginx needs every upstream running)"
    done

    local args=(-p "$(get_kv BIND_ADDRESS):$(get_kv GATEWAY_PORT):80" -v "$INCLUDE_DIR:/etc/nginx/include.d:ro")
    # nginx reads nothing from the env file, so only the port and mount decide whether to recreate it
    hash=$(echo "${args[@]}" | sha256sum | cut -c1-16)
    if is_up_to_date logstyx_gateway "$image" "$hash"; then
        ok "gateway is up to date"
        RESULTS+=("[--] gateway  unchanged")
        return 0
    fi

    # the old compose gateway holds the port
    remove_legacy_apps
    exists logstyx_gateway && docker rm -f logstyx_gateway >/dev/null
    docker run -d --name logstyx_gateway --network "$NETWORK" --restart unless-stopped "${args[@]}" \
        --label "logstyx.config=$hash" --log-opt max-size=20m --log-opt max-file=5 "$image" >/dev/null

    printf '  waiting for the site'
    local site="http://$(publish_host):$(get_kv GATEWAY_PORT)"
    wait_for logstyx_gateway 60 curl -fsS "$site/" || die "the gateway did not start"
    curl -fsS "$site/" | grep -q '<div id="root">' || die "the gateway is up but does not serve the dashboard"
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' "$site/api/v1/users/me" || true)
    [[ $code =~ ^[1-4][0-9][0-9]$ ]] || die "the gateway is up but /api/v1 does not reach auth-service (HTTP $code)"
    ok "gateway deployed on $(get_kv BIND_ADDRESS):$(get_kv GATEWAY_PORT) (dashboard + /api/v1)"
    RESULTS+=("[OK] gateway  recreated")
}

status() {
    section "Containers"
    docker ps -a --filter "network=$NETWORK" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null ||
        docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep -E 'NAMES|logstyx'
    if [[ -d $INCLUDE_DIR ]]; then
        section "Live colours"
        local svc
        for svc in "${API_SERVICES[@]}"; do
            [[ -f $(upstream_file "$svc") ]] && echo "  $svc: $(live_colour "$svc")"
        done
    fi
}

# Stop and remove everything, gateway first so traffic stops before the services do.
# Data volumes, the env file and gateway/include.d are kept: ./install.sh brings it all back with the same data.
down() {
    local names=(logstyx_gateway "${LEGACY_APP_CONTAINERS[@]}")
    local svc colour name
    for svc in "${API_SERVICES[@]}"; do
        for colour in blue green; do names+=("logstyx_${svc}_service_$colour"); done
    done
    names+=(logstyx_rabbitmq logstyx_redis logstyx_mongodb)

    local present=()
    for name in "${names[@]}"; do
        exists "$name" && present+=("$name")
    done

    if [[ ${#present[@]} == 0 ]]; then
        ok "nothing is running"
    else
        if [[ $ASSUME_YES != 1 ]]; then
            has_tty || die "run with --yes to take everything down without a prompt"
            echo "This stops and removes: ${present[*]}"
            echo "The site and API go offline. Data volumes and $(basename "$ENV_FILE") are kept."
            local answer
            prompt answer "Type 'down' to continue: "
            [[ $answer == down ]] || die "cancelled"
        fi

        section "Taking Logstyx down"
        for name in "${present[@]}"; do
            docker stop -t 30 "$name" >/dev/null 2>&1 || true
            docker rm -f "$name" >/dev/null
            echo "  removed $name"
        done
    fi

    if docker network inspect "$NETWORK" >/dev/null 2>&1; then
        docker network rm "$NETWORK" >/dev/null 2>&1 && echo "  removed network $NETWORK" ||
            warn "network $NETWORK is still used by other containers, left in place"
    fi

    ok "down. Data volumes are kept: docker volume ls | grep -E 'logstyx|mongo|rabbitmq|redis'"
    echo "  Start again with: ./install.sh"
}

preflight() {
    command -v docker >/dev/null || die "Docker is not installed: https://docs.docker.com/get-docker/"
    docker info >/dev/null 2>&1 || die "cannot talk to Docker. Start it, or add yourself to the docker group: sudo usermod -aG docker \$USER (then log in again)"
    command -v openssl >/dev/null || die "openssl is not installed"
    command -v curl >/dev/null || die "curl is not installed"
}

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

RECONFIGURE=0
FORCE=0
ASSUME_YES=0
COMMAND=deploy
TARGETS=()
for arg in "$@"; do
    case $arg in
    configure) COMMAND=configure ;;
    status) COMMAND=status ;;
    down) COMMAND=down ;;
    rotate-key) COMMAND=rotate-key ;;
    --yes | -y) ASSUME_YES=1 ;;
    --force | -f) FORCE=1 ;;
    -h | --help)
        [[ -f ${BASH_SOURCE[0]-} ]] && sed -n '3,/^$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
        exit 0
        ;;
    gateway | auth | cache | utility | core) TARGETS+=("$arg") ;;
    *-service) TARGETS+=("${arg%-service}") ;;
    dashboard | frontend) TARGETS+=(gateway) ;; # the dashboard ships inside the gateway image
    *) die "unknown argument '$arg' (try --help)" ;;
    esac
done

banner

if [[ $COMMAND == configure ]]; then
    # only writes the env file (dev.sh uses it too), so Docker is not needed
    command -v openssl >/dev/null || die "openssl is not installed"
    # re-ask everything on a terminal; without one only fill in what is missing
    RECONFIGURE=1
    [[ -f $ENV_FILE ]] && has_tty || RECONFIGURE=0
    configure
    exit 0
fi

preflight

if [[ $COMMAND == status ]]; then
    status
    exit 0
fi

# one install at a time
if command -v flock >/dev/null; then
    exec 9>"$SCRIPT_DIR/.install.lock"
    flock -n 9 || die "another install is running"
fi

if [[ $COMMAND == down ]]; then
    [[ ${#TARGETS[@]} == 0 ]] || die "down takes everything down; to restart one service use ./install.sh --force <service>"
    down
    exit 0
fi

if [[ $COMMAND == rotate-key ]]; then
    rotate_key
    info "Redeploying so the services get the new key"
fi

configure

# the containers get the app settings only
APP_ENV=$(mktemp)
trap 'rm -f "$APP_ENV"' EXIT
grep -Ev "^(${DEPLOY_ONLY_KEYS}|${CONTAINER_KEYS})=" "$ENV_FILE" | grep -E '^[A-Z0-9_]+=' >"$APP_ENV" || true

ensure_upstreams
deploy_infra

# keep the dependency order whatever order the targets were given in
[[ ${#TARGETS[@]} == 0 ]] && TARGETS=("${ALL_TARGETS[@]}")
QUEUE=()
for t in "${ALL_TARGETS[@]}"; do
    [[ " ${TARGETS[*]} " == *" $t "* ]] && QUEUE+=("$t")
done

RESULTS=()
START_ALL=$SECONDS
step=0
for t in "${QUEUE[@]}"; do
    step=$((step + 1))
    section "[$step/${#QUEUE[@]}] $t"
    start=$SECONDS
    case $t in
    gateway) deploy_gateway ;;
    *) deploy_api "$t" ;;
    esac
    RESULTS[${#RESULTS[@]} - 1]="${RESULTS[${#RESULTS[@]} - 1]}  ($((SECONDS - start))s)"
done

docker image prune -f >/dev/null 2>&1 || true

echo
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN} Deployed in $((SECONDS - START_ALL))s${NC}"
echo -e "${GREEN}============================================================${NC}"
for line in "${RESULTS[@]}"; do echo "  $line"; done
echo
echo -e "  Site:      http://$(publish_host):$(get_kv GATEWAY_PORT)  (API at /api/v1)"
echo -e "  Settings:  $ENV_FILE  ${YELLOW}(back it up: it holds the MASTER_KEY)${NC}"
echo -e "  First visit: create your admin account, then turn on two-factor authentication in your profile."
