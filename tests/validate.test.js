'use strict';

/**
 * Тесты серверной валидации клиента из Code.gs
 * (validateClient_ и помощники — чистые функции, к Apps Script не обращаются).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');
const api = new Function(
  src + '\nreturn { CLIENT_FIELDS, clean_, fieldIndex_, validateClient_, assertHttpsUrl_, findDuplicateUsername_ };'
)();

const LISTS = {
  categories: ['Блогер', 'Магазин', 'Услуга', 'Другое'],
  statuses: ['Новый', 'В работе', 'Ожидание', 'Сделка', 'Отказ']
};

/** Строка листа «Клиенты» по раскладке CLIENT_FIELDS (сценарий редактирования). */
function existingRow(over) {
  const row = api.CLIENT_FIELDS.map(function () { return ''; });
  Object.keys(over || {}).forEach(function (key) {
    row[api.fieldIndex_(key)] = over[key];
  });
  return row;
}

function validClient() {
  return {
    id: '', name: 'Мария', igUsername: 'maria.flowers',
    igLink: 'https://www.instagram.com/maria.flowers/',
    avatar: 'https://scontent.example/photo.jpg',
    bio: 'Цветы', phone: '+7 900 000-00-00', email: 'maria@example.com',
    city: 'Москва', notes: '', category: 'Блогер', status: 'Новый',
    likeLevel: '', sessionMoney: '', tattooCount: ''
  };
}

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log('  ok  ' + name);
}
function checkThrows(name, fn, messagePart) {
  assert.throws(fn, new RegExp(messagePart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  passed++;
  console.log('  ok  ' + name);
}

/* ---------------- обязательные данные ---------------- */

console.log('validateClient_: обязательные поля:');
check('корректный клиент проходит', () => api.validateClient_(validClient(), null, LISTS));
check('только имя проходит', () => {
  const c = validClient();
  c.igUsername = '';
  api.validateClient_(c, null, LISTS);
});
check('только ник проходит', () => {
  const c = validClient();
  c.name = '';
  api.validateClient_(c, null, LISTS);
});
checkThrows('пустые имя и ник отклоняются', () => {
  const c = validClient();
  c.name = '';
  c.igUsername = '';
  api.validateClient_(c, null, LISTS);
}, 'хотя бы имя или Instagram-ник');

/* ---------------- ограничения длины ---------------- */

console.log('validateClient_: длины:');
check('имя 200 символов проходит', () => {
  const c = validClient();
  c.name = 'а'.repeat(200);
  api.validateClient_(c, null, LISTS);
});
checkThrows('имя 201 символ отклоняется', () => {
  const c = validClient();
  c.name = 'а'.repeat(201);
  api.validateClient_(c, null, LISTS);
}, 'Имя» слишком длинное');
check('notes 5000 символов проходит', () => {
  const c = validClient();
  c.notes = 'n'.repeat(5000);
  api.validateClient_(c, null, LISTS);
});
checkThrows('notes 5001 символ отклоняется', () => {
  const c = validClient();
  c.notes = 'n'.repeat(5001);
  api.validateClient_(c, null, LISTS);
}, 'Примечания» слишком длинное');
checkThrows('igUsername 31 символ отклоняется', () => {
  const c = validClient();
  c.igUsername = 'a'.repeat(31);
  api.validateClient_(c, null, LISTS);
}, 'слишком длинное');
checkThrows('кириллица в нике отклоняется', () => {
  const c = validClient();
  c.igUsername = 'мария';
  api.validateClient_(c, null, LISTS);
}, 'только латинские буквы');

/* ---------------- оценка ---------------- */

console.log('validateClient_: оценка:');
check('пустая оценка проходит', () => {
  const c = validClient();
  c.likeLevel = '';
  api.validateClient_(c, null, LISTS);
});
check('числовая оценка 3 проходит', () => {
  const c = validClient();
  c.likeLevel = 3;
  api.validateClient_(c, null, LISTS);
});
checkThrows('likeLevel = 6 отклоняется', () => {
  const c = validClient();
  c.likeLevel = '6';
  api.validateClient_(c, null, LISTS);
}, 'от 1 до 5');
checkThrows('likeLevel = abc отклоняется', () => {
  const c = validClient();
  c.likeLevel = 'abc';
  api.validateClient_(c, null, LISTS);
}, 'от 1 до 5');

/* ---------------- деньги и количество ---------------- */

console.log('validateClient_: деньги и татуировки:');
check('пустой доход проходит', () => {
  const c = validClient();
  c.sessionMoney = '';
  api.validateClient_(c, null, LISTS);
});
check('доход «5 000,50» проходит', () => {
  const c = validClient();
  c.sessionMoney = '5 000,50';
  api.validateClient_(c, null, LISTS);
});
checkThrows('sessionMoney = abc отклоняется', () => {
  const c = validClient();
  c.sessionMoney = 'abc';
  api.validateClient_(c, null, LISTS);
}, 'должно быть числом');
checkThrows('sessionMoney = -100 отклоняется', () => {
  const c = validClient();
  c.sessionMoney = '-100';
  api.validateClient_(c, null, LISTS);
}, 'отрицательным');
check('tattooCount = 0 проходит', () => {
  const c = validClient();
  c.tattooCount = '0';
  api.validateClient_(c, null, LISTS);
});
checkThrows('tattooCount = -1 отклоняется', () => {
  const c = validClient();
  c.tattooCount = '-1';
  api.validateClient_(c, null, LISTS);
}, 'отрицательным');
checkThrows('tattooCount = abc отклоняется', () => {
  const c = validClient();
  c.tattooCount = 'abc';
  api.validateClient_(c, null, LISTS);
}, 'целым числом');
checkThrows('tattooCount = 2.5 отклоняется', () => {
  const c = validClient();
  c.tattooCount = '2.5';
  api.validateClient_(c, null, LISTS);
}, 'целым числом');

/* ---------------- категория и статус ---------------- */

console.log('validateClient_: категория и статус:');
check('категория из настроек проходит', () => {
  const c = validClient();
  c.category = 'Магазин';
  api.validateClient_(c, null, LISTS);
});
checkThrows('категория вне настроек отклоняется', () => {
  const c = validClient();
  c.category = 'Мусор';
  api.validateClient_(c, null, LISTS);
}, 'не входит в список');
checkThrows('статус вне настроек отклоняется', () => {
  const c = validClient();
  c.status = 'Удалён';
  api.validateClient_(c, null, LISTS);
}, 'не входит в список');
check('прежний статус (убран из настроек) сохраняется при редактировании', () => {
  const c = validClient();
  c.status = 'Старый статус';
  api.validateClient_(c, existingRow({ status: 'Старый статус' }), LISTS);
});
checkThrows('новый статус вне настроек отклоняется даже при редактировании', () => {
  const c = validClient();
  c.status = 'Старый статус';
  api.validateClient_(c, existingRow({ status: 'Другой старый' }), LISTS);
}, 'не входит в список');

/* ---------------- URL ---------------- */

console.log('assertHttpsUrl_:');
check('https://instagram.com/user проходит', () => api.assertHttpsUrl_('https://instagram.com/user', 'Ссылка'));
check('https://www.instagram.com/user/ проходит', () => api.assertHttpsUrl_('https://www.instagram.com/user/', 'Ссылка'));
check('пустая ссылка проходит', () => api.assertHttpsUrl_('', 'Ссылка'));
checkThrows('javascript: отклоняется', () => api.assertHttpsUrl_('javascript:alert(1)', 'Ссылка'), 'https://');
checkThrows('data: отклоняется', () => api.assertHttpsUrl_('data:text/html;base64,PHNjcmlwdD4=', 'Ссылка'), 'https://');
checkThrows('vbscript: отклоняется', () => api.assertHttpsUrl_('vbscript:msgbox(1)', 'Ссылка'), 'https://');
checkThrows('http:// отклоняется', () => api.assertHttpsUrl_('http://instagram.com/user', 'Ссылка'), 'https://');
checkThrows('произвольный текст отклоняется', () => api.assertHttpsUrl_('не ссылка', 'Ссылка'), 'https://');
checkThrows('javascript: в igLink отклоняется валидатором клиента', () => {
  const c = validClient();
  c.igLink = 'javascript:alert(document.cookie)';
  api.validateClient_(c, null, LISTS);
}, 'Instagram-ссылка');
checkThrows('data: в avatar отклоняется валидатором клиента', () => {
  const c = validClient();
  c.avatar = 'data:image/svg+xml,<svg onload="alert(1)">';
  api.validateClient_(c, null, LISTS);
}, 'Ссылка на аватар');

/* ---------------- дубликат Instagram-ника ---------------- */

console.log('findDuplicateUsername_:');
const idIdx = api.fieldIndex_('id');
const unIdx = api.fieldIndex_('igUsername');
// значения строк листа «Клиенты» без заголовка: строка листа = индекс + 2
const dupRows = [
  existingRow({ id: 'uuid-1', igUsername: 'maria.flowers' }),
  existingRow({ id: 'uuid-2', igUsername: 'other_user' }),
  existingRow({ id: 'uuid-3', igUsername: '' })
];
check('находит дубликат без учёта регистра', () => {
  assert.strictEqual(
    api.findDuplicateUsername_(dupRows, idIdx, unIdx, 'MARIA.FLOWERS', ''), 2);
});
check('нет дубликата — возвращает 0', () => {
  assert.strictEqual(
    api.findDuplicateUsername_(dupRows, idIdx, unIdx, 'free.nick', ''), 0);
});
check('пустой искомый ник — возвращает 0', () => {
  assert.strictEqual(api.findDuplicateUsername_(dupRows, idIdx, unIdx, '   ', ''), 0);
});
check('пустые ячейки ника в таблице не дают ложного дубликата', () => {
  assert.strictEqual(api.findDuplicateUsername_(dupRows, idIdx, unIdx, '', ''), 0);
});
check('своя строка при редактировании не считается дубликатом', () => {
  assert.strictEqual(
    api.findDuplicateUsername_(dupRows, idIdx, unIdx, 'Maria.Flowers', 'uuid-1'), 0);
});
check('чужая строка находится и при редактировании', () => {
  assert.strictEqual(
    api.findDuplicateUsername_(dupRows, idIdx, unIdx, 'other_user', 'uuid-1'), 3);
});
check('ники сравниваются с обрезкой пробелов', () => {
  assert.strictEqual(api.findDuplicateUsername_(
    [existingRow({ id: 'uuid-1', igUsername: '  maria.flowers  ' })],
    idIdx, unIdx, ' maria.flowers ', ''), 2);
});

console.log('\nПройдено проверок: ' + passed);
