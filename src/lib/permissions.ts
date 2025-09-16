export type Role = 'owner' | 'master' | 'admin' | 'operation';

// Define which roles can access which routes
export const rolePermissions: Record<Role, string[]> = {
  owner: [
    '/',
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
    '/dashboard-comercial',
    '/dashboard-marketing',
    '/dashboard-tech'
  ],
  master: [
    '/',
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
    '/pendencies'
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
    '/settings'
  ],
  operation: [
    '/dashboard-operacao',
    '/my-orders',
    '/orders',
    '/delivered-orders',
    '/wallet',
    '/productivity'
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