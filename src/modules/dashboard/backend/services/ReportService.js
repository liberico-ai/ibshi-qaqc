import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pool } from '../../../../core/db.js';
import { KpiService } from './KpiService.js';

/**
 * Sinh báo cáo KPI dạng PDF (pdf-lib). Dùng font chuẩn (WinAnsi) nên
 * nhãn trong PDF để ở dạng không dấu để tránh lỗi mã hoá ký tự tiếng Việt.
 */
export class ReportService {
  static async generateKpiPdf({ period = 'weekly' } = {}) {
    const kpi = await KpiService.qcKpi();
    const projects = await KpiService.projectDashboard();

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    let page = doc.addPage([595, 842]); // A4 portrait
    const { width, height } = page.getSize();
    let y = height - 50;

    const draw = (text, x, size = 11, bold = false, color = rgb(0.1, 0.1, 0.12)) => {
      page.drawText(String(text ?? ''), { x, y, size, font: bold ? fontBold : font, color });
    };
    const newLine = (gap = 18) => {
      y -= gap;
      if (y < 60) { page = doc.addPage([595, 842]); y = height - 50; }
    };

    draw('IBS HEAVY INDUSTRY - QA/QC', 50, 16, true);
    newLine(22);
    draw(`KPI Report (${period === 'monthly' ? 'Monthly' : 'Weekly'})`, 50, 13, true);
    newLine(16);
    draw(`Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`, 50, 9, false, rgb(0.4, 0.4, 0.45));
    newLine(26);

    draw('Quality KPIs', 50, 12, true);
    newLine();
    draw(`- First Pass Rate: ${kpi.firstPassRate}% (${kpi.firstPass.pass}/${kpi.firstPass.total})`, 60);
    newLine();
    draw(`- NCR total: ${kpi.ncr.total} | Open: ${kpi.ncr.open} | Avg close-out: ${kpi.ncr.avgCloseoutDays ?? 'N/A'} days`, 60);
    newLine();
    draw(`- MDR avg completion: ${kpi.mdr.avgCompletion ?? 'N/A'}% (${kpi.mdr.total} dossiers)`, 60);
    newLine();
    draw(`- Inspection cycle time: ${kpi.inspectionCycleDays ?? 'N/A'} days`, 60);
    newLine(26);

    draw('Per-project Dashboard', 50, 12, true);
    newLine();
    draw('Code', 60, 9, true); draw('Pass%', 200, 9, true); draw('Fail%', 260, 9, true);
    draw('OpenNCR', 320, 9, true); draw('MDR%', 400, 9, true);
    newLine(14);
    if (!projects.length) {
      draw('No project data available.', 60, 9, false, rgb(0.4, 0.4, 0.45));
      newLine();
    } else {
      for (const p of projects.slice(0, 40)) {
        draw(p.code ?? '-', 60, 9);
        draw(`${p.passPct}`, 200, 9);
        draw(`${p.failPct}`, 260, 9);
        draw(`${p.openNcr}`, 320, 9);
        draw(`${p.mdrCompletion ?? 'N/A'}`, 400, 9);
        newLine(14);
      }
    }

    const bytes = await doc.save();

    // Lưu lịch sử chạy báo cáo (không chặn nếu lỗi)
    try {
      await pool.query(
        `INSERT INTO dashboard_report_runs (period, kind, payload) VALUES ($1, $2, $3)`,
        [period, 'qc_kpi', JSON.stringify({ kpi, projectCount: projects.length })]
      );
    } catch { /* ignore — báo cáo vẫn trả về được */ }

    return Buffer.from(bytes);
  }
}
