import { jsLogger } from '@map-colonies/js-logger';
import { describe, afterEach, it, expect, beforeAll, vi } from 'vitest';
import { trace } from '@opentelemetry/api';
import { StatusCodes } from 'http-status-codes';
import { agent } from 'supertest';
import type { Application } from 'express';
import { getApp } from '@src/app';
import { SERVICES } from '@common/constants';
import { initConfig, getConfig } from '@common/config';

describe('manager', function () {
  let app: Application;

  beforeAll(async function () {
    await initConfig(true);
    const config = getConfig();
    const originalGet = config.get.bind(config);
    vi.spyOn(config, 'get').mockImplementation((key: string) => (key === 'manager.url' ? 'http://127.0.0.1:9' : originalGet(key as never)));

    [app] = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: await jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });

    vi.restoreAllMocks();
  });

  afterEach(function () {
    vi.restoreAllMocks();
  });

  describe('#ProxyToManager', function () {
    describe('Happy Path', function () {
      it('should return 502 when manager is enabled but the upstream is unreachable', async function () {
        const response = await agent(app).get('/manager/client');

        expect(response.status).toBe(StatusCodes.BAD_GATEWAY);
        expect(response.body).toMatchObject({ message: 'Auth Manager is currently unreachable' });
      });
    });

    describe('Bad Path', function () {
      it('should return 503 when manager.enabled is false', async function () {
        const config = getConfig();
        vi.spyOn(config, 'get').mockImplementation((key: string) => (key === 'manager.enabled' ? false : config.get(key as never)));

        const response = await agent(app).get('/manager/client');

        expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE);
        expect(response.body).toMatchObject({ message: 'Auth Manager capabilities are disabled on this node' });
      });
    });

    describe('Sad Path', function () {
      it('should return 500 when an unexpected error is thrown while checking manager.enabled', async function () {
        const config = getConfig();
        const originalGet = config.get.bind(config);
        vi.spyOn(config, 'get').mockImplementation((key: string) => {
          if (key === 'manager.enabled') {
            throw new Error('unexpected config error');
          }
          return originalGet(key as never);
        });

        const response = await agent(app).get('/manager/client');

        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toMatchObject({ message: 'unexpected config error' });
      });
    });
  });
});
