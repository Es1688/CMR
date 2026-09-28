# ADR-0001: Переход на стандарт Engineering Hub

- Статус: accepted
- Дата: 2026-09-28

## Контекст
Кластер `~/work` переведён на стандарт Engineering Hub (техпроект:
`~/work/it/zcode/ZCODE-HUB-DESIGN.md`, ADR кластера — 0001). Проект включён в пилотную
тройку Фазы II как представитель клиентских проектов на Google Apps Script (Kwork).

## Решение
- Git: github-flow, ветка по умолчанию `main`, Conventional Commits (en).
- Правила проекта — `AGENTS.md` (Level 1), манифест — `.zcode/project.yaml`.
- Контекст задач — `.zcode/tasks/<id>.md` (Level 2, добавлено исключение в .gitignore).
- Служебное `.zcode/*` не версионируется, кроме `project.yaml` и `tasks/`.

## Последствия
- Деплой в Google Apps Script — только вручную пользователем (Level C).
- `.clasp.json` / `.clasprc.json` не коммитятся.
- Изменения логики — только с прогоном `tests/`.
