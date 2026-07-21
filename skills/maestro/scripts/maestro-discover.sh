#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

HELP_MESSAGE="Usage: maestro-discover.sh [--port <p>] [--max-port <p>] [--per-port-timeout <s>] [-h/--help]

  Probe for a running Maestro server and print its port on stdout.
  Scans ports from --port through --max-port (inclusive) and returns the
  first one that responds to GET /api/plans with a JSON array.

  Use this before starting a new server so an existing session is reused
  instead of clobbered or duplicated.

  --port <p>                First port to probe (default: 8080)
  --max-port <p>            Last port to probe (default: 8089)
  --per-port-timeout <s>    curl --max-time per probe in seconds (default: 0.3)
  -h, --help                Show this help message

Exit codes:
  0 - A live Maestro server was found; its port is on stdout
  1 - No server found in the scanned range"

port=8080
max_port=8089
per_port_timeout=0.3

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --port)
      port=$2
      shift 2
      ;;

    --max-port)
      max_port=$2
      shift 2
      ;;

    --per-port-timeout)
      per_port_timeout=$2
      shift 2
      ;;

    -h | --help)
      echo "$HELP_MESSAGE"
      exit 0
      ;;

    *)
      echo "Unknown parameter passed: $1"
      echo "$HELP_MESSAGE"
      exit 1
      ;;
  esac
done

if [[ "$max_port" -lt "$port" ]]; then
  echo "Error: --max-port ($max_port) must be >= --port ($port)" >&2
  echo "$HELP_MESSAGE"
  exit 1
fi

# Probe each port; a Maestro server returns a JSON array from GET /api/plans.
# Read only the first byte so a large plan list cannot stall the probe.
for ((p = port; p <= max_port; p++)); do
  first=$(curl -s --max-time "$per_port_timeout" "http://localhost:$p/api/plans" 2>/dev/null | head -c1)
  if [[ "$first" == "[" ]]; then
    echo "$p"
    exit 0
  fi
done

exit 1
