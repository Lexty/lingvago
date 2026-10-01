# DEV_LOOP_PLAN — декомпозиция реализации под скилл `dev-loop`

> Источники истины: `SPEC.md`, `MVP_PLAN.md` (главенствует по составу Фазы 1), `DESIGN_TOKENS.md`,
> `LEARNING_SCIENCE.md`, `EXAM_RESEARCH.md`. Этот файл — **план задач**, а не новая спецификация:
> он нарезает работу на куски, каждый из которых = один прогон `dev-loop` (build-mode).

## 0. Как это исполнять

- **Один блок «T-…» = один запуск `dev-loop`** в изолированном worktree. Скилл сам гонит
  draft → harden, держит детерминированные гейты как авторитет сходимости, и кладёт результат
  в отдельную ветку+тег (НЕ авто-мержит в `main`). После каждого прогона — ревью diff и merge вручную.
- **Учёба важнее кода (MVP_PLAN §2).** Это план реализации, но порядок и объём подчинены 11-дневной
  реальности: **неснижаемый код-минимум = T0–T6 + WP-A + WP-B** = «Фаза 1 **app-реализация** готова». Всё ниже —
  stretch, строго после минимума.
  > ⚠️ Это только **кодовая** часть. Полная «**Фаза 1 готова**» по MVP_PLAN §6 дополнительно требует **некодового гейта**:
  > ежедневный учебный протокол §1 идёт с дня 0 и первый mock сделан в день 1. dev-loop его не строит — он вне приложения.
- **Гейт каждой задачи (Definition of Done для dev-loop):**
  `pnpm check` зелёный. **Шаг `e2e` добавляется в `pnpm check` начиная с T4** (там ставится Playwright):
  до T4 `pnpm check` = `typecheck (tsc strict) + lint (eslint) + unit (vitest run) + build (vite)`;
  с T4 и далее = `… + build (vite) + e2e (playwright)` (**build перед e2e** — E2E идут по собранному `dist/` через `vite preview`).
  Плюс перечисленные в задаче таргетные тесты (unit и/или E2E) реально существуют и проверяют поведение,
  а не имитируют его. Привязка тестов к фактически построенному (SPEC §10.2/§10.5): задача добавляет
  тесты только на то, что в ней построено.
- **Зависимости** указаны в каждом блоке. Идти топологически; параллелить можно только независимые ветки.
- **TS strict, без UI-библиотек, только semantic/component-токены** (SPEC §10.1, DESIGN_TOKENS).

---

## 1. Граф задач (топологический порядок)

```
T0 scaffold ─┬─ T1 tokens/theme ─┐
             ├─ T2 i18n ──────────┼─ T4 e2e-harness ─┐
             └─ T3 PWA/offline ───┘                  ├─ WP-A ─┬─ WP-B ── [Фаза 1 app-реализация готова*]
  T0 ──────── T5 db (lingvago2) ──────────────────────┘       │
  T5+T3 ───── T6 content-pipeline(min) ───────────────────────┘
   (T4 ← T1,T2,T3 — НЕ от T5; WP-A ← T4+T5; WP-B ← WP-A+T6)      (stretch, после минимума ↓)
   стрелка ─→ = зависимость (НЕ порядок-цепочка); горизонтальная близость ничего не значит:
   WP-B ─→ WP-C        WP-A ─→ WP-D        WP-A,T5 ─→ WP-E       (три независимые stretch-задачи)
   T5,T6 ─→ T7 Numbers ─→ T8 Conjugation                        (перенос режимов — отдельный трек)
   «Фаза 1 готова» + T7 + T8 ─→ T9 cutover-replace-v1           (гейт замены v1, SPEC §10.6)
```
WP-C/D/E и перенос режимов T7/T8 — **независимые** stretch-треки (WP-C НЕ ждёт T7/T8; WP-D/E зависят от WP-A, а не от WP-C).
T9 (cutover) зависит от «Фаза 1 готова» + T7/T8 (паритет режимов — гейт замены v1, SPEC §10.6).

\* Узел «Фаза 1 app-реализация готова» = **T0,T1,T2,T3,T4,T5,T6,WP-A,WP-B** (кодовая часть). Полная «Фаза 1 готова»
по MVP_PLAN §6 = это **+ некодовый гейт** (учебный протокол §1 с дня 0, первый mock в день 1). Остальное (T7–T9,
WP-C/D/E) — stretch по приоритету MVP_PLAN §3/§5; режется с конца при нехватке времени (MVP_PLAN §5 «порядок отказа»).

---

## 2. Обязательный минимум (Фаза 1)

### T0 — Scaffold проекта · S
**Цель:** рабочий каркас, по которому проходит пустой `pnpm check`.
**Depends:** —
**Scope:** Vite+React19+TS(strict); структура каталогов SPEC §10.3
(`src/{content,db,modes,generators,mastery,skills,reference,telemetry,screens,components,styles,i18n,locales}`,
`scripts/`, `public/`, `e2e/`); `package.json` скрипты `dev/build/preview/typecheck/lint/test/test:run/e2e/check`;
eslint+typescript-eslint; vitest (jsdom, fake-indexeddb) с `passWithNoTests`; react-router7 с одним пустым роутом.
**Out of scope:** любые экраны/движки/контент.
**Gates:** `pnpm check` зелёный на пустом приложении (build отдаёт `dist/`, один smoke-unit «рендерится App»). **На T0–T3 `e2e` ещё НЕ в пайплайне** (Playwright ставится в T4) — `pnpm check` = typecheck+lint+unit+build.

### T1 — Дизайн-токены + тема (Авто/Светлая/Тёмная) · S
**Цель:** реализовать DESIGN_TOKENS как `tokens.css` + переключатель темы (SPEC §10.4, §10.6 Calm-manifest).
**Depends:** T0
**Scope:** `src/styles/tokens.css` (3 слоя токенов, light+dark из DESIGN_TOKENS, включая исправленные
AA-контрасты: `--on-cta=#0e1a13`, `--danger=#9e4b46`, muted `#6f6878`); `:root`/`[data-theme]`/`@media prefers-color-scheme`;
хук `useTheme` (как DESIGN_TOKENS §«Тема»: **`auto` → `removeAttribute('data-theme')`** и следование `@media prefers-color-scheme`; `light`/`dark` → `data-theme="light"`/`"dark"`; во всех случаях persist выбора в localStorage); экран/секция Настроек с переключателем.
**Out of scope:** i18n строк (хардкод EN временно, выносится в T2).
**Gates:** unit на `useTheme` (**auto → нет форсированного `data-theme`** +persist; light/dark → `data-theme="light"`/`"dark"` +persist); build. (E2E E2 «тема» — в T4.)

### T2 — Локализация UI RU+EN · S
**Цель:** i18next/react-i18next; системный дефолт, fallback EN если система не RU/EN (SPEC §10.4).
**Depends:** T0 (параллельно T1)
**Scope:** `src/i18n/`, `src/locales/{ru,en}.json`; детект системного языка; переключатель в Настройках (persist);
прогон всех существующих строк через ключи (нет «голых» строк).
**Out of scope:** перевод учебного контента (PT остаётся PT с глоссами).
**Gates:** unit на резолв языка (ru→ru, en→en, fr→en-fallback, persist); build. (E2E E3 — в T4.)

### T3 — PWA / offline app-shell · M
**Цель:** vite-plugin-pwa (Workbox) — precache app-shell, офлайн после первой загрузки, корректное
вытеснение SW (SPEC §10.2, §10.6 PWA-идентичность).
**Depends:** T0
**Scope:** `vite.config.ts` VitePWA: `registerType:'autoUpdate'`, manifest (`name=Lingvago`, `scope:'/'`,
`start_url:'/'`, Calm `theme_color/background_color`, иконки), Workbox `globPatterns` + `skipWaiting`+`clientsClaim`,
`navigateFallback`; precache `content.vN.json` появится в T6. **audio-pack НЕ precache-ить** (SPEC §10.2 — только со stretch-ListeningMode).
**Out of scope:** аудио, контент-пайплайн.
**Gates:** build даёт SW+manifest; unit/проверка что manifest имеет `scope:'/'`,`start_url:'/'`. (E2E E1/E4 — в T4.)

### T4 — E2E-каркас (Playwright) + гейт E1–E6 · M
**Цель:** заложить `e2e/` и обязательный E2E-минимум против **собранного PWA** (SPEC §10.5).
**Depends:** T1, T2, T3 (на момент полного зелёного — также WP-A/WP-B для E1/E5; см. ниже)
**Scope:** Playwright (devDependency, Chromium, headless), webServer = `vite preview` на `dist/`;
`pnpm e2e`; **здесь `e2e` впервые добавляется в `pnpm check`** (после `build`, см. §0); тесты **E2 (тема)**, **E3 (локализация)**, **E4 (офлайн через `context.setOffline(true)`)**, **E6 (обновление SW: новый билд вытесняет старый SW и не отдаёт устаревший app-shell — Workbox `skipWaiting`+`clientsClaim`; обязательный тест SPEC §10.2 #3)**
реализуемы уже сейчас, но с binding-к-построенному (как unit-тесты §10.2): **E4 на T4 проверяет только офлайн-отдачу app-shell** (survival-kit-офлайн-утверждение E4 дописывается в WP-A); **E6 на T4 проверяет только механизм вытеснения SW** — утверждение «прогресс пережил обновление» дописывается там, где появляется реальный персистентный прогресс (T5 + WP-A persist mock-таблицы / WP-E лог), на минимальной реальной фикстуре прогресса, **без добавления T5 в зависимости T4**; **E1 (первый запуск → survival-kit)** и **E5 (≥1 referenceCard офлайн)** дописываются
в рамках WP-A/WP-B соответственно.
**Out of scope:** условные E2E WP-C/D/E.
**Gates:** `pnpm e2e` зелёный для реализованных сценариев; `pnpm check` включает e2e.

### T5 — Слой БД (Dexie `lingvago2`) · M
**Цель:** прогресс-схема v2 в **отдельной** IndexedDB `lingvago2` (SPEC §7.2, §10.6 изоляция от v1 `lingvago`).
**Depends:** T0
**Scope:** `src/db/` Dexie-класс с именем БД **`lingvago2`** (НЕ `lingvago`); стораджи прогресса §7.2
(`cardStates`(FSRS)·`skillMastery`·`attempts`·`sessions`·`annotations`·`settings` вкл. `userAlias`); ts-fsrs-хелперы;
`dexie-react-hooks`. **v1-базу `lingvago` не трогать.**
**Out of scope:** контент-стораджи (read-only) — в T6; движки.
**Gates:** unit (fake-indexeddb): открытие БД, CRUD `settings`/`attempts`, имя БД = `lingvago2`, отсутствие обращений к `lingvago`.

### T6 — Контент-пайплайн (минимальный) + content storage · M
**Цель:** `extraction/normalized/*.json → scripts/build-content.ts → public/content.vN.json → IndexedDB` при первом
запуске/смене версии (SPEC §7.3, §10.2 тест #4/#6 условные).
**Depends:** T5, **T3** (шаг precache `content.vN.json` правит SW-конфиг из T3 → нужен готовый PWA-слой)
**Scope:** `scripts/build-content.ts` (минимум: referenceCards + verbs_inventory для будущих WP-B/Conjugation);
read-only content-стораджи §7.1 со стабильными `contentId`; загрузка `content.vN.json` в IndexedDB по `contentVersion`;
alias-таблица переименований + обработка orphaned-progress (не падать). Precache `content.vN.json` в SW (из T3).
**Out of scope:** полный контент всех групп; миграции сверх version-bump.
**Gates:** unit миграции (version-bump сохраняет прогресс; orphaned-progress архивируется, не валит); `build-content` детерминирован.

### WP-A — «Exam Survival Kit» (одна страница) · S
**Цель:** MVP_PLAN WP-A целиком.
**Depends:** T1, T2, T3, T4, T5
**Scope:** одностраничный кит: чек-лист 4 групп, ссылки на материалы, **mock-таблица по группам** (ручной ввод,
0–50/группа, модель 4×50, SPEC §9.2), дневной план §1, предупреждение «не обнули группу»; **`passThreshold`**
(`totalPassPoints` из 200, опц. `minGroupPoints` из 50; по умолчанию `unknown`) с **однозначным правилом вердикта**
(MVP_PLAN WP-A); **БЕЗ обратного отсчёта дней** (SPEC §16). Все строки — через i18n; цвета — через токены.
**Gates:** unit на правило вердикта (только-totalPass / только-minGroup / оба / ни одного → сырые баллы);
**E2E E1** (первый запуск → кит виден) допилен; **E4 расширяется в WP-A**: офлайн-визит отдаёт не только app-shell, но и survival-kit-страницу. **E6 расширяется в WP-A**: после обновления SW введённая mock-таблица (первый персистентный прогресс) сохраняется — это и есть утверждение «прогресс пережил обновление» из SPEC §10.2 #3.

### WP-B — Справочник (Reference) · M
**Цель:** MVP_PLAN WP-B целиком.
**Depends:** WP-A, T6
**Scope:** перечитываемые `referenceCard` (предлоги de/em/a + контракции + a casa/para casa + исключения + деревья
решений; артикли + подсказки рода; ser/estar; таблицы глаголов). Источник — `referenceCards` из content-пайплайна (T6).
Статический рендер, без движка. ≥6 карточек, доступны офлайн.
**Gates:** unit (рендер карточки из данных, deep-link-якоря существуют); **E2E E5** (≥1 карточка офлайн) допилен.

> **После WP-B = «Фаза 1 app-реализация готова»** (кодовая часть DoD MVP_PLAN §6; полная готовность — ещё некодовый
> учебный протокол §1): зелёный `pnpm check` (вкл. E1–E6), тема+i18n заложены,
> БД `lingvago2` изолирована. Дальше — stretch.

---

## 3. Stretch (строго после минимума; режется с конца)

### T7 — NumbersMode (перенос v1) · M
**Цель:** перенести доказавший себя NumbersMode (SPEC §1.2) — генеративный, ручной ввод в обе стороны
(цифра↔пропись PT), сборка по правилам, диапазон 0–1000+, **порядковые** (Grupo III).
**Depends:** T5, T6
**Scope:** `src/modes/numbers/` + генератор (deterministic/seeded, §6.1); объективная проверка строкой; питает mastery.
**Gates:** unit на генератор (правила vinte e três/cento e quarenta e cinco; cardinais+ordinais; round-trip проверки);
E2E (условный): сыграть несколько итенов с production-вводом.

### T8 — ConjugationMode (перенос v1) · L
**Цель:** перенести ConjugationMode (SPEC §1.2) — «меняй окончание»: лицо+инфинитив → ввод формы; «собрать таблицу».
Генерация из **аутентичных предложений корпуса** (§5а), не слот-филл. Покрытие — весь инвентарь §1.2
(`verbs_inventory.json`, 126 глаголов; `needsTableReview` не показывать в экзамен-режиме без верифиц. таблицы — §6.5).
**Depends:** T7, T6
**Scope:** `src/modes/conjugation/` + генератор; контент-QA-гейт для needsTableReview.
**Gates:** unit (генерация формы по правилу; needsTableReview блокируется до верифиц.; QA-семян зелёный); E2E (условный).

### WP-C — Дриллы рода/артикля + предлогов (production-first) · XL
**Цель:** MVP_PLAN WP-C. GenderArticle (def+indef+контракции) и Preposition (origem/local/tempo/movim./lugar),
ввод/сборка, **паритетные+правдоподобные дистракторы** (SPEC §6.3, LS §3), фидбэк→deep-link в справочник,
простая mastery, кривая L1–L3.
**Depends:** WP-B (НЕ зависит от T7/T8 — это отдельный stretch-трек; приоритет WP-C ≥ переноса режимов, MVP_PLAN §5)
**Gates:** unit (паритет дистракторов §6.3; верифиц. ключи; mastery-доля); **условный E2E** (дрилл L1–L3 с production-вводом и фидбэком→справочник).

### WP-D — Mock-shell с ручным вводом · M
**Цель:** MVP_PLAN WP-D. Таймер 90 мин, без подсказок; ответы/баллы по группам вручную; сохранение в таблицу WP-A;
правило минимума по группе (SPEC §9).
**Depends:** WP-A
**Gates:** unit (тайминг; запись счёта по 4 группам; правило минимума); **условный E2E** (таймированный mock → счёт по группам).

### WP-E — Минимальный лог + экспорт/restore · S
**Цель:** MVP_PLAN WP-E. `attempts/sessions` → IndexedDB; кнопка JSON-экспорт (+`navigator.share`); **restore из бандла**
(SPEC §13.3, §10.2 тест #5). Merge нескольких пользователей — вне Фазы 1.
**Depends:** T5, WP-A
**Gates:** unit (экспорт даёт валидный бандл со schema/app/contentVersion; **import восстанавливает состояние**);
**условный E2E** export→import round-trip.

### T9 — Cutover: замена v1 на той же установке · S
**Цель:** выполнить замену по SPEC §10.6 — **только после** «Фаза 1 готова» + подтверждённых Numbers/Conjugation.
**Depends:** «Фаза 1 готова» (+ T7/T8 для паритета); подтверждённый хостинг/URL v1.
**Scope:** деплой v2 на **тот же origin/`scope=/`/`start_url=/`** (PWA авто-обновляется на месте, иконка сохраняется);
проверить, что новый SW вытесняет старый без «застрявшего» shell; убедиться, что IndexedDB v2 = `lingvago2`
и база v1 `lingvago` не тронута; вывести v1 из эксплуатации.
**Gates:** зелёные E2E E1–E6; **ручная офлайн-проверка на реальном телефоне** (установленный PWA обновился, прогресс v2
сохраняется, откат на v1 возможен до окончательного вывода). Это ручной/деплойный гейт — не только `pnpm check`.

---

## 4. Замечания для исполнителя dev-loop

- **Не авто-мержить** в `main` — каждый прогон оставляет ветку+тег; пользователь ревьюит diff и мержит сам.
- **Тесты — не reward-hacking:** E2E гоняются по `dist/` (собранный PWA), unit — с `fake-indexeddb`; тест должен
  падать, если поведение сломать (проверять это в harden-фазе).
- **Контраст/доступность:** не вводить «голые» hex в компонентах — только токены (исправленные AA-пары уже в `tokens.css`).
- **Привязка тестов к построенному (SPEC §10.2/§10.5):** задача добавляет ровно те unit/E2E, что покрывают её WP;
  сборка без условной WP не должна валить гейт из-за её отсутствующих тестов.
- **При нехватке времени** резать с конца §3 (порядок отказа MVP_PLAN §5), не трогая минимум §2.
