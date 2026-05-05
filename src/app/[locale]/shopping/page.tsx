'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useFamilyContext } from '@/lib/family-context'
import { createClient } from '@/lib/supabase/client'
import { ShoppingItem, ShoppingCategory } from '@/types'
import { Check, Plus, Trash2 } from 'lucide-react'

const CATEGORY_ORDER: ShoppingCategory[] = [
  'produce', 'meat', 'dairy', 'frozen', 'dry_goods', 'beverages', 'household', 'other',
]

export default function ShoppingPage() {
  const t = useTranslations('shopping')
  const tc = useTranslations('shopping.categories')
  const tx = useTranslations('shoppingExtras')
  const { family } = useFamilyContext()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newCategory, setNewCategory] = useState<ShoppingCategory>('other')
  const [suggestions, setSuggestions] = useState<{ name: string; unit: string; category: ShoppingCategory }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const units = tx.raw('units') as string[]
  const supabase = createClient()

  async function fetchItems() {
    if (!family) return
    const res = await fetch(`/api/shopping?family_id=${family.id}`)
    const data = await res.json()
    setItems(data ?? [])
  }

  useEffect(() => {
    fetchItems()
    if (!family) return

    // Realtime via Supabase, data via Prisma-backed API
    const channel = supabase
      .channel('shopping-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_items',
          filter: `family_id=eq.${family.id}`,
        },
        fetchItems
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [family])

  async function fetchSuggestions(q: string) {
    if (!family || q.length < 1) { setSuggestions([]); return }
    const res = await fetch(`/api/shopping/autocomplete?q=${encodeURIComponent(q)}&family_id=${family.id}`)
    const data = await res.json()
    setSuggestions(data)
  }

  function handleNameChange(val: string) {
    setNewName(val)
    fetchSuggestions(val)
    setShowSuggestions(true)
  }

  function applySuggestion(s: { name: string; unit: string; category: ShoppingCategory }) {
    setNewName(s.name)
    setNewUnit(s.unit ?? '')
    setNewCategory(s.category ?? 'other')
    setShowSuggestions(false)
    setSuggestions([])
  }

  async function addItem() {
    if (!family || !newName.trim()) return
    setAdding(true)
    await fetch('/api/shopping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_id: family.id,
        name: newName.trim(),
        amount: newAmount ? parseFloat(newAmount) : null,
        unit: newUnit || null,
        category: newCategory,
      }),
    })
    setNewName('')
    setNewAmount('')
    setNewUnit('')
    setNewCategory('other')
    setAdding(false)
    fetchItems()
  }

  async function toggleCheck(item: ShoppingItem) {
    await fetch(`/api/shopping/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: !item.checked }),
    })
    setItems(items.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i))
  }

  async function deleteItem(id: string) {
    await fetch(`/api/shopping/${id}`, { method: 'DELETE' })
    setItems(items.filter((i) => i.id !== id))
  }

  async function clearChecked() {
    const checked = items.filter((i) => i.checked)
    await Promise.all(checked.map((i) => fetch(`/api/shopping/${i.id}`, { method: 'DELETE' })))
    setItems(items.filter((i) => !i.checked))
  }

  const grouped = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      const catItems = items.filter((i) => i.category === cat)
      if (catItems.length) acc[cat] = catItems
      return acc
    },
    {} as Record<ShoppingCategory, ShoppingItem[]>
  )

  const checkedCount = items.filter((i) => i.checked).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{t('title')}</h1>
          {checkedCount > 0 && (
            <button
              onClick={clearChecked}
              className="flex items-center gap-1 text-sm text-red-500 font-medium"
            >
              <Trash2 size={14} />
              {t('clearChecked')}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{t('itemCount', { count: items.length })}</p>
      </div>

      {/* Add item form */}
      <div className="mx-4 mt-3 bg-white rounded-xl shadow-sm p-3">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            placeholder={t('placeholder')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  onClick={() => applySuggestion(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium">{s.name}</span>
                  {s.unit && <span className="text-gray-400 ml-1">({s.unit})</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder={tx('amountPlaceholder')}
            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-green-500"
          />
          <select
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-green-500"
          >
            {units.map((u) => <option key={u || '__empty'} value={u}>{u || tx('dash')}</option>)}
          </select>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as ShoppingCategory)}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-green-500"
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{tc(c)}</option>
            ))}
          </select>
          <button
            onClick={addItem}
            disabled={adding || !newName.trim()}
            className="bg-green-600 text-white px-3 rounded-lg disabled:opacity-50 flex items-center"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Shopping list grouped by category */}
      <div className="px-4 mt-4 pb-4 space-y-4">
        {(Object.entries(grouped) as [ShoppingCategory, ShoppingItem[]][]).map(([cat, catItems]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{tc(cat)}</span>
              <span className="text-xs text-gray-400">({catItems.length})</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {catItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 ${idx < catItems.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <button
                    onClick={() => toggleCheck(item)}
                    className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition ${
                      item.checked ? 'bg-green-600 border-green-600' : 'border-gray-300'
                    }`}
                  >
                    {item.checked && <Check size={12} strokeWidth={3} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.name}
                    </span>
                    {(item.amount || item.unit) && (
                      <span className="text-xs text-gray-400 ml-2">
                        {item.amount} {item.unit}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-gray-300 hover:text-red-400 transition flex-shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            {tx('empty')}
          </div>
        )}
      </div>
    </div>
  )
}
