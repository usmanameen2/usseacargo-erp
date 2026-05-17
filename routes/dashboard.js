const express = require('express');
const db = require('../database/db');

const router = express.Router();

// Helper: count rows for user
const count = (table, userId, where = '') => {
  const sql = `SELECT COUNT(*) as c FROM ${table} WHERE user_id = ? ${where ? 'AND ' + where : ''}`;
  return db.prepare(sql).get(userId).c;
};

// Helper: sum column for user
const sum = (table, column, userId, where = '') => {
  const sql = `SELECT COALESCE(SUM(${column}), 0) as s FROM ${table} WHERE user_id = ? ${where ? 'AND ' + where : ''}`;
  return db.prepare(sql).get(userId).s;
};

/**
 * GET /api/dashboard/kpis
 * Return all key performance indicators
 */
router.get('/kpis', (req, res) => {
  try {
    const userId = req.user.id;

    // Revenue: sum of paid invoices
    const totalRevenue = sum('invoices', 'total', userId, "status = 'paid'");

    // Outstanding: sum of unpaid invoice totals
    const outstanding = sum('invoices', 'total', userId, "status IN ('sent','overdue')");

    // Expenses: from journal entries expense accounts (we'll estimate from PO totals)
    const totalExpenses = sum('purchase_orders', 'total', userId, "status IN ('sent','partial','received')");

    // Customers count
    const customerCount = count('customers', userId);

    // Active orders
    const activeOrders = count('sales_orders', userId, "status IN ('pending','processing','shipped')");

    // Low stock items
    const lowStock = count('products', userId, "status IN ('low_stock','out_of_stock')");

    // Active projects
    const activeProjects = count('projects', userId, "status = 'active'");

    // Active shipments
    const activeShipments = count('shipments', userId, "status IN ('booking_confirmed','in_transit','at_port','customs')");

    // Pipeline value
    const pipelineValue = sum('pipeline_deals', 'value', userId, "stage NOT IN ('closed_won','closed_lost')");

    // Won deals value
    const wonDeals = sum('pipeline_deals', 'value', userId, "stage = 'closed_won'");

    // Overdue invoices count
    const overdueInvoices = count('invoices', userId, "status = 'overdue'");

    // Employee count
    const employeeCount = count('employees', userId, "status = 'active'");

    // Pending leave requests
    const pendingLeave = count('leave_requests', userId, "status = 'pending'");

    return res.json({
      success: true,
      message: 'Dashboard KPIs retrieved.',
      data: {
        totalRevenue: Number(totalRevenue),
        outstandingPayments: Number(outstanding),
        totalExpenses: Number(totalExpenses),
        customerCount,
        activeOrders,
        lowStockItems: lowStock,
        activeProjects,
        activeShipments,
        pipelineValue: Number(pipelineValue),
        wonDeals: Number(wonDeals),
        overdueInvoices,
        employeeCount,
        pendingLeaveRequests: pendingLeave,
        netProfit: Number(totalRevenue) - Number(totalExpenses)
      }
    });
  } catch (error) {
    console.error('[Dashboard KPIs] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load KPIs.', data: null });
  }
});

/**
 * GET /api/dashboard/chart-data
 * Return data for dashboard charts
 */
router.get('/chart-data', (req, res) => {
  try {
    const userId = req.user.id;

    // Revenue trend (last 6 months from invoices)
    const revenueByMonth = db.prepare(
      `SELECT 
        strftime('%Y-%m', date) as month,
        SUM(total) as revenue,
        COUNT(*) as invoice_count
       FROM invoices 
       WHERE user_id = ? AND status = 'paid' AND date >= date('now', '-6 months')
       GROUP BY month
       ORDER BY month`
    ).all(userId);

    // Expense breakdown (from POs by supplier category)
    const expenseByCategory = db.prepare(
      `SELECT 
        s.category,
        SUM(po.total) as amount
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.user_id = ? AND po.status IN ('sent','partial','received')
       GROUP BY s.category
       ORDER BY amount DESC`
    ).all(userId);

    // Sales by customer (top 8)
    const salesByCustomer = db.prepare(
      `SELECT 
        c.name as customer,
        SUM(i.total) as amount
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.user_id = ? AND i.status = 'paid'
       GROUP BY c.id
       ORDER BY amount DESC
       LIMIT 8`
    ).all(userId);

    // Pipeline distribution
    const pipelineByStage = db.prepare(
      `SELECT stage, COUNT(*) as count, SUM(value) as value
       FROM pipeline_deals
       WHERE user_id = ? AND stage NOT IN ('closed_won','closed_lost')
       GROUP BY stage`
    ).all(userId);

    // Monthly order trend
    const ordersByMonth = db.prepare(
      `SELECT 
        strftime('%Y-%m', date) as month,
        COUNT(*) as order_count,
        SUM(total) as order_value
       FROM sales_orders
       WHERE user_id = ? AND date >= date('now', '-6 months')
       GROUP BY month
       ORDER BY month`
    ).all(userId);

    // Product stock distribution
    const stockDistribution = db.prepare(
      `SELECT 
        status,
        COUNT(*) as count
       FROM products
       WHERE user_id = ?
       GROUP BY status`
    ).all(userId);

    return res.json({
      success: true,
      message: 'Chart data retrieved.',
      data: {
        revenueTrend: revenueByMonth,
        expenseBreakdown: expenseByCategory,
        salesByCustomer: salesByCustomer,
        pipelineDistribution: pipelineByStage,
        ordersByMonth: ordersByMonth,
        stockDistribution: stockDistribution
      }
    });
  } catch (error) {
    console.error('[Dashboard Chart Data] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load chart data.', data: null });
  }
});

/**
 * GET /api/dashboard/recent-transactions
 * Last 10 transactions across all modules
 */
router.get('/recent-transactions', (req, res) => {
  try {
    const userId = req.user.id;

    // Recent invoices
    const recentInvoices = db.prepare(
      `SELECT i.id, i.invoice_number as ref, i.date, i.total as amount, i.status,
        c.name as entity, 'invoice' as type
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC
       LIMIT 5`
    ).all(userId);

    // Recent purchase orders
    const recentPOs = db.prepare(
      `SELECT po.id, po.po_number as ref, po.date, po.total as amount, po.status,
        s.name as entity, 'purchase_order' as type
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.user_id = ?
       ORDER BY po.created_at DESC
       LIMIT 5`
    ).all(userId);

    const transactions = [...recentInvoices, ...recentPOs]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    return res.json({
      success: true,
      message: 'Recent transactions retrieved.',
      data: transactions
    });
  } catch (error) {
    console.error('[Dashboard Recent] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load transactions.', data: null });
  }
});

/**
 * GET /api/dashboard/activity
 * Last 10 activity log entries
 */
router.get('/activity', (req, res) => {
  try {
    const userId = req.user.id;

    const activities = db.prepare(
      `SELECT id, action, entity_type, entity_id, description, created_at
       FROM activity_log
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`
    ).all(userId);

    return res.json({
      success: true,
      message: 'Activity log retrieved.',
      data: activities
    });
  } catch (error) {
    console.error('[Dashboard Activity] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load activity.', data: null });
  }
});

module.exports = router;
