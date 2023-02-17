import { S3TransferUtility } from './S3TransferUtility';
import path from 'path';

describe('S3TransferUtility', () => {
  it('collects the files', () => {
    const files = S3TransferUtility.GetFiles(path.join(__dirname, '../../tests/files'));

    expect(files).toBeDefined();
    expect(files).toHaveLength(6);
    expect(files).toMatchSnapshot();
  });
});
