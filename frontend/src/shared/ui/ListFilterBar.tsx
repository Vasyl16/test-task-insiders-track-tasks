import { Input } from './Input'
import { Listbox } from './Listbox'

export type ListSortValue = 'createdAt-desc' | 'createdAt-asc' | 'name-asc' | 'name-desc'

const SORT_OPTIONS: { value: ListSortValue; label: string }[] = [
  { value: 'createdAt-desc', label: 'Newest first' },
  { value: 'createdAt-asc', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
]

export type OwnershipValue = 'all' | 'mine' | 'other'

interface ListFilterBarProps {
  idPrefix: string
  searchLabel: string
  searchPlaceholder?: string
  search: string
  onSearchChange: (value: string) => void
  sort: ListSortValue
  onSortChange: (value: ListSortValue) => void
  ownership: OwnershipValue
  onOwnershipChange: (value: OwnershipValue) => void
  ownershipOtherLabel: string
}

// Shared by the Dashboard's workspace list and a Workspace's project list —
// both are name/createdAt/owner-shaped paginated lists, so the same three
// controls (search, sort, mine-vs-not-mine) apply identically to either.
export function ListFilterBar({
  idPrefix,
  searchLabel,
  searchPlaceholder,
  search,
  onSearchChange,
  sort,
  onSortChange,
  ownership,
  onOwnershipChange,
  ownershipOtherLabel,
}: ListFilterBarProps) {
  const ownershipOptions: { value: OwnershipValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'mine', label: 'Owned by me' },
    { value: 'other', label: ownershipOtherLabel },
  ]

  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <Input
        id={`${idPrefix}-search`}
        label={searchLabel}
        placeholder={searchPlaceholder}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <div className="sm:w-44">
        <Listbox
          id={`${idPrefix}-sort`}
          label="Sort"
          value={sort}
          onChange={onSortChange}
          options={SORT_OPTIONS}
        />
      </div>
      <div className="sm:w-44">
        <Listbox
          id={`${idPrefix}-ownership`}
          label="Show"
          value={ownership}
          onChange={onOwnershipChange}
          options={ownershipOptions}
        />
      </div>
    </div>
  )
}
