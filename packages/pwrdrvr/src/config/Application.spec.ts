import 'reflect-metadata';
import { TSConvict } from 'ts-convict';
import { ApplicationConfig } from './Application';

describe('application alias configuration', () => {
  it('omits aliases by default so old publishing configurations preserve them', () => {
    const config = new TSConvict<ApplicationConfig>(ApplicationConfig).load([]);
    expect(config.extraAppNames).toBeUndefined();
  });
  it('distinguishes an explicit empty list from omission', () => {
    const config = new ApplicationConfig();
    config.extraAppNames = [];
    expect(config.extraAppNames).toEqual([]);
    config.extraAppNames = ['search', 'product'];
    expect(config.extraAppNames).toEqual(['search', 'product']);
  });
});
