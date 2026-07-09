// Generates supabase/seed.sql from site-feed.json so the database seed always
// matches the feed. Run: node supabase/generate-seed.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const feed = JSON.parse(readFileSync(join(here, '..', 'site-feed.json'), 'utf8'))
const { plates, rankings, provinces } = feed.sampleData

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const n = (v) => (v == null ? 'null' : Number(v))
// Dollar-quote a JSON string so no escaping is needed inside the SQL literal.
const jsonb = (obj) => `$strings$${JSON.stringify(obj)}$strings$::jsonb`

// Collect every plate referenced by plates[] and rankings so the leaderboard is full.
const plateRows = new Map()
for (const p of plates) plateRows.set(p.plate, { plate: p.plate, province: p.province, score: p.score })
for (const e of rankings.entries) {
  if (!plateRows.has(e.plate)) plateRows.set(e.plate, { plate: e.plate, province: e.province, score: e.score })
}

const lines = []
lines.push('-- AUTO-GENERATED from site-feed.json by supabase/generate-seed.mjs — do not edit by hand.')
lines.push('-- Run schema.sql first, then this. Re-runnable (upserts).')
lines.push('')

// ---- app_config ----
lines.push('insert into public.app_config (id, default_lang, ranking_period) values')
lines.push(`  (1, ${q(feed.meta.defaultLang)}, ${q(rankings.period)})`)
lines.push('on conflict (id) do update set default_lang = excluded.default_lang, ranking_period = excluded.ranking_period;')
lines.push('')

// ---- app_strings (uk / en UI docs) ----
lines.push('insert into public.app_strings (lang, data) values')
lines.push(
  feed.meta.languages
    .map((lang) => `  (${q(lang)}, ${jsonb(feed[lang])})`)
    .join(',\n') +
    '\non conflict (lang) do update set data = excluded.data;'
)
lines.push('')

// ---- provinces ----
lines.push('insert into public.provinces (slug, code, name_uk, name_en, sort) values')
lines.push(
  provinces
    .map((p, i) => `  (${q(p.slug)}, ${q(p.code)}, ${q(p.name.uk)}, ${q(p.name.en)}, ${i})`)
    .join(',\n') +
    '\non conflict (slug) do update set code = excluded.code, name_uk = excluded.name_uk, name_en = excluded.name_en, sort = excluded.sort;'
)
lines.push('')

lines.push('insert into public.plates (plate, province, score) values')
lines.push(
  [...plateRows.values()]
    .map((p) => `  (${q(p.plate)}, ${q(p.province)}, ${n(p.score)})`)
    .join(',\n') +
    '\non conflict (plate) do update set province = excluded.province, score = excluded.score;'
)
lines.push('')

const commentRows = []
for (const p of plates) {
  for (const c of p.comments) {
    commentRows.push(
      `  (${q(c.id)}, ${q(p.plate)}, ${q(c.author)}, ${q(c.category)}, ` +
        `${q(c.text?.uk)}, ${q(c.text?.en)}, ${q(c.photo)}, ${n(c.votes)}, ${q(c.createdAt)})`
    )
  }
}
lines.push('insert into public.comments (id, plate, author, category, text_uk, text_en, photo, votes, created_at) values')
lines.push(
  commentRows.join(',\n') +
    '\non conflict (id) do update set author = excluded.author, category = excluded.category, ' +
    'text_uk = excluded.text_uk, text_en = excluded.text_en, photo = excluded.photo, votes = excluded.votes;'
)
lines.push('')

writeFileSync(join(here, 'seed.sql'), lines.join('\n'))
console.log(
  `seed.sql written: ${feed.meta.languages.length} langs, ${provinces.length} provinces, ` +
  `${plateRows.size} plates, ${commentRows.length} comments.`
)
