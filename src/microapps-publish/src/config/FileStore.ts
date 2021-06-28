import { Property } from 'ts-convict';

export interface IFileStoreRename {
  stagingBucket: string;
}

export class FileStoreConfig implements IFileStoreRename {
  @Property({
    doc: 'Staging bucket',
    default: 'microapps-staging',
    env: 'FILESTORE_STAGING_BUCKET',
  })
  public stagingBucket!: string;
}
