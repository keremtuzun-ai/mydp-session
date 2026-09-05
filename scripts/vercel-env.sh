#!/usr/bin/env bash
# Push the app's environment from .env.local to a linked Vercel project.
# Usage: scripts/vercel-env.sh [production|preview|development] (default: production)
# Reads values from .env.local; NEXT_PUBLIC_SITE_URL is taken from SITE_URL if set.
set -euo pipefail
target="${1:-production}"
[ -f .env.local ] || { echo ".env.local not found" >&2; exit 1; }
vars=(NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY ALLOWED_SCHOOL_DOMAINS NEXT_PUBLIC_APP_NAME NEXT_PUBLIC_SCHOOL_NAME MAX_UPLOAD_BYTES NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_TIMEZONE EXEC_INVITE_TOKEN EXEC_SHARED_PASSWORD NEXT_PUBLIC_EXEC_ORIGIN)
for name in "${vars[@]}"; do
  value="$(grep -E "^${name}=" .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
  if [ "$name" = "NEXT_PUBLIC_SITE_URL" ] && [ -n "${SITE_URL:-}" ]; then value="$SITE_URL"; fi
  [ -n "$value" ] || { echo "skip $name (empty)"; continue; }
  npx vercel env rm "$name" "$target" --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | npx vercel env add "$name" "$target" >/dev/null
  echo "set $name ($target)"
done
