# src/content — где что редактировать

Единая точка входа для контента и текста интерфейса. Ре-экспорты, чтобы не
охотиться по компонентам. Реальные данные пока живут в `src/lib/*`; при
необходимости их можно позже перенести сюда или в Supabase без ломки импортов.

- **Клетки поля** (id, name, loka, wisdom, snakes/ladders):
  `src/lib/lila-board.ts`. Ре-экспорт: `src/content/cells.ts`.
- **Расширенный опыт клетки** (shortMeaning, reflectionQuestion, dailyPractice,
  keywords, tone): `src/lib/cell-experience.ts`. Ре-экспорт: `src/content/cells.ts`.
- **UI-копия** (кнопки, ошибки, пустые состояния): `src/content/copy.ts`.
- **Онбординг** (тексты 4 экранов): `src/components/lila/OnboardingModal.tsx`.
  Быстрый доступ через `src/content/onboarding.ts`.
- **Шеринг** (шаблоны текста для Telegram): `src/lib/share.ts`.
  Ре-экспорт: `src/content/share.ts`.
- **Подсказки Гуру** (быстрые вопросы на карточке клетки):
  `src/components/lila/CurrentCellSheet.tsx` и `GuruChatSheet.tsx`.

Валидация контента: `src/lib/cell-experience.test.ts`,
`src/lib/gameplay-integrity.test.ts`, `src/content/content-integrity.test.ts`.
