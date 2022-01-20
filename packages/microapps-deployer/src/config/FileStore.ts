import { Property } from 'ts-convict';

/**
 * Represents a FileStore Config
 */
export interface IFileStore {
  stagingBucket: string;
  destinationBucket: string;
}

export class FileStore implements IFileStore {
  @Property({
    doc: 'Staging bucket to copy staged apps from',
    default: 'microapps-staging',
    env: 'FILESTORE_STAGING_BUCKET',
  })
  public stagingBucket!: string;

  @Property({
    doc: 'Destination bucket to copy staged apps to',
    default: 'microapps',
    env: 'FILESTORE_DEST_BUCKET',
  })
  public destinationBucket!: string;
}
