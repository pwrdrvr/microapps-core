import path from 'path';
import { Upload } from '@aws-sdk/lib-storage';
import { S3TransferUtility } from './S3TransferUtility';

jest.mock('@aws-sdk/lib-storage', () => ({ Upload: jest.fn() }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), createReadStream: jest.fn() }));

it('drains legacy directory uploads while limiting concurrency to ten', async () => {
  const files = Array.from({ length: 31 }, (_, i) => `/assets/${i}.txt`);
  const getFiles = jest.spyOn(S3TransferUtility, 'GetFiles').mockReturnValue(files);
  let active = 0;
  let peak = 0;
  let completed = 0;
  (Upload as unknown as jest.Mock).mockImplementation(() => ({
    done: async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => setImmediate(resolve));
      active--;
      completed++;
    },
  }));
  try {
    await S3TransferUtility.UploadDir('/assets', '', 'bucket', {
      awsCredentials: { accessKeyId: 'key', secretAccessKey: 'secret', sessionToken: 'token' },
    } as Parameters<typeof S3TransferUtility.UploadDir>[3]);
    expect(peak).toBe(10);
    expect(completed).toBe(files.length);
    expect(active).toBe(0);
  } finally {
    getFiles.mockRestore();
  }
});

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
