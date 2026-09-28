# Task: hub-adoption-docs

- Дата: 2026-09-28
- Проект: kutuncev-crm
- Ветка: feature/hub-adoption-docs
- Статус: done

## Задача
Первый рабочий цикл по стандарту Engineering Hub (пилот Фазы II, Google Apps Script):
README, ADR-0001, контекст задачи Level 2, исключение для `.zcode/tasks/` в .gitignore.

## Требования
- `README.md` (в проекте не было)
- `docs/adr/0001-adopt-engineering-hub.md` по шаблону кластера
- `.gitignore`: `!.zcode/tasks/` — иначе задачи Level 2 игнорируются правилом `.zcode/*`

## Ограничения
- Код клиента (`Code.gs`, HTML) не изменять
- `ИНСТРУКЦИЯ.md` не трогать

## Acceptance criteria
- [x] README, ADR, task-файл созданы
- [x] `.zcode/tasks/` отслеживается git (проверить `git ls-files .zcode`)
- [x] Работа на ветке `feature/`, коммит Conventional Commits (en)

## Изменяемые файлы
- `README.md` (новый), `docs/adr/0001-…` (новый), `.zcode/tasks/…` (новый), `.gitignore`

## Итог
Выполнено в этом же коммите. Тесты не требуются (docs-only). Merge в main — по
подтверждению пользователя (Level C).
