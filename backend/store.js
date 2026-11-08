// In-memory mock database — stands in for PostgreSQL (see database/migrations/001_create_kudos_table.sql).
// Data resets on every server restart.

const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

export const users = [
  { id: 1,  name: 'Root Admin',        avatar_url: null, is_active: true,  is_admin: true  },
  { id: 7,  name: 'Grace Hopper',      avatar_url: null, is_active: true,  is_admin: false },
  { id: 12, name: 'Alan Turing',       avatar_url: null, is_active: true,  is_admin: false },
  { id: 33, name: 'Edsger Dijkstra',   avatar_url: null, is_active: true,  is_admin: false },
  { id: 42, name: 'Ada Lovelace',      avatar_url: null, is_active: true,  is_admin: false },
  { id: 55, name: 'Katherine Johnson', avatar_url: null, is_active: true,  is_admin: false },
  { id: 68, name: 'Margaret Hamilton', avatar_url: null, is_active: true,  is_admin: false },
  { id: 71, name: 'Dennis Ritchie',    avatar_url: null, is_active: true,  is_admin: false },
  { id: 90, name: 'Radia Perlman',     avatar_url: null, is_active: true,  is_admin: false },
  { id: 99, name: 'Inactive Ian',      avatar_url: null, is_active: false, is_admin: false },
];

// [sender_id, recipient_id, message]
const seedRows = [
  [7,  42, 'Thanks for unblocking the release — you saved the launch!'],
  [42, 7,  'Your code reviews are always so thorough and kind.'],
  [12, 33, 'Great catch on that race condition during the architecture review.'],
  [55, 68, 'The onboarding docs you wrote got me productive in a day.'],
  [68, 55, 'Thanks for staying late to help debug the trajectory math.'],
  [71, 90, 'Your talk on network protocols was the highlight of the week.'],
  [90, 71, 'Thanks for always answering my C questions without judgment.'],
  [33, 12, 'The test suite you built caught three bugs before they shipped.'],
  [42, 55, 'Brilliant idea to pair on the analytics engine design.'],
  [7,  68, 'Your leadership during the incident kept everyone calm.'],
  [55, 7,  'Thanks for the mentorship — it means a lot.'],
  [68, 42, 'The refactor you suggested made the module so much cleaner.'],
  [12, 90, 'Your packet-routing demo was mind-blowing.'],
  [33, 71, 'Thanks for explaining pointers one more time. It finally clicked.'],
  [90, 12, 'Your persistence on that flaky test finally paid off.'],
  [71, 33, 'Appreciate the honest feedback on my RFC — it made it stronger.'],
  [42, 12, 'Thanks for covering my on-call shift last weekend!'],
  [7,  55, 'Your presentation to leadership was outstanding.'],
  [68, 33, 'Thanks for the detailed postmortem — we all learned a lot.'],
  [12, 42, 'The helper library you published is saving everyone time.'],
  [55, 90, 'Thanks for organizing the team offsite — it was perfect.'],
  [90, 68, 'Your calm debugging during the outage was inspiring.'],
  [33, 7,  'Thanks for advocating for our team in the planning meeting.'],
  [71, 42, 'The documentation you added is exactly what we needed.'],
  [7,  12, 'Lunch-and-learn on Turing machines was fantastic — encore!'],
];

export const kudos = seedRows.map(([sender_id, recipient_id, message], i) => ({
  id: i + 1,
  sender_id,
  recipient_id,
  message,
  created_at: minutesAgo(15 + i * 97), // spread over ~40 hours, newest first
  is_visible: true,
  moderated_by: null,
  moderated_at: null,
  reason_for_moderation: null,
}));

// One seeded hidden kudos so the admin queue has something to show (id 26).
kudos.push({
  id: 26,
  sender_id: 12,
  recipient_id: 33,
  message: 'You are the best at writing unreadable code!',
  created_at: minutesAgo(5),
  is_visible: false,
  moderated_by: 1,
  moderated_at: minutesAgo(2),
  reason_for_moderation: 'Backhanded/insulting message (demo seed)',
});

export let nextKudosId = 27;

export function allocKudosId() {
  return nextKudosId++;
}
