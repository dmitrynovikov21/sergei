/**
 * AI Content Analyzer - Batch trend extraction using Claude 4.5
 * 
 * Analyzes content items to extract:
 * - Topic & Subtopic
 * - Hook type (question, statement, shock, list, story, controversy)
 * - Content formula
 * - Success hypothesis
 * - Tags for grouping
 * - Emotional trigger
 * - Target audience
 */

import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/db"

// ==========================================
// Configuration
// ==========================================

const anthropic = new Anthropic()

const AI_MODEL = "claude-sonnet-4-20250514"
const MAX_DESCRIPTION_LENGTH = 500
const BATCH_SIZE = 10

// ==========================================
// Types
// ==========================================

interface ContentForAnalysis {
  id: string
  headline: string | null
  description: string | null
  contentType: string | null
  views: number
  viralityScore: number | null
  sourceUsername: string | null
}

interface AIAnalysisResult {
  id: string
  topic: string
  subtopic: string
  hookType: string
  contentFormula: string
  successReason: string
  tags: string[]
  emotionalTrigger: string
  targetAudience: string
}

// ==========================================
// System Prompt
// ==========================================

const SYSTEM_PROMPT = `<system_instruction>
  <role>
    Ты — эксперт по анализу вирального контента в социальных сетях.
    Твоя задача: проанализировать пакет постов и извлечь структурированные данные для построения трендов.
  </role>

  <strict_rules>
    <rule id="1">Отвечай ТОЛЬКО валидным JSON. Никакого текста до или после.</rule>
    <rule id="2">Используй ТОЛЬКО темы из списка ALLOWED_TOPICS. Не выдумывай новые.</rule>
    <rule id="3">Теги на русском, 3-5 штук, конкретные (не "интересное", "полезное").</rule>
    <rule id="4">Если не можешь определить — ставь null, не галлюцинируй.</rule>
    <rule id="5">hookType и emotionalTrigger — ТОЛЬКО из разрешённых значений, НА РУССКОМ.</rule>
    <rule id="6">Категория "Другое" — АБСОЛЮТНО ЗАПРЕЩЕНА в 99% случаев. Каждый пост ОБЯЗАТЕЛЬНО относится к какой-то из тем. Примеры: влог о дне → "Лайфстайл", мнение о ситуации → "Общество", личная исповедь → "Отношения", рецепт → "Здоровье", обзор продукта → "Маркетинг", лайфхак → "Продуктивность", анекдот → "Юмор". Используй "Другое" ТОЛЬКО если контент полностью абстрактный и не содержит НИКАКОЙ информации для классификации.</rule>
    <rule id="7">Если пост касается нескольких тем — выбирай ГЛАВНУЮ тему (ту, о которой 60%+ контента).</rule>
  </strict_rules>

  <allowed_topics>
    - "Финансы" (деньги, инвестиции, крипто, экономия, кредиты, налоги, зарплата, пассивный доход, трейдинг, финансовая грамотность)
    - "Продуктивность" (привычки, тайм-менеджмент, фокус, дисциплина, утренние рутины, планирование, цели, прокрастинация)
    - "Бизнес" (предпринимательство, стартапы, управление, найм, масштабирование, франшизы, партнёрства, кейсы бизнесов)
    - "Отношения" (психология, семья, токсичные люди, дружба, конфликты, одиночество, развод, личные истории, эмоции, исповедь)
    - "Здоровье" (спорт, питание, сон, ЗОЖ, медицина, тело, рецепты полезной еды, фитнес, диеты, ментальное здоровье, стресс)
    - "Мотивация" (mindset, успех, цитаты, истории успеха, трансформации, мышление победителя, жизненные уроки, личный рост)
    - "Маркетинг" (продажи, SMM, личный бренд, реклама, воронки, копирайтинг, контент-стратегия, обзоры продуктов, рекомендации товаров)
    - "Лайфстайл" (путешествия, хобби, luxury, еда, мода, влоги, день из жизни, покупки, обустройство дома, рутины, эстетика)
    - "Технологии" (AI, гаджеты, софт, нейросети, интернет, обзоры техники, приложения, автоматизация)
    - "Образование" (обучение, курсы, школа, университет, навыки, лайфхаки по учёбе, языки, профессии, карьерные советы)
    - "Юмор" (мемы, скетчи, пародии, розыгрыши, развлечения, шутки, комедия, fun-контент)
    - "Наука" (физика, биология, космос, эксперименты, факты, история, география, необычные факты о мире)
    - "Общество" (политика, новости, социальные проблемы, культура, философия, мнения, дискуссии, тренды общества)
    - "Дети и родители" (воспитание, беременность, детский контент, советы родителям, детская психология)
    - "Красота" (уход за кожей, макияж, волосы, процедуры, бьюти-лайфхаки, антиэйдж, стиль)
    - "Недвижимость" (покупка жилья, ремонт, дизайн интерьера, ипотека, аренда, инвестиции в недвижимость)
    - "Творчество" (искусство, музыка, рисование, фотография, видео, DIY, хендмейд, дизайн)
    - "Животные" (питомцы, собаки, кошки, уход за животными, забавные животные, ветеринария)
    - "Авто" (машины, обзоры авто, ремонт, вождение, ДТП, тюнинг)
    - "Кулинария" (рецепты, готовка, ресторанная еда, street food, кулинарные лайфхаки, выпечка)
    - "Другое" (ТОЛЬКО если контент АБСОЛЮТНО не подходит ни к одной из 20 тем выше — это менее 1% постов)
  </allowed_topics>

  <allowed_hook_types>
    - "вопрос" — начинается с вопроса ("А вы знали...?")
    - "утверждение" — смелое утверждение ("Богатые не работают на дядю")
    - "шок" — шок-контент ("Меня уволили и вот что случилось")
    - "список" — список/подборка ("5 привычек успешных")
    - "история" — личная история ("Как я заработал первый миллион")
    - "провокация" — провокация/спор ("Почему ваш бизнес не взлетит")
  </allowed_hook_types>

  <allowed_emotional_triggers>
    - "страх" — страх потери, упустить возможность
    - "жадность" — желание получить больше, разбогатеть
    - "любопытство" — любопытство, интрига
    - "злость" — злость, несправедливость
    - "надежда" — надежда, вдохновение
    - "FOMO" — страх упустить (Fear Of Missing Out)
  </allowed_emotional_triggers>

  <output_format>
    Верни JSON массив с анализом каждого поста:
    [
      {
        "id": "тот же ID что на входе",
        "topic": "одна из ALLOWED_TOPICS",
        "subtopic": "конкретная подтема (1-3 слова)",
        "hookType": "один из ALLOWED_HOOK_TYPES",
        "contentFormula": "краткое описание формулы контента",
        "successReason": "гипотеза почему это залетело (1 предложение)",
        "tags": ["тег1", "тег2", "тег3"],
        "emotionalTrigger": "один из ALLOWED_EMOTIONAL_TRIGGERS",
        "targetAudience": "описание ЦА (возраст, интересы)"
      }
    ]
  </output_format>

  <example_input>
    [
      {
        "id": "abc123",
        "headline": "5 привычек которые сделали меня богатым",
        "description": "Я начинал с нуля. Без денег, без связей. Но эти 5 простых привычек изменили всё...",
        "contentType": "Video",
        "views": 450000,
        "viralityScore": 3.2,
        "sourceUsername": "zahar_bz"
      }
    ]
  </example_input>

  <example_output>
    [
      {
        "id": "abc123",
        "topic": "Финансы",
        "subtopic": "Привычки богатых",
        "hookType": "список",
        "contentFormula": "Личная история + список из N пунктов",
        "successReason": "Простые действия с большим обещанием результата",
        "tags": ["деньги", "привычки", "богатство", "список", "саморазвитие"],
        "emotionalTrigger": "жадность",
        "targetAudience": "Молодые амбициозные люди 20-35, хотят разбогатеть"
      }
    ]
  </example_output>

  <thinking_process>
    Для каждого поста:
    1. Прочитай headline и description — пойми О ЧЁМ контент
    2. Определи ОДНУ главную тему из ALLOWED_TOPICS
    3. Сформулируй подтему (1-3 слова)
    4. Определи тип hook (как зацепили внимание)
    5. Определи формулу (какой паттерн контента использован)
    6. Предположи ПОЧЕМУ это залетело (учитывая views и viralityScore)
    7. Извлеки 3-5 конкретных тегов (не общих!)
    8. Определи эмоциональный триггер
    9. Опиши целевую аудиторию
  </thinking_process>
</system_instruction>`

// ==========================================
// Main Analysis Functions
// ==========================================

/**
 * Analyze a batch of content items using Claude AI
 */
export async function analyzeContentBatch(items: ContentForAnalysis[]): Promise<AIAnalysisResult[]> {
  if (items.length === 0) return []

  // Prepare input data
  const inputData = items.map(item => ({
    id: item.id,
    headline: item.headline,
    description: item.description?.slice(0, MAX_DESCRIPTION_LENGTH) || null,
    contentType: item.contentType,
    views: item.views,
    viralityScore: item.viralityScore,
    sourceUsername: item.sourceUsername
  }))

  console.log(`[AI Analyzer] Sending ${items.length} items to Claude...`)

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Проанализируй следующие посты и верни JSON с анализом:\n\n<input_data>\n${JSON.stringify(inputData, null, 2)}\n</input_data>`
      }]
    })

    // Extract text from response
    const textBlock = response.content.find(block => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error("No text in AI response")
    }

    // Clean response text (remove markdown code fences if present)
    let responseText = textBlock.text.trim()
    if (responseText.startsWith('```json')) {
      responseText = responseText.slice(7)
    } else if (responseText.startsWith('```')) {
      responseText = responseText.slice(3)
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.slice(0, -3)
    }
    responseText = responseText.trim()

    // Parse JSON response
    const results: AIAnalysisResult[] = JSON.parse(responseText)
    console.log(`[AI Analyzer] Successfully analyzed ${results.length} items`)

    return results

  } catch (error) {
    console.error(`[AI Analyzer] Error:`, error)
    throw error
  }
}

/**
 * Analyze content items and save results to database
 */
export async function analyzeAndSaveContentItems(itemIds: string[]): Promise<number> {
  if (itemIds.length === 0) return 0

  const MIN_VIEWS_FOR_AI = 50000

  // Fetch items from database (simple query without relations)
  const items = await prisma.contentItem.findMany({
    where: {
      id: { in: itemIds }
    }
  })

  // Filter: only items with 50K+ views that haven't been analyzed yet
  const itemsToAnalyze = items.filter(item => !item.aiAnalyzedAt && item.views >= MIN_VIEWS_FOR_AI)

  const skippedLowViews = items.filter(item => !item.aiAnalyzedAt && item.views < MIN_VIEWS_FOR_AI).length
  if (skippedLowViews > 0) {
    console.log(`[AI Analyzer] Skipped ${skippedLowViews} items with < ${MIN_VIEWS_FOR_AI} views`)
  }

  if (itemsToAnalyze.length === 0) {
    console.log(`[AI Analyzer] No items to analyze (min ${MIN_VIEWS_FOR_AI} views required)`)
    return 0
  }

  console.log(`[AI Analyzer] Analyzing ${itemsToAnalyze.length} items in batches of ${BATCH_SIZE}`)

  let analyzed = 0

  // Process in batches
  for (let i = 0; i < itemsToAnalyze.length; i += BATCH_SIZE) {
    const batch = itemsToAnalyze.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(itemsToAnalyze.length / BATCH_SIZE)

    console.log(`[AI Analyzer] Processing batch ${batchNum}/${totalBatches}`)

    // Prepare data for analysis
    const contentForAnalysis: ContentForAnalysis[] = batch.map(item => {
      // Extract username from sourceUrl (e.g., "https://instagram.com/zahar_bz" -> "zahar_bz")
      let sourceUsername: string | null = null
      if (item.sourceUrl) {
        const match = item.sourceUrl.match(/instagram\.com\/([^\/\?]+)/)
        sourceUsername = match ? match[1] : null
      }

      return {
        id: item.id,
        headline: item.headline,
        description: item.description,
        contentType: item.contentType,
        views: item.views,
        viralityScore: item.viralityScore,
        sourceUsername
      }
    })

    try {
      // Analyze batch
      const results = await analyzeContentBatch(contentForAnalysis)

      // Save results to database
      for (const result of results) {
        await prisma.contentItem.update({
          where: { id: result.id },
          data: {
            aiTopic: result.topic,
            aiSubtopic: result.subtopic,
            aiHookType: result.hookType,
            aiContentFormula: result.contentFormula,
            aiSuccessReason: result.successReason,
            aiTags: JSON.stringify(result.tags),
            aiEmotionalTrigger: result.emotionalTrigger,
            aiTargetAudience: result.targetAudience,
            aiAnalyzedAt: new Date()
          }
        })
        analyzed++
      }

      console.log(`[AI Analyzer] Batch ${batchNum} complete: ${results.length} items analyzed`)

    } catch (error) {
      console.error(`[AI Analyzer] Batch ${batchNum} failed:`, error)
      // Continue with next batch even if this one failed
    }

    // Pause between batches (except for last batch)
    if (i + BATCH_SIZE < items.length) {
      console.log(`[AI Analyzer] Pausing 2s before next batch...`)
      await sleep(2000)
    }
  }

  console.log(`[AI Analyzer] Complete: ${analyzed}/${items.length} items analyzed`)
  return analyzed
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ==========================================
// Exports
// ==========================================

export { BATCH_SIZE as AI_BATCH_SIZE }
