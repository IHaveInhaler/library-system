export interface PermissionInfo {
  key: string
  label: string
  description: string
  category: string
}

export const PERMISSION_CATEGORIES = [
  'Libraries',
  'Books & Copies',
  'Loans',
  'Reservations',
  'Users',
  'System',
] as const

export const PERMISSIONS: PermissionInfo[] = [
  // Libraries
  { key: 'VIEW_LIBRARIES', label: 'View Libraries', description: 'See public libraries and libraries the user has a membership to.', category: 'Libraries' },
  { key: 'VIEW_ALL_LIBRARIES', label: 'View All Libraries', description: 'Bypass membership checks — see every library including private ones.', category: 'Libraries' },
  { key: 'CREATE_LIBRARY', label: 'Create Library', description: 'Create new libraries. Does not grant edit or delete on existing libraries.', category: 'Libraries' },
  { key: 'MANAGE_LIBRARIES', label: 'Manage Libraries', description: 'Edit and configure existing libraries (name, prefix, email, privacy). Requires Staff membership for the specific library.', category: 'Libraries' },
  { key: 'MANAGE_SHELVES', label: 'Manage Shelves', description: 'Create, edit, and delete shelves within libraries where the user has Staff access.', category: 'Libraries' },
  { key: 'MANAGE_MEMBERSHIPS', label: 'Manage Memberships', description: 'Grant, revoke, and edit library memberships for users.', category: 'Libraries' },

  // Books & Copies
  { key: 'MANAGE_BOOKS', label: 'Manage Books', description: 'Create, edit, and delete books in the catalogue. Includes ISBN import.', category: 'Books & Copies' },
  { key: 'MANAGE_COPIES', label: 'Manage Copies', description: 'Register, update condition/status, and delete book copies. Requires Staff access for the copy\'s library.', category: 'Books & Copies' },

  // Loans
  { key: 'ISSUE_LOANS', label: 'Issue Loans', description: 'Issue new loans to members. Requires Staff access to the copy\'s library.', category: 'Loans' },
  { key: 'RETURN_LOANS', label: 'Return Loans', description: 'Process loan returns. Requires Staff access to the copy\'s library.', category: 'Loans' },
  { key: 'VIEW_ALL_LOANS', label: 'View All Loans', description: 'See all loans system-wide, not just the user\'s own.', category: 'Loans' },

  // Reservations
  { key: 'MANAGE_RESERVATIONS', label: 'Manage Reservations', description: 'Fulfill and cancel reservations for any user.', category: 'Reservations' },
  { key: 'VIEW_ALL_RESERVATIONS', label: 'View All Reservations', description: 'See all reservations system-wide, not just the user\'s own.', category: 'Reservations' },

  // Users
  { key: 'VIEW_USERS', label: 'View Users', description: 'See the user list and individual user profiles.', category: 'Users' },
  { key: 'MANAGE_USERS', label: 'Manage Users', description: 'Edit user accounts, change roles, activate/deactivate. Rank hierarchy applies.', category: 'Users' },
  { key: 'RESET_USER_PASSWORD', label: 'Reset User Password', description: 'Trigger a password reset for another user (locks them out until they set a new one).', category: 'Users' },

  // System
  { key: 'VIEW_AUDIT_LOG', label: 'View Audit Log', description: 'Access the system-wide audit log of all actions.', category: 'System' },
]

export const PERMISSIONS_BY_CATEGORY = PERMISSION_CATEGORIES.map((cat) => ({
  category: cat,
  permissions: PERMISSIONS.filter((p) => p.category === cat),
}))
