#!/bin/bash
set -a
source /var/www/content-agents/.env
set +a
# litellm is installed as a CLI in /usr/local/bin or similar.
# Can run directly as 'litellm'
litellm --config /var/www/litellm_config.yaml --port 4000
