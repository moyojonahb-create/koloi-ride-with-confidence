# Datadog RUM

This project uses Datadog Browser RUM.

## Configuration (Vite env vars)

Add these variables to your `.env` / hosting environment:

```bash
VITE_DD_RUM_ENABLED=true
VITE_DD_RUM_APPLICATION_ID=...
VITE_DD_RUM_CLIENT_TOKEN=...
VITE_DD_RUM_SITE=us5.datadoghq.com
VITE_DD_RUM_SERVICE=koloi
VITE_DD_RUM_ENV=production
VITE_DD_RUM_VERSION=1.0.0
```

The app intentionally requires `VITE_DD_RUM_ENABLED=true` so local/dev builds don't
send telemetry unless you explicitly turn it on.
