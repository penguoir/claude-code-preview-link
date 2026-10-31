import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { PreviewLink, PreviewLogin } from '../types'

const latest = atom({ plugin: 'preview-link', key: 'latest' } as const, null)
const login = atom({ plugin: 'preview-link', key: 'login' } as const, null)

// Hosts that only ever serve a live preview: E2B sandbox ports, Cloudflare quick
// tunnels, ngrok, localtunnel, localhost.run. Docs pages (e2b.dev/docs) don't match.
const PREVIEW_URL =
  /https?:\/\/(?:\d+-[a-z0-9]+\.e2b\.(?:app|dev)|[a-z0-9-]+\.trycloudflare\.com|[a-z0-9-]+\.ngrok(?:-free)?\.(?:app|dev|io)|[a-z0-9-]+\.loca\.lt|[a-z0-9]+\.lhr\.life)(?::\d+)?(?:\/[^\s<>"'`)\]]*)?/gi

/** The last preview URL in `text`, trailing punctuation trimmed. */
export function lastPreviewUrl(text: string): string | null {
  const found = text.match(PREVIEW_URL)
  if (!found || found.length === 0) return null
  return found[found.length - 1].replace(/[.,;:!?*_]+$/, '')
}

async function remember($: EngineInterface, text: string | undefined) {
  if (!text) return
  const url = lastPreviewUrl(text)
  if (!url) return
  const prev = await read($, latest)
  if (prev?.url === url) return
  const link: PreviewLink = { url, seenAt: await $.clock.now() }
  await update($, latest, () => link)
}

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g
const PASSWORD = /\b(?:password|passwd|pass|pw)\b\**\s*[:=]\s*\**\s*[`'"]?([^\s`'"*,;]{3,128})/gi
const NEAR = 200

/** The last email + password that appear together (within ~200 chars) in `text`. */
export function lastLogin(text: string): PreviewLogin | null {
  let found: PreviewLogin | null = null
  for (const pw of text.matchAll(PASSWORD)) {
    const at = pw.index ?? 0
    const around = text.slice(Math.max(0, at - NEAR), at + pw[0].length + NEAR)
    const emails = [...around.matchAll(EMAIL)]
    if (emails.length === 0) continue
    // The email closest to the password label.
    const offset = Math.max(0, at - NEAR)
    const best = emails.reduce((a, b) =>
      Math.abs((a.index ?? 0) + offset - at) <= Math.abs((b.index ?? 0) + offset - at) ? a : b,
    )
    found = { email: best[0], password: pw[1].replace(/[.)\]]+$/, '') }
  }
  return found
}

async function rememberLogin($: EngineInterface, text: string | undefined) {
  if (!text) return
  const next = lastLogin(text)
  if (!next) return
  const prev = await read($, login)
  if (prev?.email === next.email && prev.password === next.password) return
  await update($, login, () => next)
}

export const register: Register = on => {
  // Tunnel/sandbox output (cloudflared logs, scripts printing the E2B host).
  on('tool.call', async ($, e, next) => {
    const res = await next(e)
    if (!res.deny) {
      await remember($, res.text).catch(() => undefined)
      await rememberLogin($, res.text).catch(() => undefined)
    }
    return res
  })

  // What Claude tells you ("preview is up at ..."), usually with the full path.
  on('turn.complete', async ($, e, next) => {
    await remember($, e.answer).catch(() => undefined)
    await rememberLogin($, e.answer).catch(() => undefined)
    return next(e)
  })

  // Right end of the hint line under the prompt; the engine's own hint stays on the left.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const link = await read($, latest)
    const creds = await read($, login)
    const hint = await next(e)
    if (link === null) return hint

    const { Box, Link, Text } = $.ui.resolve(e)
    return (
      <Box>
        {hint}
        <Box flexGrow={1} />
        <Text color="green">Preview </Text>
        <Link href={link.url} />
        {creds ? <Text dimColor>{` · ${creds.email} / ${creds.password}`}</Text> : null}
      </Box>
    )
  })
}
