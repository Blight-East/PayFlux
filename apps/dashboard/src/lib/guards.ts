import { type WorkspaceContext } from './resolve-workspace';

/**
 * Throws an error if the user is not an admin.
 * Designed to be used within API routes after requireAuth().
 */
export function requireAdmin(workspace: WorkspaceContext) {
    if (workspace.role !== 'admin') {
        throw new Error('ADMIN_REQUIRED');
    }
}
