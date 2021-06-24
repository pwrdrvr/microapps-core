import { Property } from 'ts-convict';

export interface IFileStore {
  stagingBucket: string;
}

export class FileStore implements IFileStore {
  @Property({
    doc: 'Staging bucket',
    default: 'microapps-staging',
    env: 'FILESTORE_STAGING_BUCKET',
  })
  public stagingBucket!: string;
}
