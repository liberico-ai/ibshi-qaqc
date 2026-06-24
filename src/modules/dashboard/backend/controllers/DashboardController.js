import { KpiService } from '../services/KpiService.js';
import { ReportService } from '../services/ReportService.js';

export class DashboardController {
  static async getQcKpi(req, res) {
    const data = await KpiService.qcKpi();
    res.json({ data });
  }

  static async getProjectDashboard(req, res) {
    const data = await KpiService.projectDashboard();
    res.json({ data });
  }

  static async getManagementOverview(req, res) {
    const data = await KpiService.managementOverview();
    res.json({ data });
  }

  static async exportReport(req, res) {
    const period = req.query.period === 'monthly' ? 'monthly' : 'weekly';
    const buffer = await ReportService.generateKpiPdf({ period });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="qc-kpi-${period}.pdf"`);
    res.send(buffer);
  }
}
