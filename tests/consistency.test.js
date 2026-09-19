'use strict';

/**
 * Проверки консистентности проекта:
 *  1) клиентский скрипт из JavaScript.html синтаксически валиден;
 *  2) все элемент-идентификаторы, которые запрашивает JS, есть в Index.html;
 *  3) все серверные функции, вызываемые через callServer(), есть в Code.gs;
 *  4) Index.html подключает Styles и JavaScript.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'JavaScript.html'), 'utf8');
const index = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
const gs = fs.readFileSync(path.join(root, 'Code.gs'), 'utf8');

// 1. Синтаксис клиентского скрипта
const match = js.match(/<script>([\s\S]*)<\/script>/);
assert.ok(match, 'в JavaScript.html должен быть ровно один блок <script>…</script>');
new Function(match[1]); // бросит SyntaxError, если код битый
console.log('  ok  синтаксис клиентского скрипта валиден');

// 2. Идентификаторы
const ids = new Set();
for (const m of js.matchAll(/\$\('([^']+)'\)/g)) ids.add(m[1]);
assert.ok(ids.size > 0, 'JS не запрашивает ни одного идентификатора — странно');
for (const id of ids) {
  assert.ok(
    index.includes('id="' + id + '"'),
    'Index.html не содержит id="' + id + '", который используется в JS'
  );
}
console.log('  ok  все ' + ids.size + ' идентификаторов из JS найдены в Index.html');

// 3. Серверные функции
const serverFns = new Set();
for (const m of js.matchAll(/callServer\('([^']+)'/g)) serverFns.add(m[1]);
for (const fn of serverFns) {
  assert.ok(
    new RegExp('function\\s+' + fn + '\\s*\\(').test(gs),
    'Code.gs не содержит функцию ' + fn + ', которую вызывает интерфейс'
  );
}
console.log('  ok  все серверные функции на месте: ' + Array.from(serverFns).join(', '));

// 4. Подключение файлов интерфейса
assert.ok(index.includes("include('Styles')"), 'Index.html должен подключать Styles');
assert.ok(index.includes("include('JavaScript')"), 'Index.html должен подключать JavaScript');
assert.ok(gs.includes("createTemplateFromFile('Index')"), 'doGet должен открывать шаблон Index');
console.log('  ok  Index подключает Styles и JavaScript, doGet отдаёт Index');

console.log('\nВсе проверки консистентности пройдены.');
