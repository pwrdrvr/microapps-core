import { describe, it } from 'mocha';
import { expect } from 'chai';

import { borkBork } from './index';

describe("let's test something", () => {
  // before(function (done) {
  //   // Do something
  //   done();
  // });

  it('calling borkBork should always return false', () => {
    // Call the borkBork function
    const result = borkBork();
    expect(result).equal(false);
  });
});
