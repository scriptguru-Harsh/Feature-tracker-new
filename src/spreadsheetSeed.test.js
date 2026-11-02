import test from 'node:test'
import assert from 'node:assert/strict'
import { getSpreadsheetSeedFeatures, SPREADSHEET_SEED_MIGRATION } from './spreadsheetSeed.js'

const features = getSpreadsheetSeedFeatures()

test('imports each spreadsheet feature as a separate feature without mutating existing rows', () => {
  assert.equal(features.length, 25)
  assert.equal(new Set(features.map((feature) => `${feature.clinic}:${feature.name}`)).size, features.length)
  assert.ok(features.every((feature) => feature.name && feature.clinic && feature.lead))
  assert.equal(SPREADSHEET_SEED_MIGRATION, 'seed-client-features-spreadsheet-2026-11')
})

test('maps completed requests, active work, and trial status to feature progress', () => {
  const completed = features.find((feature) => feature.clinic === 'Mobility Quest physiotherapy' && feature.name === 'Instagram automation')
  const active = features.find((feature) => feature.clinic === 'Mobility Quest physiotherapy' && feature.name === 'WhatsApp message template')
  const trial = features.find((feature) => feature.clinic === 'Dhanwantri skin clinic')

  assert.deepEqual([completed.dev, completed.test, completed.dep], ['Done', 'Passed', 'Production'])
  assert.equal(active.dev, 'In Progress')
  assert.deepEqual([trial.dev, trial.test, trial.dep], ['In Review', 'In Testing', 'Staging'])
})

test('preserves source remarks, dates, and nonstandard source dates', () => {
  const mobility = features.find((feature) => feature.clinic === 'Mobility Quest physiotherapy')
  const dhanwantri = features.find((feature) => feature.clinic === 'Dhanwantri skin clinic')
  const infinity = features.find((feature) => feature.clinic === 'Infinity Rehab Physiotherapy')

  assert.equal(mobility.sourceDate, '2026-09-28')
  assert.match(mobility.notes, /WhatsApp message template/)
  assert.equal(dhanwantri.deadline, '2026-11-08')
  assert.match(dhanwantri.notes, /before Diwali/)
  assert.equal(infinity.sourceDate, null)
  assert.equal(infinity.deadline, '2026-11-01')
  assert.match(infinity.notes, /24\/19\/26/)
})
