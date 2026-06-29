import type { Response } from 'express';
import { format as formatCsv } from 'fast-csv';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface Column {
  key: string;
  header: string;
}

export function sendCsv(res: Response, filename: string, columns: Column[], rows: Record<string, unknown>[]) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  const stream = formatCsv({ headers: columns.map((c) => c.header) });
  stream.pipe(res);
  for (const row of rows) {
    stream.write(columns.map((c) => row[c.key]));
  }
  stream.end();
}

export async function sendXlsx(
  res: Response,
  filename: string,
  columns: Column[],
  rows: Record<string, unknown>[],
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report');
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: 22 }));
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

export function sendPdf(
  res: Response,
  title: string,
  filename: string,
  columns: Column[],
  rows: Record<string, unknown>[],
) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).text(title, { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#666').text(new Date().toLocaleString());
  doc.moveDown();

  const startX = doc.x;
  const colWidth = (doc.page.width - 80) / columns.length;

  // Header row
  doc.fillColor('#000').fontSize(10).font('Helvetica-Bold');
  columns.forEach((c, i) => doc.text(c.header, startX + i * colWidth, doc.y, { width: colWidth, continued: i < columns.length - 1 }));
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(9);

  // Data rows
  for (const row of rows) {
    const y = doc.y;
    columns.forEach((c, i) =>
      doc.text(String(row[c.key] ?? ''), startX + i * colWidth, y, {
        width: colWidth,
        continued: i < columns.length - 1,
      }),
    );
    doc.moveDown(0.4);
    if (doc.y > doc.page.height - 60) doc.addPage();
  }

  doc.end();
}
