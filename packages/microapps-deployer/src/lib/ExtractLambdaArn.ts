import Log from './Log';

export function ExtractARNandAlias(lambdaARN: string): {
  lambdaARNBase: string;
  lambdaARNType: 'version' | 'alias' | 'function';
  lambdaQualifier?: string;
  lambdaAlias?: string;
  lambdaVersion?: string;
} {
  let lambdaARNBase: string = lambdaARN;
  let lambdaVersion: string | undefined = undefined;
  let lambdaAlias: string | undefined = undefined;
  let lambdaARNType: 'version' | 'alias' | 'function' = 'function';

  if (lambdaARN.match(/:/g)?.length === 7) {
    if (/^[0-9]+$/.test(lambdaARN.substring(lambdaARN.lastIndexOf(':') + 1))) {
      lambdaARNType = 'version';
      lambdaARNBase = lambdaARN?.substring(0, lambdaARN.lastIndexOf(':'));
      lambdaVersion = lambdaARN.substring(lambdaARN.lastIndexOf(':') + 1);
      Log.Instance.info(`Lambda ARN has Version: ${lambdaARN}`);
    } else {
      lambdaARNType = 'alias';
      lambdaARNBase = lambdaARN?.substring(0, lambdaARN.lastIndexOf(':'));
      lambdaAlias = lambdaARN.substring(lambdaARN.lastIndexOf(':') + 1);
      Log.Instance.info(`Lambda ARN has Alias: ${lambdaARN}`);
    }
  } else {
    lambdaARNType = 'function';
    lambdaARNBase = lambdaARN;
    Log.Instance.info(`Lambda ARN does not have Alias: ${lambdaARN}`);
  }

  return { lambdaARNBase, lambdaAlias, lambdaVersion, lambdaARNType };
}
