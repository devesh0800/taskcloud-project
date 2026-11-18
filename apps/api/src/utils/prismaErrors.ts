import { Prisma } from '@prisma/client';

export interface DatabaseErrorResult {
  statusCode: number;
  message: string;
  field?: string;
}

export function handlePrismaError(error: unknown): DatabaseErrorResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta?.target as string[])?.join(', ') || 'field';
        return {
          statusCode: 409,
          message: `A record with this ${target} already exists.`,
          field: target,
        };
      }
      case 'P2003': {
        const fieldName = (error.meta?.field_name as string) || 'relation';
        return {
          statusCode: 400,
          message: `Invalid reference: Referenced ${fieldName} does not exist.`,
        };
      }
      case 'P2025': {
        return {
          statusCode: 404,
          message: 'The requested record was not found or has been removed.',
        };
      }
      case 'P2000': {
        return {
          statusCode: 400,
          message: 'Input value exceeds maximum allowed column length.',
        };
      }
      default:
        return {
          statusCode: 500,
          message: `Database error code: ${error.code}`,
        };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: 400,
      message: 'Database query validation failed. Please check required fields.',
    };
  }

  return {
    statusCode: 500,
    message: error instanceof Error ? error.message : 'Unknown database error occurred.',
  };
}
