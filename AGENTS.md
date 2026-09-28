# AGENTS.md — Kutuncev (Google Apps Script, Kwork)

## Что это за проект
CRM-скрипт клиента на Google Apps Script: `Code.gs` (серверная логика), веб-интерфейс
`Index.html` / `JavaScript.html` / `Styles.html`, манифест `appsscript.json`, тесты
`tests/` (запускаются локально через Node), пользовательская `ИНСТРУКЦИЯ.md`.

## Правила
- Деплой в Google Apps Script — только вручную пользователем (Level C).
- `appsscript.json` (ID проекта) не менять без явного запроса.
- После изменения логики — прогонять тесты `tests/`.
- Дедупликация клиентов по Instagram-нику (коммит 70f8164) — не ломать.
- Код и коммиты — английский; `ИНСТРУКЦИЯ.md` — русский.
- `.clasp.json` / `.clasprc.json` (учётные данные) не коммитятся — уже в .gitignore.
