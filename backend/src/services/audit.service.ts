import { prisma } from '../config/database.js';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE_CONTENT = 'CREATE_CONTENT',
  UPDATE_CONTENT = 'UPDATE_CONTENT',
  DELETE_CONTENT = 'DELETE_CONTENT',
  PUBLISH_CONTENT = 'PUBLISH_CONTENT',
  UNPUBLISH_CONTENT = 'UNPUBLISH_CONTENT',
  CREATE_SEASON = 'CREATE_SEASON',
  UPDATE_SEASON = 'UPDATE_SEASON',
  DELETE_SEASON = 'DELETE_SEASON',
  CREATE_EPISODE = 'CREATE_EPISODE',
  UPDATE_EPISODE = 'UPDATE_EPISODE',
  DELETE_EPISODE = 'DELETE_EPISODE',
  UPLOAD_MEDIA = 'UPLOAD_MEDIA',
  DELETE_MEDIA = 'DELETE_MEDIA',
  CREATE_GENRE = 'CREATE_GENRE',
  UPDATE_GENRE = 'UPDATE_GENRE',
  DELETE_GENRE = 'DELETE_GENRE',
  CREATE_CATEGORY = 'CREATE_CATEGORY',
  UPDATE_CATEGORY = 'UPDATE_CATEGORY',
  DELETE_CATEGORY = 'DELETE_CATEGORY',
}

interface AuditLogParams {
  adminId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
}

export class AuditService {
  async log(params: AuditLogParams) {
    try {
      await prisma.adminAuditLog.create({
        data: {
          adminId: params.adminId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          details: params.details || {},
        },
      });
    } catch (error) {
      console.error('[AuditService.log] Failed to write audit log', error);
      // We don't throw here to avoid failing the primary business logic 
      // if logging fails temporarily.
    }
  }
}

export const auditService = new AuditService();
