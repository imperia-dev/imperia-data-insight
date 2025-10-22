export type Role = 'owner' | 'master' | 'admin' | 'operation' | 'translator' | 'customer' | 'financeiro';

// Define which roles can access which routes
export const rolePermissions: Record<Role, string[]> = {
  owner: [
    '/',
    '/dashboard-operacao',
    '/my-orders',
    '/orders',
    '/delivered-orders',
    '/documents',
    '/team',
    '/productivity',
    '/wallet',
    '/reports',
    '/calendar',
    '/timesheet',
    '/ai-analytics',
    '/settings',
    '/company-costs',
    '/service-provider-costs',
    '/my-orders',
    '/pendencies',
    '/dashboard-financeiro',
    '/fechamento',
    '/fechamento-despesas',
    '/fechamento-prestadores',
    '/payment-request',
    '/payment-receipts',
    '/btg-integration',
    '/dashboard-comercial',
    '/dashboard-marketing',
    '/dashboard-tech',
    '/demand-control',
    '/notifications',
    '/registration-approvals',
    '/pending-approval',
    '/security-dashboard',
    '/collaborators-kpi',
    '/chat',
    '/leads',
    '/translation-orders',
    '/owner-final-approval',
    '/payment-processing',
    '/master-protocol-approvals',
    '/company-assets',
    '/dashboard-financeiro',
    '/contas-a-pagar',
    '/contas-a-receber'
  ],
  financeiro: [
    '/dashboard-controle-financeiro',
    '/contas-a-pagar',
    '/contas-a-receber',
    '/settings',
    '/notifications'
  ],
  master: [
    '/',
    '/dashboard-operacao',
    '/my-orders',
    '/orders',
    '/delivered-orders',
    '/documents',
    '/productivity',
    '/wallet',
    '/calendar',
    '/timesheet',
    '/settings',
    '/pendencies',
    '/demand-control',
    '/notifications',
    '/master-protocol-approvals',
    '/payment-processing',
    '/chat',
    '/translation-orders',
    '/registration-approvals'
    // Removed: '/company-costs',
    // Removed: '/service-provider-costs'
    // Removed: '/team'
    // Removed: '/ai-analytics'
    // Removed: '/fechamento-prestadores'
  ],
  admin: [
    '/',
    '/orders',
    '/delivered-orders',
    '/documents',
    '/productivity',
    '/calendar',
    '/timesheet',
    '/settings',
    '/notifications'
    // Removed: '/team'
    // Removed: '/reports'
    // Removed: '/ai-analytics'
  ],
  operation: [
    '/my-orders',
    '/orders',
    '/delivered-orders',
    '/wallet',
    '/productivity',
    '/notifications',
    '/chat',
    '/settings',
    '/operation-protocol-data'
  ],
  translator: [
    '/my-orders',
    '/wallet',
    '/notifications',
    '/settings',
    '/operation-protocol-data'
  ],
  customer: [
    '/customer-dashboard',
    '/customer-pendency-request',
    '/customer-requests',
    '/settings',
    '/notifications'
  ]
};

// Helper function to check if a user with a specific role can access a route
export const canAccessRoute = (role: Role, route: string): boolean => {
  return rolePermissions[role]?.includes(route) || false;
};

// Get all accessible routes for a role
export const getAccessibleRoutes = (role: Role): string[] => {
  return rolePermissions[role] || [];
};