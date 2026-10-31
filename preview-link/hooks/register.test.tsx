import { expect, test } from 'claude-code/testing'
import { lastLogin, lastPreviewUrl } from './register'

const BAND = {
  plugin: 'preview-link',
  component: 'PromptHint',
  requestId: 'prompt-hint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
} as const

test('url extraction', () => {
  expect(lastPreviewUrl('see https://e2b.dev/docs and https://3000-iabc123xyz.e2b.app/reports/12.')).toBe(
    'https://3000-iabc123xyz.e2b.app/reports/12',
  )
  expect(lastPreviewUrl('INF |  https://quiet-river-fox.trycloudflare.com  |')).toBe('https://quiet-river-fox.trycloudflare.com')
  expect(lastPreviewUrl('**https://ab12-cd.ngrok-free.app/x**')).toBe('https://ab12-cd.ngrok-free.app/x')
  expect(lastPreviewUrl('docs at https://e2b.dev/docs, http://localhost:3000')).toBe(null)
})

test('band is empty until a preview shows up, then shows the latest', async ($, on) => {
  on('tool.call', () => ({ result: {}, text: 'tunnel up: https://old-one.trycloudflare.com' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('clock.now', () => ({ value: 1 }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()

  await $.tool.call({ tool: 'Bash', command: 'cloudflared tunnel --url http://localhost:3000' })
  await $.turn.complete({ answer: 'Preview is up: https://3000-sbx9.e2b.app/canvas/4', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as any)

  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const link = await ui.find({ type: 'Link' })
  expect(link?.props?.href).toBe('https://3000-sbx9.e2b.app/canvas/4')
  expect((await ui.find({ type: 'Text', text: 'engine' }))?.text).toBe('engine')
  await ui.unmount()
})

test('login extraction', () => {
  expect(lastLogin('Sign in with email: demo@club.test / password: hunter22')).toEqual({ email: 'demo@club.test', password: 'hunter22' })
  expect(lastLogin('- **Email:** `coach@fs.dev`\n- **Password:** `Secret-123!`')).toEqual({ email: 'coach@fs.dev', password: 'Secret-123!' })
  expect(lastLogin('User.create!(email: "a@b.io", password: "pw123456")')).toEqual({ email: 'a@b.io', password: 'pw123456' })
  expect(lastLogin('3 pass from ci@fs.dev, all good')).toBe(null)
  expect(lastLogin('Author: Dev <dev@example.com>\n\nfix login')).toBe(null)
})
