# Task: ci-github-actions

- Дата: 2026-09-28
- Проект: kutuncev-crm
- Ветка: feature/ci-github-actions
- Статус: done

## Задача
Первый CI в кластере (Фаза III, эталонный пример — Kutuncev): GitHub Actions, запускающий
тесты `tests/*.test.js` на каждый push/PR.

## Требования
- `.github/workflows/ci.yml`: ubuntu-latest, Node 20, последовательный прогон всех тестов
- `project.yaml`: `quality.test` дополнен ссылкой на CI, добавлена секция `ci`

## Ограничения
- Код клиента (`Code.gs`, HTML) не изменять
- Тесты не переписывать

## Acceptance criteria
- [x] workflow создан, синтаксис YAML валиден
- [x] цикл стандарта: feature-ветка, задача Level 2, conventional commit
- [ ] CI зелёный на GitHub после merge+push (проверить после подтверждения)

## Изменяемые файлы
- `.github/workflows/ci.yml` (новый)
- `.zcode/project.yaml` (quality + секция ci)
- `.zcode/tasks/20260928-ci-github-actions.md` (новый)

## Итог
Тесты проекта — plain-Node скрипты без зависимостей (assert/fs/path), запускаются
последовательно `node <file>`. Локально node не установлен — CI становится единственным
способом прогона (задолженность окружения из Фазы II закрывается облаком). Merge в main
и push — по подтверждению пользователя (Level C).
