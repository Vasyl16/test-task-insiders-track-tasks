import type { ListSortValue } from '../ui/ListFilterBar'

export function sortValueToParams(sort: ListSortValue): {
  sortBy: 'name' | 'createdAt'
  sortOrder: 'asc' | 'desc'
} {
  const [sortBy, sortOrder] = sort.split('-') as ['name' | 'createdAt', 'asc' | 'desc']
  return { sortBy, sortOrder }
}
