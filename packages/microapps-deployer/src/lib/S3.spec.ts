import * as s3 from '@aws-sdk/client-s3';
import type { IConfig } from '../config/Config';
import { CopyFilesInList } from './S3';

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return { ...actual, S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })) };
});

// The client retains this function, while each test controls its implementation.
async function mockSend(command: unknown): Promise<void> {
  await send(command);
}
const send = jest.fn();
const config = { filestore: { destinationBucket: 'destination' } } as IConfig;

beforeEach(() => send.mockReset());

it('copies with bounded concurrency and only deletes successfully copied sources', async () => {
  let active = 0;
  let peak = 0;
  const copied = new Set<string>();
  const deleted = new Set<string>();
  send.mockImplementation(async (command: s3.CopyObjectCommand | s3.DeleteObjectCommand) => {
    if (command instanceof s3.CopyObjectCommand) {
      active++;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => setImmediate(resolve));
      copied.add((command.input.CopySource as string).replace('staging/', ''));
      active--;
    } else {
      expect(copied.has(command.input.Key as string)).toBe(true);
      deleted.add(command.input.Key as string);
    }
  });
  await CopyFilesInList(
    { Contents: Array.from({ length: 61 }, (_, i) => ({ Key: `source/${i}` })), $metadata: {} },
    'staging',
    'source/',
    'dest',
    config,
  );
  expect(peak).toBe(20);
  expect(copied.size).toBe(61);
  expect(deleted.size).toBe(61);
});

it('propagates copy failure without deleting the failed source', async () => {
  send.mockRejectedValue(new Error('copy failed'));
  await expect(
    CopyFilesInList(
      { Contents: [{ Key: 'source/failed' }], $metadata: {} },
      'staging',
      'source/',
      'dest',
      config,
    ),
  ).rejects.toThrow('copy failed');
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0][0]).toBeInstanceOf(s3.CopyObjectCommand);
});

it('accepts an empty object listing', async () => {
  await CopyFilesInList({ $metadata: {} }, 'staging', 'source/', 'dest', config);
  expect(send).not.toHaveBeenCalled();
});
