import { describe, it, expect } from 'vitest';
import { getConfig } from '@common/config';

describe('config', () => {
  describe('#getConfig', () => {
    describe('#SadPath', () => {
      it('should throw when called before initConfig', function () {
        expect(() => getConfig()).toThrow('config not initialized');
      });
    });
  });
});
