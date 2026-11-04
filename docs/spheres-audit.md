# Аудит сфер жизни (04.11.2026, до правок)

`SphereId` — объединение литералов `'faith' | 'family' | 'health' | 'rizq' | 'knowledge' | 'charity' | 'ideas' | 'other'` (`knowledge` и `charity` в списке не используются). Список — `spheres` в `data/appData.ts`, иконки — словарь в `SphereIcon`.

| Место | Файл | Что делает со сферами | Что будет |
|---|---|---|---|
| Список и цвета | `data/appData.ts` | `spheres: Sphere[]` — 6 сфер, цвет hex | `BUILTIN_SPHERES` с иконкой и цветом |
| Иконки | `components/SphereIcon.tsx` | словарь `id → иконка` | иконка по `useSpheres()`: у пользовательской — её `icon` |
| Тип | `types/index.ts` | литералы | `string` |
| Главная, ряд карточек со счётчиками | `pages/Home.tsx` | `spheres.map` | `useSpheres()`, карточка «+ Добавить сферу», долгое нажатие на пользовательской — меню |
| Выбор сферы при создании | `task/SphereSheet.tsx` (из `TaskComposer`) | `spheres.map` | `useSpheres()` |
| Чип сферы в карточке создания | `task/TaskComposer.tsx` | `spheres.find` | `getSphere` |
| «Подробно» | `task/TaskDetailForm.tsx` | `spheres.find` | `getSphere` |
| «Переместить в список» | `task/TaskActionSheet.tsx` | `spheres.map`, у «Прочее» нет разделов | `useSpheres()` |
| «Переместить в раздел» | `pages/SphereDetail.tsx` | разделы своей сферы | без изменений, работает и для пользовательской |
| «Сделать подзадачей…», группы | `task/ParentPicker.tsx` | группировка по `spheres` | `useSpheres()`; дела удалённой сферы — в «Прочее» |
| Страница сферы, маршрут `/sphere/:id` | `pages/SphereDetail.tsx` | `spheres.find`, иначе «Сфера не найдена» | `useSpheres()`, меню «⋯» у пользовательской |
| Страница раздела | `pages/SectionDetail.tsx` | `spheres.find` | `useSpheres()` |
| Пресет «+» по экрану | `components/BottomNav.tsx` | жёсткий список id | любая существующая сфера |
| Подпись сферы в мета-строке, иконка в строке | `components/TaskRow.tsx`, `utils/taskOptions.ts` (`formatRowMeta`) | `spheres.find`, иначе «Прочее» | `getSphere`; мета-строка получает название от строки |
| Статистика | `pages/TaskStats.tsx`, `utils/stats.ts` | `bySphere`, подписи по `spheres` | `getSphere`: удалённая сфера считается в «Прочее» |
| Баланс жизни | `pages/LifeBalance.tsx` | все сферы, кроме «Прочее» | `useSpheres()` (пользовательские тоже) |
| Достижения (цели) | `pages/Achievements.tsx` | `spheres.find` | `getSphere` |
| `getSphere` в контексте | `contexts/AppContext.tsx` | поиск по `spheres` | через объединённый список |
| Блоки «Удел» и «Прочее» на «Сегодня» | `today/TodaySphereList.tsx`, `today/BlockDragLayer.tsx`, `pages/DayTasks.tsx` | `'rizq' \| 'other'` | остаются только у этих двух; у пользовательских блоков нет |
| Время «Удела» в расписании | `sphereSlots` | по `SphereId` | без изменений |

## Замечание о «Сегодня»

На «Сегодня» показываются дела со временем (в расписании) и блоки «Удел»/«Прочее» (дела без времени на сегодня или без даты). Дела Веры, Здоровья, Семьи и Идей с сегодняшней датой без времени на «Сегодня» сейчас не видны, только на экране дня. Пользовательские сферы будут вести себя так же: дела со временем — обычные строки расписания с подписью сферы. Расчёт расписания не меняется.
