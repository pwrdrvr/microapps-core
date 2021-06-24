import { Property } from 'ts-convict';

export interface ISubConfig {
  bar: number;
}
export class SubConfig implements ISubConfig {
  @Property({
    doc: 'A sub prop',
    default: 3,
    env: 'SUB_CONFIG_BAR',
    format: 'int',
  })
  public bar!: number;

  public message = 'I am an unmanaged config property';
}
