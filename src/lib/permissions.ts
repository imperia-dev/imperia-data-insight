export type Role = 'owner' | 'master' | 'admin' | 'operation';

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
    '/leads'
  ],
  master: [
    '/',
    '/dashboard-operacao',
    '/orders',
    '/delivered-orders',
    '/documents',
    '/team',
    '/productivity',
    '/wallet',
    '/calendar',
    '/timesheet',
    '/ai-analytics',
    '/settings',
    '/pendencies',
    '/demand-control',
    '/notifications'
    // Removed: '/company-costs',
    // Removed: '/service-provider-costs'
  ],
  admin: [
    '/',
    '/orders',
    '/delivered-orders',
    '/documents',
    '/team',
    '/productivity',
    '/reports',
    '/calendar',
    '/timesheet',
    '/ai-analytics',
    '/settings',
    '/notifications'
  ],
  operation: [
    '/my-orders',
    '/orders',
    '/delivered-orders',
    '/wallet',
    '/productivity',
    '/notifications',
    '/chat',
    '/settings'
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