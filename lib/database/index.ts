/**
 * Database operations - Centralized exports
 * DRY: Single import point for all database operations
 */

export * from './projects';
export * from './suggestions';
export type { Database, Tables, TablesInsert, TablesUpdate } from '../database.types';

