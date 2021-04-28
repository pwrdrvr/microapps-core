import fs from 'fs';
const fsAsync = fs.promises;

export default class DeployConfig {
  private static readonly _fileName = 'deploy.json';

  public static async Load(): Promise<DeployConfig> {
    const stat = await fsAsync.stat(DeployConfig._fileName);
    if (stat.isFile()) {
      const config = JSON.parse(
        await fsAsync.readFile(DeployConfig._fileName, 'utf-8'),
      ) as DeployConfig;
      return config;
    }
    return undefined;
  }

  public DefaultFile: string;
  private _appName: string;
  public get AppName(): string {
    return this._appName;
  }
  public set AppName(value: string) {
    this._appName = value.toLowerCase();
  }
  public SemVer: string;
  public StaticAssetsPath: string;
  public LambdaARN: string;
}
