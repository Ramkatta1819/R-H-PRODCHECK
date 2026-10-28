#!/bin/bash

# Activate virtual environment
source "/home/user/ERPS - Copy 19/venv/bin/activate"

# Change to backend directory
cd "/home/user/ERPS - Copy 19/backend"

# ──────────────────────────────────────────────────────────────────────────────
# Gunicorn startup — tuned for concurrent load (TGS sync + live HCM users)
#
# --workers   : (2 × CPU cores) + 1  → change '9' if server has different cores
# --threads   : 4 threads per worker → handles bursts without extra processes
# --backlog   : max queued connections before refusing new ones
# --timeout   : kill worker if no response in 120s (avoids silent hangs)
# --graceful-timeout : give in-flight requests 30s to finish before restart
# --keep-alive: reuse connections from nginx/TGS proxy (avoids TCP overhead)
# --access-logfile / --error-logfile : logs for debugging 504s and slow reqs
# ──────────────────────────────────────────────────────────────────────────────
exec gunicorn config.wsgi:application \
    --bind 127.0.0.1:8001 \
    --workers 9 \
    --threads 4 \
    --backlog 2048 \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --access-logfile /var/log/hcm_gunicorn_access.log \
    --error-logfile /var/log/hcm_gunicorn_error.log \
    --log-level warning

