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
  { key: 'CREATE_LIBRARY', label: 'Create Library', description: 'Create new libraries. Does not grant edit or delete.', category: 'Libraries' },
  { key: 'MANAGE_LIBRARIES', label: 'Manage Libraries', description: 'Edit existing libraries (name, prefix, email, privacy). Requires Staff membership.', category: 'Libraries' },
  { key: 'DELETE_LIBRARY', label: 'Delete Library', description: 'Permanently delete a library and optionally move its shelves.', category: 'Libraries' },
  { key: 'MANAGE_LIBRARY_IMAGE', label: 'Manage Library Image', description: 'Upload and remove library images/banners.', category: 'Libraries' },
  { key: 'CREATE_SHELF', label: 'Create Shelf', description: 'Add new shelves to libraries where the user has Staff access.', category: 'Libraries' },
  { key: 'MANAGE_SHELVES', label: 'Manage Shelves', description: 'Edit shelves (code, location, genre, position). Requires Staff access.', category: 'Libraries' },
  { key: 'DELETE_SHELF', label: 'Delete Shelf', description: 'Remove shelves. Only empty shelves can be deleted.', category: 'Libraries' },
  { key: 'MANAGE_SHELF_POSITIONS', label: 'Manage Shelf Positions', description: 'Add, remove, and migrate shelf positions (L/M/R etc). Affects barcode labels.', category: 'Libraries' },
  { key: 'MANAGE_MEMBERSHIPS', label: 'Manage Memberships', description: 'Grant, revoke, and edit library memberships for users.', category: 'Libraries' },

  // Books & Copies
  { key: 'MANAGE_BOOKS', label: 'Manage Books', description: 'Create and edit books in the catalogue. Includes ISBN import.', category: 'Books & Copies' },
  { key: 'DELETE_BOOK', label: 'Delete Book', description: 'Permanently delete a book and all its copies, loans, and reservations.', category: 'Books & Copies' },
  { key: 'MANAGE_CATEGORIES', label: 'Manage Categories', description: 'Create, edit, and delete book/shelf categories (genres).', category: 'Books & Copies' },
  { key: 'MANAGE_COPIES', label: 'Manage Copies', description: 'Register, update condition/status, and delete book copies. Requires Staff access.', category: 'Books & Copies' },
  { key: 'CONFIGURE_BARCODES', label: 'Configure Barcodes', description: 'Edit barcode format templates for shelves and book copies.', category: 'Books & Copies' },
  { key: 'CREATE_BARCODES', label: 'Create Barcodes', description: 'Generate and print barcodes for shelves and book copies.', category: 'Books & Copies' },

  // Loans
  { key: 'ISSUE_LOANS', label: 'Issue Loans', description: 'Issue new loans to members. Requires Staff access to the copy\'s library.', category: 'Loans' },
  { key: 'RETURN_LOANS', label: 'Return Loans', description: 'Process loan returns. Requires Staff access to the copy\'s library.', category: 'Loans' },
  { key: 'VIEW_ALL_LOANS', label: 'View All Loans', description: 'See all loans system-wide, not just the user\'s own.', category: 'Loans' },

  // Reservations
  { key: 'MANAGE_RESERVATIONS', label: 'Manage Reservations', description: 'Fulfill and cancel reservations for any user.', category: 'Reservations' },
  { key: 'VIEW_ALL_RESERVATIONS', label: 'View All Reservations', description: 'See all reservations system-wide, not just the user\'s own.', category: 'Reservations' },

  // Users
  { key: 'VIEW_USERS', label: 'View Users', description: 'See the user list and individual user profiles.', category: 'Users' },
  { key: 'CREATE_USER', label: 'Create User', description: 'Create new user accounts. They receive an invite email to set their password.', category: 'Users' },
  { key: 'MANAGE_USERS', label: 'Manage Users', description: 'Edit user accounts, change roles, activate/deactivate. Rank hierarchy applies.', category: 'Users' },
  { key: 'DELETE_USER', label: 'Delete User', description: 'Permanently delete a user account and all their data.', category: 'Users' },
  { key: 'RESET_USER_PASSWORD', label: 'Reset User Password', description: 'Trigger a password reset for another user (locks them out until they set a new one).', category: 'Users' },

  // System
  { key: 'VIEW_AUDIT_LOG', label: 'View Audit Log', description: 'Access the system-wide audit log of all actions.', category: 'System' },
  { key: 'CONFIGURE_GENERAL', label: 'Configure General', description: 'Edit general settings: site base URL, reverse proxy, membership duration mode.', category: 'System' },
  { key: 'CONFIGURE_SMTP', label: 'Configure SMTP', description: 'Edit email/SMTP settings for outbound mail.', category: 'System' },
  { key: 'CONFIGURE_WHITELABEL', label: 'Configure White Label', description: 'Edit branding: app name, logo, primary color, favicon.', category: 'System' },
  { key: 'CONFIGURE_REGISTRATION', label: 'Configure Registration', description: 'Edit registration mode, domain restrictions, approval, email confirmation.', category: 'System' },
  { key: 'CONFIGURE_2FA', label: 'Configure 2FA', description: 'Edit two-factor authentication requirements and enforce 2FA for roles.', category: 'System' },
  { key: 'CONFIGURE_BARCODES', label: 'Configure Barcodes', description: 'Edit barcode format templates for shelves and book copies.', category: 'System' },
  { key: 'CONFIGURE_IMAGES', label: 'Configure Images', description: 'Edit image upload settings: max sizes, allowed types.', category: 'System' },
]

export const PERMISSIONS_BY_CATEGORY = PERMISSION_CATEGORIES.map((cat) => ({
  category: cat,
  permissions: PERMISSIONS.filter((p) => p.category === cat),
}))
