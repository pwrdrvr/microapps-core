export class Config {
  private static _tableName: string;
  public static get TableName(): string {
    return this._tableName;
  }
  public static set TableName(value: string) {
    if (this._tableName !== undefined && this._tableName !== value) {
      throw new Error('TableName is being set twice ');
    }
    this._tableName = value;
  }
}
