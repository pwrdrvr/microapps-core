import { Property } from 'ts-convict';

export interface IFileStore {
  sourceBucket: string;
  destinationBucket: string;
}

export class FileStore implements IFileStore {
  @Property({
    doc: 'Source bucket to copy staged apps from',
    default: 'microapps-staging',
    env: 'FILESTORE_SRC_BUCKET',
  })
  public sourceBucket!: string;

  @Property({
    doc: 'Destination bucket to copy staged apps to',
    default: 'microapps',
    env: 'FILESTORE_DEST_BUCKET',
  })
  public destinationBucket!: string;
}
