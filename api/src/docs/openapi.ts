// Hand-maintained OpenAPI 3 description served at /api/docs.
// Kept concise; request/response bodies are validated by Zod at runtime.
import { env } from '../config/env.js';

const bearer = [{ bearerAuth: [] }];

function crud(tag: string, name: string, base: string) {
  return {
    [base]: {
      get: { tags: [tag], summary: `List ${name}`, security: bearer, responses: { 200: { description: 'OK' } } },
      post: { tags: [tag], summary: `Create ${name}`, security: bearer, responses: { 201: { description: 'Created' } } },
    },
    [`${base}/{id}`]: {
      put: { tags: [tag], summary: `Update ${name}`, security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      delete: { tags: [tag], summary: `Delete ${name}`, security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
  };
}

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Food Ordering System API',
    version: '1.0.0',
    description:
      'Shared backend for the customer ordering web app, admin dashboard/KDS, and future mobile/POS clients.',
  },
  servers: [{ url: `${env.apiUrl}/api/v1` }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  tags: [
    { name: 'Auth' },
    { name: 'Brands' },
    { name: 'Outlets' },
    { name: 'Users' },
    { name: 'Categories' },
    { name: 'Menu' },
    { name: 'Modifiers' },
    { name: 'Tables' },
    { name: 'Orders' },
    { name: 'Public' },
    { name: 'Payments' },
    { name: 'Coupons' },
    { name: 'Loyalty' },
    { name: 'Reports' },
  ],
  paths: {
    '/auth/login': { post: { tags: ['Auth'], summary: 'Login', responses: { 200: { description: 'AuthResponse' } } } },
    '/auth/refresh': { post: { tags: ['Auth'], summary: 'Refresh tokens', responses: { 200: { description: 'Tokens' } } } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Logout', responses: { 200: { description: 'OK' } } } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: bearer, responses: { 200: { description: 'AuthUser' } } } },

    ...crud('Brands', 'brand', '/brands'),
    ...crud('Outlets', 'outlet', '/restaurants'),
    ...crud('Users', 'user', '/users'),
    ...crud('Categories', 'category', '/categories'),
    ...crud('Menu', 'menu item', '/menu'),
    ...crud('Modifiers', 'modifier group', '/modifier-groups'),
    ...crud('Tables', 'table', '/tables'),
    ...crud('Coupons', 'coupon', '/coupons'),

    '/tables/{id}/qr': { get: { tags: ['Tables'], summary: 'Get QR (PNG data URL or ?format=svg)', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/tables/{id}/qr/regenerate': { post: { tags: ['Tables'], summary: 'Regenerate QR token', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },

    '/orders': {
      get: { tags: ['Orders'], summary: 'List/search/filter orders', security: bearer, responses: { 200: { description: 'Paginated orders' } } },
      post: { tags: ['Orders'], summary: 'Create order (staff/POS)', security: bearer, responses: { 201: { description: 'Order' } } },
    },
    '/orders/{id}': { get: { tags: ['Orders'], summary: 'Get order', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Order' } } } },
    '/orders/{id}/status': { patch: { tags: ['Orders'], summary: 'Update status', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Order' } } } },

    '/public/outlet/{restaurantId}/menu': { get: { tags: ['Public'], summary: 'Public menu for an outlet', responses: { 200: { description: 'MenuResponse' } } } },
    '/public/sessions': { post: { tags: ['Public'], summary: 'Resolve QR -> open dine-in session', responses: { 200: { description: 'Session' } } } },
    '/public/orders': { post: { tags: ['Public'], summary: 'Place order from customer app', responses: { 201: { description: 'Order' } } } },
    '/public/orders/{id}': { get: { tags: ['Public'], summary: 'Track order', responses: { 200: { description: 'Order' } } } },

    '/payments/config': { get: { tags: ['Payments'], summary: 'Stripe publishable key + currency', responses: { 200: { description: 'OK' } } } },
    '/payments/intent': { post: { tags: ['Payments'], summary: 'Create Stripe PaymentIntent', responses: { 200: { description: 'clientSecret' } } } },
    '/payments/cash': { post: { tags: ['Payments'], summary: 'Record cash payment', responses: { 200: { description: 'Order' } } } },
    '/payments/webhook': { post: { tags: ['Payments'], summary: 'Stripe webhook (raw body)', responses: { 200: { description: 'received' } } } },

    '/coupons/validate': { post: { tags: ['Coupons'], summary: 'Validate coupon at checkout', responses: { 200: { description: 'CouponValidation' } } } },

    '/loyalty/accounts': { get: { tags: ['Loyalty'], summary: 'List loyalty accounts', security: bearer, responses: { 200: { description: 'OK' } } } },
    '/loyalty/adjust': { post: { tags: ['Loyalty'], summary: 'Earn/redeem points', security: bearer, responses: { 200: { description: 'OK' } } } },

    '/reports/dashboard': { get: { tags: ['Reports'], summary: 'Dashboard KPIs', security: bearer, responses: { 200: { description: 'DashboardStats' } } } },
    '/reports/sales': { get: { tags: ['Reports'], summary: 'Sales report', security: bearer, responses: { 200: { description: 'OK' } } } },
    '/reports/products': { get: { tags: ['Reports'], summary: 'Product report', security: bearer, responses: { 200: { description: 'OK' } } } },
    '/reports/categories': { get: { tags: ['Reports'], summary: 'Revenue by category', security: bearer, responses: { 200: { description: 'OK' } } } },
    '/reports/export': { get: { tags: ['Reports'], summary: 'Export report (csv|xlsx|pdf)', security: bearer, responses: { 200: { description: 'File' } } } },
  },
};
