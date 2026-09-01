# Security Policy

## Supported versions

Use the latest `main` of this repository. There are no numbered LTS lines yet.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Preferred path:

1. GitHub **Privately report a vulnerability** on this repository (Security → Advisories), or
2. Contact the maintainers if a private advisory is not available.

Include:

- Affected path (`src/frontend`, `src/backend`, API route)
- Reproduction steps (local only; no exploit payloads against third-party systems)
- Impact (secret leak, auth bypass, prompt injection that exfiltrates keys, etc.)

We will acknowledge the report and work on a fix before any public disclosure.

## Secrets

Never commit API keys, `.env.local`, deploy tokens, or user uploads. Rotate any key that was pasted into chat or committed by mistake.
