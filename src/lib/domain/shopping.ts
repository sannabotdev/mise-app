import type { ShoppingCategory } from '@prisma/client'

export const ALLOWED_SHOPPING_CATEGORIES: readonly ShoppingCategory[] = [
  'produce',
  'meat',
  'dairy',
  'frozen',
  'dry_goods',
  'beverages',
  'household',
  'other',
]

export function coerceShoppingCategory(input: unknown): ShoppingCategory {
  if (typeof input !== 'string') return 'other'
  const raw = input.trim()
  if (!raw) return 'other'

  const normalized = raw.toLowerCase()
  const mapped =
    normalized === 'canned_goods'
      ? 'dry_goods'
      : normalized === 'pantry'
        ? 'dry_goods'
        : normalized === 'drinks'
          ? 'beverages'
          : normalized

  return ALLOWED_SHOPPING_CATEGORIES.includes(mapped as ShoppingCategory)
    ? (mapped as ShoppingCategory)
    : 'other'
}
