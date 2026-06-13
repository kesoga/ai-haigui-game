# Security Policy

## Supported Versions

This project is currently an MVP. Security fixes are applied to the latest code in `main`.

## Reporting a Vulnerability

If you find a vulnerability, please do not publish exploit details publicly before it is fixed.

Report:
- the affected area
- reproduction steps
- expected impact
- whether any secret, token, or user data may be exposed

## Secret Handling

- Never commit `.env` files.
- Rotate `DEEPSEEK_API_KEY` immediately if it has been shared, logged, or committed.
- Keep provider credentials on the backend only.
- Use `CORS_ORIGIN` in production instead of allowing arbitrary origins.

## Known MVP Limitations

Story bottoms are now served by the backend, but the reveal endpoint is not authenticated. This is acceptable for a prototype. A production version should tie reveal access to a server-side session and rate-limit reveal attempts.
