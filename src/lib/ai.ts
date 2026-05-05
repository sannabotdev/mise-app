import OpenAI from 'openai'
import { Member, FamilyWish, CalendarEvent, Language } from '@/types'

export interface SingleMealParams {
  date: string
  mealType: string
  cookAvailable: boolean
  members: Member[]
  slotAttendeeIds: string[]   // which members attend this specific (day, mealType)
  allMemberIds: string[]      // all family members (for validation)
  otherMealsToday: string[]
  dayWishes: string[]
  recentMeals?: { date: string; meal_type: string; name: string }[]
  avoidMealNames?: string[]
  nutritionStyle: string
  language: Language
}

export async function generateSingleMeal(params: SingleMealParams) {
  const {
    date,
    mealType,
    cookAvailable,
    members,
    slotAttendeeIds,
    otherMealsToday,
    dayWishes,
    recentMeals,
    avoidMealNames,
    nutritionStyle,
    language,
  } = params

  const msgs = (await import(`../../messages/${language}.json`)).default as Record<string, unknown>
  const tl = (key: string) => key.split('.').reduce((acc: unknown, k) => (acc as Record<string, unknown>)?.[k], msgs) as string

  const nutritionDesc = tl(`ai.nutritionStyleDescriptions.${nutritionStyle}`) ?? nutritionStyle
  const langInstruction = tl('ai.langInstruction') ?? ''

  const slotMembers = members.filter((m) => slotAttendeeIds.includes(m.id))
  const membersDesc = slotMembers.map((m) => ({
    id: m.id, name: m.name, is_child: m.is_child, preferences: m.preferences, dislikes: m.dislikes,
  }))

  // If cooking is not available for the day, we generate no-cook meals.
  // Dinner and lunch should be purchasable ready-made meals; breakfast can still be simple no-cook (not forced here).
  const isReadyMeal = !cookAvailable && (mealType === 'dinner' || mealType === 'lunch')

  const hasLunchToday = otherMealsToday.some((m) => /lunch|mittag/i.test(m))

  const prompt = `Generate exactly ONE ${mealType} meal for ${date}.

${langInstruction}

Nutrition style: ${nutritionDesc}
Attendees for this meal: ${JSON.stringify(membersDesc)}
Other meals today: ${JSON.stringify(otherMealsToday)} (avoid repeating similar ingredients/flavors)
Wishes for this day: ${JSON.stringify(dayWishes)}
Cook available: ${cookAvailable}${isReadyMeal ? ' → must be a ready-made meal (generic, no brand names)' : ''}
${isReadyMeal ? `Ready-meal constraints (supermarket-conventional):
- Must be realistically available in a normal supermarket (discount/grocery) as a standard item
- Prefer: frozen meals, chilled convenience meals, canned soups/stews, ready salads + bread, rotisserie chicken + sides
- Keep it simple and common; avoid exotic/specialty items and rare ingredients` : ''}
Recent meals from the last 4 weeks (avoid repeating dishes and very similar variants): ${JSON.stringify(recentMeals ?? [])}
Meal names to avoid exactly: ${JSON.stringify(avoidMealNames ?? [])}

Variety rules:
- Do NOT output a meal with the same name as any item in "Meal names to avoid exactly" or "Recent meals from the last 4 weeks".
- Prefer alternatives that change cuisine AND main protein/legume/primary ingredient compared to recent meals.
- If you must use a similar concept, make it meaningfully different (different main ingredient + different flavor profile).

Day workload rule:
- If you generate dinner AND there is a lunch on the same day (${hasLunchToday}), then dinner MUST be simple: low effort, few ingredients, quick prep, minimal cooking (e.g. 10-20 min).
- Only if there is NO lunch on the same day, dinner can be a "proper" meal with more steps.

Return exactly this JSON, no markdown:
{
  "name": "string",
  "is_ready_meal": ${isReadyMeal},
  "servings": ${slotAttendeeIds.length},
  "attendees": ${JSON.stringify(slotAttendeeIds)},
  "macros_per_serving": { "kcal": 500, "protein_g": 35, "carbs_g": 45, "fat_g": 18 },
  "instructions": "1. Step... 2. Step...",
  "ingredients": [{"name": "string", "amount": 1.5, "unit": "string", "category": "produce|meat|dairy|frozen|dry_goods|beverages|household|other"}]
}`

  async function call() {
    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: tl('ai.systemPrompt') ?? 'You are a family nutrition planner. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    })
    return JSON.parse(res.choices[0].message.content ?? '')
  }

  try { return await call() } catch { return await call() }
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface GeneratePlanParams {
  weekStartDate: string
  members: Member[]
  wishes: FamilyWish[]
  planDays: { date: string; dayIndex: number; cook_available: boolean; attendanceByMealType: Record<string, string[]> }[]
  calendarEvents: CalendarEvent[]
  recentMeals?: { date: string; meal_type: string; name: string }[]
  nutritionStyle: string
  language: Language
  activeMealTypes: string[]
  activeDays: number[]
}

export async function generateWeekPlan(params: GeneratePlanParams) {
  const { weekStartDate, members, wishes, planDays, recentMeals, nutritionStyle, language, activeMealTypes, activeDays } = params

  const messages = (await import(`../../messages/${language}.json`)).default as Record<string, unknown>
  const t = (key: string) =>
    key.split('.').reduce((acc: unknown, k) => (acc as Record<string, unknown>)?.[k], messages) as unknown

  const nutritionDesc =
    t(`ai.nutritionStyleDescriptions.${nutritionStyle}`) ?? nutritionStyle

  const membersDesc = members.map((m) => ({
    id: m.id,
    name: m.name,
    is_child: m.is_child,
    preferences: m.preferences,
    dislikes: m.dislikes,
  }))

  const wishesDesc = wishes.map((w) => ({
    member: members.find((m) => m.id === w.member_id)?.name ?? t('ai.unknownMember') ?? 'Unknown',
    wish: w.wish_text,
  }))

  const activePlanDays = planDays.filter((d) => activeDays.includes(d.dayIndex))
  const daysWithoutCook = activePlanDays.filter((d) => !d.cook_available).map((d) => d.date)

  const attendanceDesc = activePlanDays.reduce(
    (acc, d) => {
      acc[d.date] = d.attendanceByMealType
      return acc
    },
    {} as Record<string, Record<string, string[]>>
  )

  const mealTypesInstruction = activeMealTypes.length === 3
    ? (t('ai.mealTypesAll') ?? 'breakfast, lunch, dinner')
    : activeMealTypes.join(', ')

  const langInstruction = t('ai.langInstruction') ?? ''

  const userPrompt = `Plan a week starting ${weekStartDate} with ${mealTypesInstruction} for this family.
Only include days: ${JSON.stringify(activePlanDays.map((d) => d.date))}

${langInstruction}

Nutrition style: ${nutritionDesc}
Members: ${JSON.stringify(membersDesc)}
Wishes this week: ${JSON.stringify(wishesDesc)}
Days without cook: ${JSON.stringify(daysWithoutCook)} → lunch and dinner must be purchasable ready-made meals from a typical grocery store. Describe them generically (e.g. "frozen lasagna", "chicken nuggets with frozen vegetables", "pre-made salad with bread"). Do NOT use brand names.
Ready-meal constraints on days without cook:
- Must be realistically available in a normal supermarket (discount/grocery) as a standard item
- Prefer: frozen meals, chilled convenience meals, canned soups/stews, ready salads + bread, rotisserie chicken + simple sides
- Keep it simple and common; avoid exotic/specialty items and rare ingredients
Attendance per day per meal type: ${JSON.stringify(attendanceDesc)}
Meals from the last 4 weeks (avoid repeating dishes and very similar variants): ${JSON.stringify(recentMeals ?? [])}

Rules:
- Only include meal types: ${mealTypesInstruction}
- Follow nutrition style strictly
- Integrate wishes, balance unhealthy ones across week
- Enforce variety: avoid repeating dishes from the last 4 weeks; actively seek alternative cuisines/proteins/primary ingredients compared to recent meals
- Ready meals must be generic, no brand names
- Set attendees and servings per meal from the attendance data (only members attending that meal type on that day)
- Categorize each ingredient into one of: produce|meat|dairy|frozen|dry_goods|beverages|household|other
- Include step-by-step instructions for each meal (2-5 steps). For ready meals: preparation instructions from packaging.
- Workload balancing per day:
  - If a day includes lunch, then dinner that same day MUST be simple (low effort, few ingredients, quick prep, minimal cooking).
  - Only if a day has NO lunch, dinner can be a "proper" meal with more steps/effort.
- Include macro nutrients per serving for each meal as an estimate (kcal, protein_g, carbs_g, fat_g). Values must be numbers.
- Return exactly this JSON structure, no markdown, no explanation:

{
  "days": [{
    "date": "YYYY-MM-DD",
    "cook_available": true,
    "meals": [{
      "meal_type": "breakfast|lunch|dinner",
      "name": "string",
      "is_ready_meal": false,
      "servings": 4,
      "attendees": ["member_id"],
      "macros_per_serving": { "kcal": 500, "protein_g": 35, "carbs_g": 45, "fat_g": 18 },
      "instructions": "1. Schritt... 2. Schritt...",
      "ingredients": [{"name": "string", "amount": 1.5, "unit": "string", "category": "produce"}]
    }]
  }],
  "shopping_list": [{"name": "string", "amount": 1.5, "unit": "string", "category": "produce", "source_meal": "meal name"}]
}`

  async function callAPI() {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            (typeof t('ai.systemPrompt') === 'string' && (t('ai.systemPrompt') as string)) ||
            'You are a family nutrition planner. Always respond with valid JSON only, no markdown, no explanation.',
        },
        { role: 'user', content: userPrompt },
      ],
    })
    const text = response.choices[0].message.content ?? ''
    return JSON.parse(text.trim())
  }

  try {
    return await callAPI()
  } catch {
    return await callAPI()
  }
}
