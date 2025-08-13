/**
 * Modern Authentication Hooks
 * 
 * This file provides the updated hooks for the secure authentication system
 */

import { useAuth, usePermissions } from '@/components/auth-provider-secure'

// Re-export for compatibility
export { useAuth, usePermissions }

// Legacy hook support (for backward compatibility)
export const useAuthLegacy = useAuth
