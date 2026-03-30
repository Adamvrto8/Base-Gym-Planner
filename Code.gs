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

    // Return most recent rows when limit is set
    if (limit > 0 && rows.length > limit) rows = rows.slice(rows.length - limit);

    return { status: 'ok', log: rows.join('\n'), totalRows: rows.length };
  } catch (err) {
    return { error: err.message };
  }
}

// ─── SAVE DAY ────────────────────────────────────────────────────────────────
function saveDay(d) {
  try {
    var ss   = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Generated Plans');

    if (!sheet) {
      sheet = ss.insertSheet('Generated Plans');
      sheet.appendRow([
        'Week Start', 'Week Theme', 'Day',
        'Strength', 'Strength Details', 'Coach Note',
        'Metcon', 'Metcon Details', 'Time Domain',
        'RX', 'Scaled', 'Beginner',
        'Date Saved'
      ]);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      d.weekStart    || '',
      d.weekTheme    || '',
      d.day          || '',
      d.strengthTitle|| '',
      d.strengthDesc || '',
      d.coachNote    || '',
      d.metconTitle  || '',
      d.metconDesc   || '',
      d.timeDomain   || '',
      d.rx           || '',
      d.scaled       || '',
      d.beginner     || '',
      new Date().toLocaleDateString('en-GB')
    ]);

    return { status: 'ok' };
  } catch (err) {
    return { error: err.message };
  }
}
