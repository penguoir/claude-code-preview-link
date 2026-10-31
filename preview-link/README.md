# claude-code-preview-link

A Claude Code CLI mod that keeps your current preview link in view.

When Claude starts a preview (an E2B sandbox port, a Cloudflare quick tunnel,
ngrok, localtunnel, localhost.run), the latest URL is pinned at the right end of
the hint line under the prompt, so you never scroll back to find it. If Claude
prints a sign-in alongside it (`email: x / password: y`), that is shown next to
the link too.

```
? for shortcuts                 Preview https://3000-abc.e2b.app/app · demo@example.com / try-me-123
```

## Install

In Claude Code:

```
/plugin marketplace add penguoir/claude-code-preview-link
/plugin install preview-link@ori-local
```

## Notes

- Only well-known preview hosts are matched; docs pages and plain `localhost` are ignored.
- An email is only taken when a `password:` / `pw=` label sits within ~200 characters of it.
- The password is shown in plain text; use it for throwaway preview logins only.

Tests: `claude plugin test preview-link`.
