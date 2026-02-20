export interface PermissibleItem {
  ownerId?: string;
  allowedEditors?: string[];
  allowedGroups?: string[];
}

export function canEdit(
  item: PermissibleItem,
  user: { uid: string; isAdmin: boolean; isGlobalAdmin?: boolean; groups: string[] } | null
): boolean {
  if (!user) return false;
  if (user.isGlobalAdmin || user.isAdmin) return true;
  
  // Check if user is the owner
  if (item.ownerId && item.ownerId === user.uid) return true;
  
  // Check if user is in the allowedEditors list
  if (item.allowedEditors && item.allowedEditors.includes(user.uid)) return true;
  
  // Check if user belongs to any of the allowedGroups
  if (item.allowedGroups && user.groups.some(group => item.allowedGroups?.includes(group))) {
    return true;
  }
  
  return false;
}
