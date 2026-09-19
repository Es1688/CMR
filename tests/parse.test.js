'use strict';

/**
 * Тесты чистых функций парсинга из Code.gs
 * (функции не обращаются к API Apps Script, поэтому их можно проверять в Node).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');
const api = new Function(
  src + '\nreturn { parseInstagramUsername_, parseWebProfileInfo_, parseOgProfile_, decodeHtmlEntities_ };'
)();

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log('  ok  ' + name);
}

/* ---------------- parseInstagramUsername_ ---------------- */

console.log('parseInstagramUsername_:');
check('полная ссылка', () =>
  assert.strictEqual(api.parseInstagramUsername_('https://www.instagram.com/maria.shop/'), 'maria.shop'));
check('ссылка без протокола', () =>
  assert.strictEqual(api.parseInstagramUsername_('www.instagram.com/maria.shop'), 'maria.shop'));
check('ссылка с запросом', () =>
  assert.strictEqual(api.parseInstagramUsername_('https://www.instagram.com/maria.shop/?hl=ru'), 'maria.shop'));
check('короткий домен instagr.am', () =>
  assert.strictEqual(api.parseInstagramUsername_('http://instagr.am/maria.shop'), 'maria.shop'));
check('ник с @', () =>
  assert.strictEqual(api.parseInstagramUsername_('@maria.shop'), 'maria.shop'));
check('просто ник', () =>
  assert.strictEqual(api.parseInstagramUsername_('maria.shop'), 'maria.shop'));
check('ник с точками и подчёркиванием', () =>
  assert.strictEqual(api.parseInstagramUsername_('user_name.01'), 'user_name.01'));
check('пустая строка', () =>
  assert.strictEqual(api.parseInstagramUsername_(''), ''));
check('пробелы', () =>
  assert.strictEqual(api.parseInstagramUsername_('   '), ''));
check('ссылка на пост -> пусто', () =>
  assert.strictEqual(api.parseInstagramUsername_('https://www.instagram.com/p/Cx1y2z3abc/'), ''));
check('ссылка на reels -> пусто', () =>
  assert.strictEqual(api.parseInstagramUsername_('https://www.instagram.com/reel/Cx1y2z3abc/'), ''));
check('explore -> пусто', () =>
  assert.strictEqual(api.parseInstagramUsername_('https://www.instagram.com/explore/'), ''));
check('кириллица -> пусто', () =>
  assert.strictEqual(api.parseInstagramUsername_('мария'), ''));
check('мусор -> пусто', () =>
  assert.strictEqual(api.parseInstagramUsername_('hello world!'), ''));
check('корень instagram.com -> пусто', () =>
  assert.strictEqual(api.parseInstagramUsername_('https://www.instagram.com/'), ''));

/* ---------------- parseWebProfileInfo_ ---------------- */

console.log('parseWebProfileInfo_:');
const apiJson = {
  status: 'ok',
  data: {
    user: {
      id: '123',
      username: 'maria.flowers',
      full_name: 'Мария Иванова',
      biography: 'Цветы в Москве · доставка 24/7',
      is_private: false,
      profile_pic_url: 'https://cdn.example/low.jpg',
      profile_pic_url_hd: 'https://cdn.example/hd.jpg',
      edge_followed_by: { count: 1234 },
      edge_follow: { count: 120 }
    }
  }
};
check('полный ответ', () => {
  const r = api.parseWebProfileInfo_(apiJson);
  assert.deepStrictEqual(r, {
    username: 'maria.flowers',
    fullName: 'Мария Иванова',
    avatar: 'https://cdn.example/hd.jpg',
    bio: 'Цветы в Москве · доставка 24/7'
  });
});
check('нет данных о пользователе -> null', () =>
  assert.strictEqual(api.parseWebProfileInfo_({ data: {} }), null));
check('пустой ответ -> null', () =>
  assert.strictEqual(api.parseWebProfileInfo_(null), null));
check('без full_name -> пустая строка', () => {
  const r = api.parseWebProfileInfo_({ data: { user: { username: 'x', biography: '' } } });
  assert.strictEqual(r.fullName, '');
  assert.strictEqual(r.avatar, '');
});

/* ---------------- parseOgProfile_ ---------------- */

console.log('parseOgProfile_:');
const ogHtml = [
  '<html><head>',
  '<meta property="og:title" content="Мария Иванова (@maria.flowers) • Instagram photos and videos" />',
  '<meta property="og:description" content="1,234 Followers, 567 Following, 89 Posts - See Instagram photos and videos from Мария Иванова (@maria.flowers)" />',
  '<meta property="og:image" content="https://scontent.example/photo.jpg" />',
  '</head><body></body></html>'
].join('');
check('полные og-метатеги', () => {
  const r = api.parseOgProfile_(ogHtml, 'maria.flowers');
  assert.strictEqual(r.username, 'maria.flowers');
  assert.strictEqual(r.fullName, 'Мария Иванова');
  assert.strictEqual(r.avatar, 'https://scontent.example/photo.jpg');
  assert.strictEqual(r.bio, '');
});
check('content перед property (обратный порядок атрибутов)', () => {
  const html = '<meta content="Иван (@ivan.mebel)" property="og:title">' +
    '<meta content="https://pic.example/ivan.jpg" property="og:image">';
  const r = api.parseOgProfile_(html, 'ivan.mebel');
  assert.strictEqual(r.username, 'ivan.mebel');
  assert.strictEqual(r.fullName, 'Иван');
  assert.strictEqual(r.avatar, 'https://pic.example/ivan.jpg');
});
check('только @ник в заголовке, без полного имени', () => {
  const html = '<meta property="og:title" content="@shop.only • Instagram photos and videos">';
  const r = api.parseOgProfile_(html, 'shop.only');
  assert.strictEqual(r.username, 'shop.only');
  assert.strictEqual(r.fullName, '');
});
check('без og-метатегов -> null', () =>
  assert.strictEqual(api.parseOgProfile_('<html><head></head></html>', 'x'), null));
check('пустая страница -> null', () =>
  assert.strictEqual(api.parseOgProfile_('', 'x'), null));
check('ник не найден и не передан -> null', () => {
  const html = '<meta property="og:image" content="https://pic.example/x.jpg">';
  assert.strictEqual(api.parseOgProfile_(html, ''), null);
});

/* ---------------- decodeHtmlEntities_ ---------------- */

console.log('decodeHtmlEntities_:');
check('основные сущности', () =>
  assert.strictEqual(api.decodeHtmlEntities_('Бутик &amp; &quot;Цветы&quot;'), 'Бутик & "Цветы"'));
check('одинарная кавычка', () =>
  assert.strictEqual(api.decodeHtmlEntities_('&#39;'), "'"));

console.log('\nПройдено проверок: ' + passed);
