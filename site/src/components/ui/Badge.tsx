interface BadgeProps {
  label: string
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple'
}

const variants = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
}

export function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {label}
    </span>
  )
}

export function CopyStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    AVAILABLE: { label: 'Available', variant: 'green' },
    ON_LOAN: { label: 'On Loan', variant: 'yellow' },
    RESERVED: { label: 'Reserved', variant: 'blue' },
    DAMAGED: { label: 'Damaged', variant: 'red' },
    RETIRED: { label: 'Retired', variant: 'gray' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'gray' }
  return <Badge label={label} variant={variant} />
}

export function LoanStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    ACTIVE: { label: 'Active', variant: 'green' },
    RETURNED: { label: 'Returned', variant: 'gray' },
    OVERDUE: { label: 'Overdue', variant: 'red' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'gray' }
  return <Badge label={label} variant={variant} />
}

export function ReservationStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    PENDING: { label: 'Pending', variant: 'yellow' },
    FULFILLED: { label: 'Fulfilled', variant: 'green' },
    CANCELLED: { label: 'Cancelled', variant: 'gray' },
    EXPIRED: { label: 'Expired', variant: 'red' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'gray' }
  return <Badge label={label} variant={variant} />
}
