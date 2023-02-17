import { S3TransferUtility } from './S3TransferUtility';
import path from 'path';

describe('S3TransferUtility', () => {
  it('collects the files', () => {
    const testFilesRoot = path.join(__dirname, '../../tests/files');
    const files = S3TransferUtility.GetFiles(path.join(__dirname, '../../tests/files'));

    expect(files).toBeDefined();
    expect(files).toHaveLength(6);

    const relativeFiles = files.map((file) => path.relative(testFilesRoot, file));
    expect(relativeFiles).toMatchSnapshot();
  });
});
