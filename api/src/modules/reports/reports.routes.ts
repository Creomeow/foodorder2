import { Router } from 'express';
import { exportQuery, salesReportQuery, Role } from '@foodorder/shared';
import { asyncHandler, ok } from '../../lib/http.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  categoryReport,
  dashboardStats,
  productReport,
  salesReport,
} from './reports.service.js';
import { sendCsv, sendPdf, sendXlsx, type Column } from './export.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const restaurantId = req.query.restaurantId as string | undefined;
    ok(res, await dashboardStats(req.user!, restaurantId));
  }),
);

// Sales/products/category reports limited to manager+ (staff = ops only).
reportsRouter.use(requireRole(Role.SUPER_ADMIN, Role.MANAGER));

reportsRouter.get(
  '/sales',
  asyncHandler(async (req, res) => {
    const q = salesReportQuery.parse(req.query);
    ok(res, await salesReport(req.user!, q.period, q.restaurantId, q.from, q.to));
  }),
);

reportsRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const q = salesReportQuery.parse(req.query);
    ok(res, await productReport(req.user!, q.restaurantId, q.from, q.to));
  }),
);

reportsRouter.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const restaurantId = req.query.restaurantId as string | undefined;
    ok(res, await categoryReport(req.user!, restaurantId));
  }),
);

reportsRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const q = exportQuery.parse(req.query);
    let columns: Column[];
    let rows: Record<string, unknown>[];
    let title: string;
    let filename: string;

    if (q.report === 'products') {
      columns = [
        { key: 'name', header: 'Item' },
        { key: 'category', header: 'Category' },
        { key: 'quantitySold', header: 'Qty Sold' },
        { key: 'revenue', header: 'Revenue' },
      ];
      rows = await productReport(req.user!, q.restaurantId, q.from, q.to);
      title = 'Product Sales Report';
      filename = 'product-report';
    } else {
      columns = [
        { key: 'label', header: 'Period' },
        { key: 'orders', header: 'Orders' },
        { key: 'revenue', header: 'Revenue' },
      ];
      rows = await salesReport(req.user!, q.period, q.restaurantId, q.from, q.to);
      title = 'Sales Report';
      filename = 'sales-report';
    }

    if (q.format === 'xlsx') return sendXlsx(res, filename, columns, rows);
    if (q.format === 'pdf') return sendPdf(res, title, filename, columns, rows);
    return sendCsv(res, filename, columns, rows);
  }),
);
