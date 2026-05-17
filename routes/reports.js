const express = require('express');
const db = require('../database/db');

const router = express.Router();

/**
 * GET /api/reports/financial
 * Revenue, expense, and profitability data
 */
router.get('/financial', (req, res) => {
  try {
    const { year } = req.query;
    const userId = req.user.id;
    const targetYear = year || '2025';

    // Monthly revenue and expense data
    const monthlyData = db.prepare(
      `SELECT 
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as revenue,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END) as overdue_amount,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
       FROM invoices 
       WHERE user_id = ? AND strftime('%Y', date) = ?
       GROUP BY month
       ORDER BY month`
    ).all(userId, targetYear);

    // Expense breakdown by category (from POs)
    const expenseByCategory = db.prepare(
      `SELECT 
        s.category,
        SUM(po.total) as amount,
        COUNT(*) as transaction_count
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.user_id = ? AND po.status IN ('sent','partial','received') AND strftime('%Y', po.date) = ?
       GROUP BY s.category
       ORDER BY amount DESC`
    ).all(userId, targetYear);

    // COGS approximation
    const cogsData = db.prepare(
      `SELECT 
        strftime('%Y-%m', date) as month,
        SUM(total) as cogs
       FROM purchase_orders
       WHERE user_id = ? AND status IN ('sent','partial','received') AND strftime('%Y', date) = ?
       GROUP BY month
       ORDER BY month`
    ).all(userId, targetYear);

    // Aged receivables
    const agedReceivables = db.prepare(
      `SELECT 
        c.name as customer,
        i.invoice_number,
        i.total,
        i.amount_paid,
        (i.total - i.amount_paid) as balance,
        i.due_date,
        CASE 
          WHEN julianday('now') - julianday(i.due_date) <= 0 THEN 'current'
          WHEN julianday('now') - julianday(i.due_date) <= 30 THEN '1-30'
          WHEN julianday('now') - julianday(i.due_date) <= 60 THEN '31-60'
          WHEN julianday('now') - julianday(i.due_date) <= 90 THEN '61-90'
          ELSE '90+'
        END as aging_bucket
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.user_id = ? AND i.status IN ('sent','overdue') AND (i.total - i.amount_paid) > 0
       ORDER BY i.due_date`
    ).all(userId);

    // Aging summary
    const agingSummary = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    agedReceivables.forEach(r => { agingSummary[r.aging_bucket] = (agingSummary[r.aging_bucket] || 0) + r.balance; });

    return res.json({
      success: true,
      message: 'Financial report data retrieved.',
      data: {
        year: targetYear,
        monthlyRevenue: monthlyData,
        expenseByCategory,
        cogsByMonth: cogsData,
        agedReceivables,
        agingSummary
      }
    });
  } catch (error) {
    console.error('[Reports Financial] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load financial reports.', data: null });
  }
});

/**
 * GET /api/reports/sales
 * Sales performance data
 */
router.get('/sales', (req, res) => {
  try {
    const { year, quarter } = req.query;
    const userId = req.user.id;

    // Top customers by revenue
    const topCustomers = db.prepare(
      `SELECT 
        c.id, c.name, c.company,
        SUM(i.total) as total_revenue,
        COUNT(i.id) as invoice_count,
        AVG(i.total) as avg_invoice
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.user_id = ? AND i.status = 'paid'
       GROUP BY c.id
       ORDER BY total_revenue DESC
       LIMIT 10`
    ).all(userId);

    // Monthly sales trend
    const salesTrend = db.prepare(
      `SELECT 
        strftime('%Y-%m', date) as month,
        SUM(total) as revenue,
        COUNT(*) as order_count
       FROM sales_orders
       WHERE user_id = ? AND date >= date('now', '-12 months')
       GROUP BY month
       ORDER BY month`
    ).all(userId);

    // Sales by status
    const salesByStatus = db.prepare(
      `SELECT 
        status,
        COUNT(*) as count,
        SUM(total) as value
       FROM sales_orders
       WHERE user_id = ?
       GROUP BY status`
    ).all(userId);

    // Product sales (from invoice items - approximate via products)
    const productSales = db.prepare(
      `SELECT 
        p.name as product,
        p.category,
        SUM(i.total) as revenue
       FROM invoices i
       CROSS JOIN products p
       WHERE i.user_id = ? AND i.status = 'paid'
       GROUP BY p.id
       ORDER BY revenue DESC
       LIMIT 10`
    ).all(userId);

    // Pipeline conversion
    const pipelineStats = db.prepare(
      `SELECT 
        stage,
        COUNT(*) as count,
        SUM(value) as value
       FROM pipeline_deals
       WHERE user_id = ?
       GROUP BY stage`
    ).all(userId);

    return res.json({
      success: true,
      message: 'Sales report data retrieved.',
      data: {
        topCustomers,
        salesTrend,
        salesByStatus,
        productSales,
        pipelineStats
      }
    });
  } catch (error) {
    console.error('[Reports Sales] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load sales reports.', data: null });
  }
});

/**
 * GET /api/reports/inventory
 * Stock valuation and movement
 */
router.get('/inventory', (req, res) => {
  try {
    const userId = req.user.id;

    // Stock valuation by warehouse
    const warehouseValue = db.prepare(
      `SELECT 
        w.name as warehouse,
        COUNT(p.id) as sku_count,
        SUM(p.quantity) as total_units,
        SUM(p.quantity * p.unit_cost) as stock_value,
        SUM(p.quantity * p.unit_price) as retail_value
       FROM products p
       LEFT JOIN warehouses w ON p.warehouse_id = w.id
       WHERE p.user_id = ?
       GROUP BY w.id`
    ).all(userId);

    // Stock by category
    const categoryValue = db.prepare(
      `SELECT 
        category,
        COUNT(*) as sku_count,
        SUM(quantity) as total_units,
        SUM(quantity * unit_cost) as stock_value,
        AVG(unit_cost) as avg_cost
       FROM products
       WHERE user_id = ?
       GROUP BY category`
    ).all(userId);

    // Low stock items
    const lowStockItems = db.prepare(
      `SELECT 
        p.*, w.name as warehouse_name,
        (p.reorder_level - p.quantity) as shortage
       FROM products p
       LEFT JOIN warehouses w ON p.warehouse_id = w.id
       WHERE p.user_id = ? AND p.status IN ('low_stock', 'out_of_stock')
       ORDER BY p.quantity ASC`
    ).all(userId);

    // Inventory status summary
    const statusSummary = db.prepare(
      `SELECT 
        status,
        COUNT(*) as count,
        SUM(quantity * unit_cost) as value
       FROM products
       WHERE user_id = ?
       GROUP BY status`
    ).all(userId);

    // Total valuation
    const totalValuation = db.prepare(
      `SELECT 
        SUM(quantity * unit_cost) as total_cost_value,
        SUM(quantity * unit_price) as total_retail_value,
        SUM(quantity) as total_units,
        COUNT(*) as total_skus
       FROM products
       WHERE user_id = ?`
    ).get(userId);

    return res.json({
      success: true,
      message: 'Inventory report data retrieved.',
      data: {
        totalValuation,
        warehouseValue,
        categoryValue,
        lowStockItems,
        statusSummary
      }
    });
  } catch (error) {
    console.error('[Reports Inventory] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load inventory reports.', data: null });
  }
});

/**
 * POST /api/reports/custom
 * Custom report builder endpoint
 */
router.post('/custom', (req, res) => {
  try {
    const { table, columns, filters, groupBy, orderBy, limit } = req.body;
    const userId = req.user.id;

    // Validate table against allowed tables
    const allowedTables = ['invoices', 'sales_orders', 'purchase_orders', 'products', 'customers', 'employees', 'projects', 'tasks'];
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ success: false, message: 'Invalid table name.', data: null });
    }

    // Build query
    const cols = columns && columns.length > 0 ? columns.join(', ') : '*';
    let sql = `SELECT ${cols} FROM ${table} WHERE user_id = ?`;
    const params = [userId];

    // Apply filters
    if (filters && typeof filters === 'object') {
      for (const [key, value] of Object.entries(filters)) {
        sql += ` AND ${key} = ?`;
        params.push(value);
      }
    }

    if (groupBy) sql += ` GROUP BY ${groupBy}`;
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    else sql += ` ORDER BY id DESC`;
    if (limit) sql += ` LIMIT ${parseInt(limit)}`;

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Custom report generated.', data: rows });
  } catch (error) {
    console.error('[Reports Custom] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to generate custom report.', data: null });
  }
});

module.exports = router;
