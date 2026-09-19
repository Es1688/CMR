/**
 * CRM «Клиенты» — серверная часть (Google Apps Script).
 *
 * Хранилище — таблица Google Sheets, к которой привязан этот скрипт.
 * Листы «Клиенты», «Комментарии» и «Настройки» создаются автоматически
 * при первом открытии веб-приложения.
 */

var SHEET_CLIENTS = 'Клиенты';
var SHEET_COMMENTS = 'Комментарии';
var SHEET_SETTINGS = 'Настройки';

/** Порядок колонок листа «Клиенты»; key — имя поля, передаваемое в интерфейс. */
var CLIENT_FIELDS = [
  { key: 'id',         header: 'ID' },
  { key: 'created',    header: 'Дата добавления' },
  { key: 'name',       header: 'Имя' },
  { key: 'igUsername', header: 'Instagram-ник' },
  { key: 'igLink',     header: 'Instagram-ссылка' },
  { key: 'avatar',     header: 'Аватар' },
  { key: 'bio',        header: 'Биография' },
  { key: 'phone',      header: 'Телефон' },
  { key: 'email',      header: 'Email' },
  { key: 'category',   header: 'Категория' },
  { key: 'status',     header: 'Статус' },
  { key: 'city',       header: 'Город' },
  { key: 'notes',      header: 'Примечания' },
  { key: 'updated',    header: 'Дата изменения' },
  // Новые поля дописываются в конец: у уже созданного листа колонки
  // добавляются справа (см. миграцию заголовков в ensureSheet_).
  { key: 'likeLevel',    header: 'Нравится (1–5)' },
  { key: 'sessionMoney', header: 'Доход за сеанс (₽)' },
  { key: 'tattooCount',  header: 'Татуировок сделано' }
];

var COMMENT_FIELDS = [
  { key: 'id',       header: 'ID' },
  { key: 'clientId', header: 'ID клиента' },
  { key: 'created',  header: 'Дата' },
  { key: 'author',   header: 'Автор' },
  { key: 'text',     header: 'Текст' }
];

var DEFAULT_CATEGORIES = ['Блогер', 'Магазин', 'Услуга', 'Другое'];
var DEFAULT_STATUSES = ['Новый', 'В работе', 'Ожидание', 'Сделка', 'Отказ'];

/* ------------------------------------------------------------------ */
/* Веб-приложение                                                     */
/* ------------------------------------------------------------------ */

function doGet() {
  ensureSetup_();
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('CRM · Клиенты')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Подключает Styles.html и JavaScript.html внутрь Index.html. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* ------------------------------------------------------------------ */
/* Создание структуры таблицы                                         */
/* ------------------------------------------------------------------ */

function ensureSetup_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // dateColIndexes — колонки с датами (0-based): формат «текст», чтобы
    // Таблицы не превращали строки с датами в значения даты.
    ensureSheet_(ss, SHEET_CLIENTS, CLIENT_FIELDS.map(function (f) { return f.header; }), [1, 13]);
    ensureSheet_(ss, SHEET_COMMENTS, COMMENT_FIELDS.map(function (f) { return f.header; }), [2]);

    var settings = ensureSheet_(ss, SHEET_SETTINGS, ['Категории', 'Статусы'], []);
    if (settings.getLastRow() < 2) {
      var rows = Math.max(DEFAULT_CATEGORIES.length, DEFAULT_STATUSES.length);
      var data = [];
      for (var i = 0; i < rows; i++) {
        data.push([DEFAULT_CATEGORIES[i] || '', DEFAULT_STATUSES[i] || '']);
      }
      settings.getRange(2, 1, rows, 2).setValues(data);
    }
  } finally {
    lock.releaseLock();
  }
}

function ensureSheet_(ss, name, headers, dateColIndexes) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold')
      .setBackground('#eef1f6');
    sheet.setFrozenRows(1);
    (dateColIndexes || []).forEach(function (idx) {
      sheet.getRange(2, idx + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    });
  } else {
    // Миграция: при появлении новых полей дописываем недостающие заголовки
    // в пустые ячейки первой строки. Существующие колонки и данные не трогаем.
    var lastCol = sheet.getLastColumn();
    var existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var missing = [];
    for (var i = 0; i < headers.length; i++) {
      if (i >= existing.length || String(existing[i] || '').trim() === '') missing.push(i);
    }
    if (missing.length) {
      var from = missing[0];
      var row = [];
      for (var j = from; j < headers.length; j++) {
        row.push(missing.indexOf(j) !== -1 ? headers[j] : '');
      }
      sheet.getRange(1, from + 1, 1, row.length).setValues([row])
        .setFontWeight('bold')
        .setBackground('#eef1f6');
    }
  }
  return sheet;
}

function sheet_(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('В таблице нет листа «' + name + '». Откройте веб-приложение ещё раз — лист создастся автоматически.');
  return sheet;
}

/* ------------------------------------------------------------------ */
/* Клиенты                                                            */
/* ------------------------------------------------------------------ */

function getClients() {
  ensureSetup_();
  var sheet = sheet_(SHEET_CLIENTS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var width = Math.min(sheet.getLastColumn(), CLIENT_FIELDS.length);
  var values = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  var clients = [];
  for (var i = 0; i < values.length; i++) {
    if (!values[i][0]) continue; // пропускаем пустые строки
    var client = {};
    for (var j = 0; j < CLIENT_FIELDS.length; j++) {
      client[CLIENT_FIELDS[j].key] = j < width ? normalizeCell_(values[i][j]) : '';
    }
    clients.push(client);
  }
  return clients;
}

/**
 * Создаёт нового клиента или обновляет существующего (по client.id).
 * Возвращает { id: ..., created: true|false }.
 */
function saveClient(client) {
  if (!client || typeof client !== 'object') {
    throw new Error('Не переданы данные клиента');
  }
  ensureSetup_();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = sheet_(SHEET_CLIENTS);
    var now = now_();
    var row = CLIENT_FIELDS.map(function (f) { return clean_(client[f.key]); });
    var idIdx = fieldIndex_('id');
    var createdIdx = fieldIndex_('created');
    var updatedIdx = fieldIndex_('updated');

    if (client.id) {
      var rowNum = findClientRow_(sheet, String(client.id));
      if (!rowNum) {
        throw new Error('Клиент не найден — возможно, он был удалён. Закройте карточку и обновите список.');
      }
      var existing = sheet.getRange(rowNum, 1, 1, CLIENT_FIELDS.length).getValues()[0];
      row[idIdx] = existing[idIdx];
      row[createdIdx] = normalizeCell_(existing[createdIdx]) || now;
      row[updatedIdx] = now;
      sheet.getRange(rowNum, 1, 1, CLIENT_FIELDS.length).setValues([row]);
      return { id: row[idIdx], created: false };
    }

    row[idIdx] = Utilities.getUuid();
    row[createdIdx] = now;
    row[updatedIdx] = now;
    sheet.appendRow(row);
    return { id: row[idIdx], created: true };
  } finally {
    lock.releaseLock();
  }
}

function deleteClient(id) {
  ensureSetup_();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var clientsSheet = sheet_(SHEET_CLIENTS);
    var rowNum = findClientRow_(clientsSheet, String(id));
    if (rowNum) clientsSheet.deleteRow(rowNum);

    // вместе с клиентом удаляем его комментарии
    var commentsSheet = sheet_(SHEET_COMMENTS);
    var lastRow = commentsSheet.getLastRow();
    if (lastRow >= 2) {
      var values = commentsSheet.getRange(2, 1, lastRow - 1, COMMENT_FIELDS.length).getValues();
      for (var i = values.length - 1; i >= 0; i--) {
        if (String(values[i][1]) === String(id)) commentsSheet.deleteRow(i + 2);
      }
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function findClientRow_(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/* Комментарии                                                        */
/* ------------------------------------------------------------------ */

function getComments(clientId) {
  ensureSetup_();
  var sheet = sheet_(SHEET_COMMENTS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, COMMENT_FIELDS.length).getValues();
  var comments = [];
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][1]) !== String(clientId)) continue;
    var c = {};
    for (var j = 0; j < COMMENT_FIELDS.length; j++) {
      c[COMMENT_FIELDS[j].key] = normalizeCell_(values[i][j]);
    }
    comments.push(c);
  }
  comments.sort(function (a, b) {
    return String(a.created).localeCompare(String(b.created));
  });
  return comments;
}

/** Добавляет комментарий и возвращает обновлённый список комментариев клиента. */
function addComment(clientId, text) {
  text = clean_(text);
  if (!text) throw new Error('Пустой комментарий');
  ensureSetup_();

  var author = '';
  try {
    author = (Session.getActiveUser().getEmail() || '').trim();
  } catch (e) {
    // адрес недоступен — оставляем пустым
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = sheet_(SHEET_COMMENTS);
    sheet.appendRow([
      Utilities.getUuid(),
      clean_(clientId),
      now_(),
      author,
      text
    ]);
  } finally {
    lock.releaseLock();
  }
  return getComments(clientId);
}

/* ------------------------------------------------------------------ */
/* Настройки (категории и статусы)                                    */
/* ------------------------------------------------------------------ */

function getSettings() {
  ensureSetup_();
  var sheet = sheet_(SHEET_SETTINGS);
  var lastRow = sheet.getLastRow();
  var categories = [];
  var statuses = [];
  if (lastRow >= 2) {
    var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < values.length; i++) {
      if (values[i][0]) categories.push(String(values[i][0]).trim());
      if (values[i][1]) statuses.push(String(values[i][1]).trim());
    }
  }
  return { categories: categories, statuses: statuses };
}

/* ------------------------------------------------------------------ */
/* Instagram: автозаполнение по ссылке                                */
/*                                                                    */
/* Бесплатный способ с цепочкой фолбэков:                             */
/*   1) публичный эндпоинт web_profile_info;                          */
/*   2) og-метатеги страницы профиля;                                 */
/*   3) только ник и ссылка, остальное — вручную.                     */
/* ------------------------------------------------------------------ */

var IG_RESERVED_PATHS = ['p', 'reel', 'reels', 'tv', 'stories', 'explore', 'accounts', 'direct', 'about', 'legal'];
var IG_USERNAME_RE = /^[A-Za-z0-9._]{1,30}$/;

function fetchInstagramData(input) {
  var username = parseInstagramUsername_(input);
  if (!username) {
    return {
      ok: false,
      error: 'Не удалось распознать профиль. Введите ссылку вида https://www.instagram.com/имя_профиля/ или просто имя профиля.'
    };
  }
  var canonical = 'https://www.instagram.com/' + username + '/';

  // 1. Публичный эндпоинт Instagram (отдаёт полные данные профиля)
  try {
    var resp = UrlFetchApp.fetch(
      'https://www.instagram.com/api/v1/users/web_profile_info/?username=' + encodeURIComponent(username),
      {
        method: 'get',
        muteHttpExceptions: true,
        followRedirects: true,
        headers: {
          'x-ig-app-id': '936619743392459',
          'accept': 'application/json',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      }
    );
    if (resp.getResponseCode() === 200) {
      var parsed = parseWebProfileInfo_(JSON.parse(resp.getContentText()));
      if (parsed && parsed.username) {
        parsed.igLink = canonical;
        return { ok: true, source: 'api', data: parsed };
      }
    }
  } catch (e) {
    // переходим к запасному способу
  }

  // 2. Страница профиля и og-метатеги
  try {
    var page = UrlFetchApp.fetch(canonical, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    if (page.getResponseCode() === 200) {
      var og = parseOgProfile_(page.getContentText(), username);
      if (og) {
        og.igLink = canonical;
        return { ok: true, source: 'meta', data: og };
      }
    }
  } catch (e) {
    // данных нет — заполняем что знаем
  }

  // 3. Instagram не отдал данные — сохраняем ник и ссылку
  return {
    ok: true,
    partial: true,
    data: { username: username, igLink: canonical, fullName: '', avatar: '', bio: '' },
    warning: 'Instagram сейчас не отдал данные профиля. Ник и ссылка сохранены — остальные поля заполните вручную или повторите попытку позже.'
  };
}

/** Чистая функция: извлекает имя профиля из ссылки любого вида или из ника. */
function parseInstagramUsername_(input) {
  if (!input) return '';
  var raw = String(input).trim();
  if (!raw) return '';
  raw = raw.replace(/^@+/, '');
  if (!raw) return '';

  var username = '';
  var fromLink = raw.match(/(?:instagram\.com|instagr\.am)\/([^\/?#\s]+)/i);
  if (fromLink) {
    username = fromLink[1];
  } else if (IG_USERNAME_RE.test(raw)) {
    // принимаем только если ввод целиком — валидный ник
    // (иначе обрезанный кусок произвольного текста создаст мусорный ник)
    username = raw;
  }

  username = (username || '').replace(/^@+/, '');
  if (!IG_USERNAME_RE.test(username)) return '';
  if (IG_RESERVED_PATHS.indexOf(username.toLowerCase()) !== -1) return '';
  return username;
}

/** Чистая функция: ответ web_profile_info -> {username, fullName, avatar, bio}. */
function parseWebProfileInfo_(json) {
  if (!json || !json.data || !json.data.user) return null;
  var u = json.data.user;
  if (!u.username) return null;
  return {
    username: String(u.username),
    fullName: u.full_name ? String(u.full_name).trim() : '',
    avatar: u.profile_pic_url_hd || u.profile_pic_url || '',
    bio: u.biography ? String(u.biography) : ''
  };
}

/** Чистая функция: og-метатеги страницы профиля -> {username, fullName, avatar, bio}. */
function parseOgProfile_(html, requestedUsername) {
  if (!html) return null;

  function meta(property) {
    var m = html.match(new RegExp('<meta[^>]+property=["\']' + property + '["\'][^>]+content=["\']([^"\']*)["\']', 'i'));
    if (!m) {
      m = html.match(new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]+property=["\']' + property + '["\']', 'i'));
    }
    return m ? decodeHtmlEntities_(m[1]) : '';
  }

  var title = meta('og:title');
  var description = meta('og:description');
  var image = meta('og:image');
  if (!title && !description && !image) return null;

  var username = requestedUsername || '';
  var m = (title + ' ' + description).match(/\(@([A-Za-z0-9._]{1,30})\)/);
  if (m) username = m[1];
  if (!username) return null;

  var fullName = '';
  var fromDesc = description.match(/from\s+(.{1,80}?)\s*\(@/);
  if (fromDesc) fullName = fromDesc[1].trim();
  if (!fullName && title) {
    var t = title.replace(/\s*\(@[A-Za-z0-9._]+\).*$/i, '').trim();
    if (t && !/instagram/i.test(t)) fullName = t;
  }

  return {
    username: username,
    fullName: fullName,
    avatar: image,
    bio: '' // биография в og-метатегах не отдаётся
  };
}

function decodeHtmlEntities_(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x2F;/gi, '/');
}

/* ------------------------------------------------------------------ */
/* Экспорт в Excel                                                    */
/* ------------------------------------------------------------------ */

/**
 * Выгружает таблицу в формате .xlsx.
 * Возвращает { fileName, base64 } — интерфейс собирает из этого файл
 * и запускает скачивание прямо в браузере (права на Drive не нужны).
 */
function exportXlsx() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
  var resp = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  });
  var code = resp.getResponseCode();
  if (code !== 200) {
    throw new Error('Не удалось сформировать Excel-файл (код ' + code + '). Попробуйте ещё раз.');
  }
  var name = 'Клиенты_' + Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd_HH-mm') + '.xlsx';
  return {
    fileName: name,
    base64: Utilities.base64Encode(resp.getBlob().getBytes())
  };
}

/* ------------------------------------------------------------------ */
/* Вспомогательные                                                    */
/* ------------------------------------------------------------------ */

function fieldIndex_(key) {
  for (var i = 0; i < CLIENT_FIELDS.length; i++) {
    if (CLIENT_FIELDS[i].key === key) return i;
  }
  throw new Error('Неизвестное поле: ' + key);
}

function clean_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeCell_(value) {
  if (value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, tz_(), 'yyyy-MM-dd HH:mm');
  }
  return String(value).trim();
}

function now_() {
  return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm');
}

function tz_() {
  try {
    return Session.getScriptTimeZone() || 'Europe/Moscow';
  } catch (e) {
    return 'Europe/Moscow';
  }
}
