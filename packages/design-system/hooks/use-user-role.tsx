/**
 * useUserRole - Hook to detect the current user's role
 *
 * Provides role-based UI variations for components like empty states.
 * Used to tailor messaging and CTAs based on user permissions.
 */

import * as React from "react";

// =============================================================================
// TYPES
// =============================================================================

/**
 * User roles in the system, ordered by permission level (highest to lowest)
 */
export type SystemRole =
  | "super_admin"
  | "tenant_admin"
  | "finance_manager"
  | "operations_manager"
  | "staff_manager"
  | "kitchen_lead"
  | "kitchen_staff"
  | "staff"
  | "read_only";

/**
 * Simplified role categories for UI purposes
 */
export type UIRoleCategory = "admin" | "contributor" | "viewer";

export interface UserRoleContext {
  /** The raw role from the database */
  role: SystemRole | null;
  /** Simplified category for UI decisions */
  category: UIRoleCategory;
  /** Whether the user can create content */
  canCreate: boolean;
  /** Whether the user can edit content */
  canEdit: boolean;
  /** Whether the user can delete content */
  canDelete: boolean;
  /** Whether the user has admin-level permissions */
  isAdmin: boolean;
  /** Whether the user is a viewer (read-only) */
  isViewer: boolean;
}

// =============================================================================
// ROLE MAPPING
// =============================================================================

/**
 * Role hierarchy for permission checks
 */
const ROLE_HIERARCHY: Record<SystemRole, number> = {
  super_admin: 100,
  tenant_admin: 90,
  finance_manager: 70,
  operations_manager: 70,
  staff_manager: 60,
  kitchen_lead: 50,
  kitchen_staff: 30,
  staff: 20,
  read_only: 10,
};

/**
 * Maps system roles to simplified UI categories
 */
function categorizeRole(role: SystemRole | null): UIRoleCategory {
  if (!role) return "viewer";

  switch (role) {
    case "super_admin":
    case "tenant_admin":
    case "finance_manager":
    case "operations_manager":
    case "staff_manager":
      return "admin";
    case "kitchen_lead":
    case "kitchen_staff":
    case "staff":
      return "contributor";
    case "read_only":
    default:
      return "viewer";
  }
}

/**
 * Determines if a role can create content
 */
function canRoleCreate(role: SystemRole | null): boolean {
  if (!role) return false;
  const level = ROLE_HIERARCHY[role] ?? 0;
  return level >= 20; // staff and above can create
}

/**
 * Determines if a role can edit content
 */
function canRoleEdit(role: SystemRole | null): boolean {
  if (!role) return false;
  const level = ROLE_HIERARCHY[role] ?? 0;
  return level >= 20; // staff and above can edit
}

/**
 * Determines if a role can delete content
 */
function canRoleDelete(role: SystemRole | null): boolean {
  if (!role) return false;
  const level = ROLE_HIERARCHY[role] ?? 0;
  return level >= 50; // kitchen_lead and above can delete
}

/**
 * Determines if a role has admin privileges
 */
function isRoleAdmin(role: SystemRole | null): boolean {
  if (!role) return false;
  return categorizeRole(role) === "admin";
}

/**
 * Determines if a role is view-only
 */
function isRoleViewer(role: SystemRole | null): boolean {
  if (!role) return true;
  return categorizeRole(role) === "viewer";
}

// =============================================================================
// CONTEXT
// =============================================================================

const UserRoleContext = React.createContext<UserRoleContext>({
  role: null,
  category: "viewer",
  canCreate: false,
  canEdit: false,
  canDelete: false,
  isAdmin: false,
  isViewer: true,
});

// =============================================================================
// PROVIDER
// =============================================================================

export interface UserRoleProviderProps {
  children: React.ReactNode;
  /** The user's role from the database/session */
  role: SystemRole | string | null;
}

/**
 * Provider component that makes role information available to all children
 */
export function UserRoleProvider({ children, role }: UserRoleProviderProps) {
  const normalizedRole = role as SystemRole | null;

  const value = React.useMemo<UserRoleContext>(() => {
    return {
      role: normalizedRole,
      category: categorizeRole(normalizedRole),
      canCreate: canRoleCreate(normalizedRole),
      canEdit: canRoleEdit(normalizedRole),
      canDelete: canRoleDelete(normalizedRole),
      isAdmin: isRoleAdmin(normalizedRole),
      isViewer: isRoleViewer(normalizedRole),
    };
  }, [normalizedRole]);

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access the current user's role context
 *
 * @example
 * ```tsx
 * const { category, canCreate, isViewer } = useUserRole();
 *
 * if (isViewer) {
 *   return <p>Contact an admin to add content</p>;
 * }
 * ```
 */
export function useUserRole(): UserRoleContext {
  const context = React.useContext(UserRoleContext);

  if (!context) {
    // Return default viewer context if used outside provider
    return {
      role: null,
      category: "viewer",
      canCreate: false,
      canEdit: false,
      canDelete: false,
      isAdmin: false,
      isViewer: true,
    };
  }

  return context;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Normalizes a role string to a SystemRole type
 * Useful for converting database role strings to the typed version
 */
export function normalizeRole(role: string | null | undefined): SystemRole | null {
  if (!role) return null;

  const validRoles: SystemRole[] = [
    "super_admin",
    "tenant_admin",
    "finance_manager",
    "operations_manager",
    "staff_manager",
    "kitchen_lead",
    "kitchen_staff",
    "staff",
    "read_only",
  ];

  return validRoles.includes(role as SystemRole)
    ? (role as SystemRole)
    : null;
}

/**
 * Gets role-aware empty state messaging
 */
export function getRoleAwareMessaging(
  category: UIRoleCategory,
  itemType: string
): {
  title: string;
  description: string;
  showCta: boolean;
  ctaText?: string;
} {
  const singular = itemType.replace(/s$/, "");

  switch (category) {
    case "admin":
      return {
        title: `No ${itemType} yet`,
        description: `Get started by adding your first ${singular}. Set up your ${singular} to begin organizing your operations.`,
        showCta: true,
        ctaText: `Add ${singular}`,
      };
    case "contributor":
      return {
        title: `No ${itemType} yet`,
        description: `Start by adding a ${singular}. Your changes will be visible to the team.`,
        showCta: true,
        ctaText: `Add ${singular}`,
      };
    case "viewer":
    default:
      return {
        title: `No ${itemType} yet`,
        description: `${singular.charAt(0).toUpperCase() + singular.slice(1)}s will appear here once an admin adds them. Contact your administrator if you need to add content.`,
        showCta: false,
      };
  }
}
