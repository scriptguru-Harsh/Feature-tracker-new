const sourceClients = [
  {
    clinic: 'Mobility Quest physiotherapy',
    by: '',
    lead: 'Anisha',
    sourceDate: '2026-09-28',
    sourceDateText: '28/09/26',
    status: 'Onboarded',
    remarks: 'Currently learning to operate the software; team is working on a WhatsApp message template.',
    features: [
      { name: 'Instagram automation', done: true },
      { name: 'Google Meet link for virtual consultation by doctor slot', done: true },
      { name: 'Online payment method', done: true },
      { name: 'WhatsApp message template', done: false, inProgress: true },
    ],
  },
  {
    clinic: 'Kirtika Joshi Dental Clinic',
    by: 'Dr. Kirtika Joshi',
    lead: 'Anisha',
    sourceDate: '2026-10-02',
    sourceDateText: '2/10/26',
    status: 'Onboarded',
    remarks: 'Inventory is left; waiting for confirmation on the prescription.',
    features: [
      { name: 'Feedback feature from patients', done: true },
      { name: 'Inventory and lab', done: false },
      { name: 'Customize digital prescription', done: false },
      { name: 'Website', done: true },
      { name: 'Show patient feedback on website', done: true },
      { name: 'Pending payment', done: true },
      { name: 'Increase screen timeout', done: true },
    ],
  },
  {
    clinic: 'Sheel Physiotherapy Clinic',
    by: 'Dr. Sheel',
    lead: 'Anisha',
    sourceDate: '2026-10-05',
    sourceDateText: '5/10/26',
    status: 'Onboarded',
    features: [
      { name: 'Section showing when a doctor is on leave', done: false },
      { name: 'Doctor assistant staff handling patients', done: true },
      { name: 'Donation section', done: true },
      { name: 'Show which patient received a donation', done: true },
      { name: 'Show donation treatment and amount to patients', done: true },
      { name: 'Patient login with session history', done: false },
      { name: 'Two-way appointment flow', done: false },
      { name: 'Upload patient photos', done: false },
      { name: 'Filter invoices by date', done: true },
    ],
  },
  {
    clinic: 'Dhanwantri skin clinic',
    by: '',
    lead: 'Abhigyan',
    sourceDate: '2026-10-30',
    sourceDateText: '30/10/26',
    status: 'On trial',
    deadline: '2026-11-08',
    deadlineText: 'before Diwali',
    features: [{ name: 'Inventory', done: false }],
  },
  {
    clinic: 'Manya dental',
    by: '',
    lead: 'Harsh',
    sourceDate: null,
    sourceDateText: '',
    status: 'In Progress',
    features: [{ name: 'Inventory', done: false, inProgress: true }],
  },
  {
    clinic: 'Nidhi dental clinic',
    by: 'Dr. Nidhi',
    lead: 'Anisha',
    sourceDate: '2026-09-24',
    sourceDateText: '24/09/26',
    status: 'Onboarded',
    features: [{ name: 'Feedback feature from patients', done: true }],
  },
  {
    clinic: 'Infinity Rehab Physiotherapy',
    by: '',
    lead: 'Harsh',
    sourceDate: null,
    sourceDateText: '24/19/26',
    sourceDateInvalid: true,
    status: 'Onboarded',
    deadline: '2026-11-01',
    deadlineText: 'before 1 November',
    features: [{ name: 'Package feature', done: false }],
  },
  {
    clinic: 'Physio Care',
    by: 'Dr. Bharat Mehra',
    lead: 'Harsh',
    sourceDate: '2026-10-25',
    sourceDateText: '25/10/26',
    status: 'Onboarded',
    features: [{ name: 'Auto-suggestion', done: true }],
  },
]

export function getSpreadsheetSeedFeatures() {
  return sourceClients.flatMap((client) => client.features.map((feature) => {
    const notes = [
      `Imported from the provided spreadsheet. Client status: ${client.status}.`,
      client.remarks,
      client.deadlineText && `Spreadsheet deadline: ${client.deadlineText}.`,
      client.sourceDateInvalid && `Spreadsheet date could not be read as a calendar date: ${client.sourceDateText}.`,
    ].filter(Boolean).join(' ')
    const done = feature.done === true
    const inProgress = feature.inProgress === true
    const onTrial = client.status === 'On trial'
    return {
      name: feature.name,
      dev: done ? 'Done' : inProgress ? 'In Progress' : onTrial ? 'In Review' : 'Not Started',
      test: done ? 'Passed' : onTrial ? 'In Testing' : 'Not Started',
      dep: done ? 'Production' : onTrial ? 'Staging' : 'Not Deployed',
      by: client.by,
      clinic: client.clinic,
      cred: 'Not Set',
      lead: client.lead,
      inf: 'Not Informed',
      notes,
      deadline: client.deadline || null,
      priority: 'Normal',
      sourceDate: client.sourceDate,
    }
  }))
}

export const SPREADSHEET_SEED_MIGRATION = 'seed-client-features-spreadsheet-2026-11'
