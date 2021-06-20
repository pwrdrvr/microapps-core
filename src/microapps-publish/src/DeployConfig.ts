import { promises as fs } from 'fs';

export interface IDeployConfig {
  AppName: string;
  SemVer: string;
  DefaultFile: string;
  StaticAssetsPath: string;
  LambdaARN: string;
  AWSAccountID: string;
  AWSRegion: string;
  ServerlessNextRouterPath: string;
}

export default class DeployConfig implements IDeployConfig {
  private static readonly _fileName = 'deploy.json';

  public static async Load(): Promise<DeployConfig> {
    try {
      const stat = await fs.stat(DeployConfig._fileName);
      if (stat.isFile()) {
        const config = JSON.parse(
          await fs.readFile(DeployConfig._fileName, 'utf-8'),
        ) as DeployConfig;
        return config;
      }
    } catch {
      // File did not exist, so stat throws
      return undefined;
    }
    return undefined;
  }

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
  public AWSAccountID: string;
  public AWSRegion: string;
  public ServerlessNextRouterPath: string;
  public DefaultFile: string;
}
