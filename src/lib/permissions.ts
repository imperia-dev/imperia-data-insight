export type Role = 'master' | 'admin' | 'operation';

// Define which roles can access which routes
export const rolePermissions: Record<Role, string[]> = {
  master: [
    '/',
    '/orders',
    '/delivered-orders',
    '/documents',
    '/team',
    '/productivity',
    '/financial',
    '/wallet',
    '/reports',
    '/calendar',
    '/timesheet',
    '/ai-analytics',
    '/settings'
  ],
  admin: [
    '/',
    '/orders',
    '/delivered-orders',
    '/documents',
    '/team',
    '/productivity',
    '/financial',
    '/reports',
    '/calendar',
    '/timesheet',
    '/ai-analytics',
    '/settings'
  ],
  operation: [
    '/',
    '/my-orders',
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