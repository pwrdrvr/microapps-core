import { IRequestBase } from './base';

/**
 * Represents a Create Application Request
 */
export interface ICreateApplicationRequest extends IRequestBase {
  readonly type: 'createApp';

  /**
   * Name of the application
   */
  readonly appName: string;

  /**
   * Display name of the application
   */
  readonly displayName: string;

  /** Application-level aliases. Omit to preserve; supply [] to remove all aliases. */
  readonly extraAppNames?: string[];
}
