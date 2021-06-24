import { Property } from 'ts-convict';

export class SubConfig implements config.ISubConfig {
  @Property({
    doc: 'A sub prop',
    default: 3,
    env: 'SUB_CONFIG_BAR',
    format: 'int',
  })
  public bar!: number;

  public message = 'I am an unmanaged config property';
}
