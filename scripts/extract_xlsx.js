const XLSX = require('xlsx');
const wb = XLSX.readFile('reference/BBS_Column_Footing.xlsx', {cellFormula: true, cellNF: true, cellText: true, raw: false});
wb.SheetNames.forEach(name => {
  console.log('=== SHEET:', name, '===');
  const ws = wb.Sheets[name];
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = range.s.r; r <= range.e.r; r++) {
    let rowData = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({r, c})];
      if (cell) {
        rowData.push(XLSX.utils.encode_col(c) + (r+1) + '=' + JSON.stringify({v:cell.v, f:cell.f, t:cell.t, w:cell.w}));
      }
    }
    if (rowData.length) console.log('ROW'+(r+1)+':', rowData.join(' | '));
  }
});
