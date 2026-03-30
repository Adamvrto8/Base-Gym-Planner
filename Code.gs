// ─── CONFIGURATION ──────────────────────────────────────────────────────────
// Change LOG_SHEET_NAME to match your tab name exactly (check bottom of Google Sheets)
var LOG_SHEET_NAME = 'Sheet1';

// ─── ROUTER ─────────────────────────────────────────────────────────────────
function doGet(e) {
  var params = e.parameter || {};
  var action = params.action || 'getLogs';
  var result;

  if (action === 'getLogs') {
    result = getLogs(parseInt(params.limit) || 0);
  } else if (action === 'saveDay') {
    result = saveDay(params);
  } else {
    result = { error: 'Unknown action: ' + action };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatCell(value) {
  if (value instanceof Date) {
    var d = value;
    return [
      String(d.getDate()).padStart(2, '0'),
      String(d.getMonth() + 1).padStart(2, '0'),
      d.getFullYear()
    ].join('.');
  }
  return String(value == null ? '' : value).trim();
}

function getISOWeekNumber(date) {
  var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  var day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatDate(date) {
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear()
  ].join('.');
}

// ─── GET LOGS ────────────────────────────────────────────────────────────────
function getLogs(limit) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(LOG_SHEET_NAME) || ss.getSheets()[0];
    var data  = sheet.getDataRange().getValues();
    var rows  = [];

    for (var i = 0; i < data.length; i++) {
      var cells = data[i]
        .map(formatCell)
        .filter(function(c) { return c.length > 0; });
      if (cells.length > 0) rows.push(cells.join(' | '));
    }

    if (limit > 0 && rows.length > limit) rows = rows.slice(rows.length - limit);

    return { status: 'ok', log: rows.join('\n'), totalRows: rows.length };
  } catch (err) {
    return { error: err.message };
  }
}

// ─── SAVE DAY ────────────────────────────────────────────────────────────────
function saveDay(d) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Generated Plans');

    if (!sheet) {
      sheet = ss.insertSheet('Generated Plans');
      sheet.appendRow([
        'Week #', 'Date', 'Week Theme', 'Day',
        'Strength', 'Strength Details', 'Coach Note',
        'Metcon', 'Metcon Details', 'Time Domain',
        'RX', 'Scaled', 'Beginner', 'Date Saved'
      ]);
      sheet.setFrozenRows(1);
    }

    // Parse ISO weekStart (YYYY-MM-DD)
    var parts = (d.weekStart || '').split('-');
    var weekStartDate = new Date(
      parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])
    );

    // Exact date for this day = weekStart + dayIndex
    var dayIndex = parseInt(d.dayIndex) || 0;
    var dayDate  = new Date(weekStartDate);
    dayDate.setDate(weekStartDate.getDate() + dayIndex);

    var weekNum = getISOWeekNumber(weekStartDate);

    sheet.appendRow([
      weekNum,
      formatDate(dayDate),
      d.weekTheme     || '',
      d.day           || '',
      d.strengthTitle || '',
      d.strengthDesc  || '',
      d.coachNote     || '',
      d.metconTitle   || '',
      d.metconDesc    || '',
      d.timeDomain    || '',
      d.rx            || '',
      d.scaled        || '',
      d.beginner      || '',
      formatDate(new Date())
    ]);

    return { status: 'ok' };
  } catch (err) {
    return { error: err.message };
  }
}
