import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { jsLogger } from '@map-colonies/js-logger';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { trace } from '@opentelemetry/api';
import { StatusCodes } from 'http-status-codes';
import { agent } from 'supertest';
import type { Application } from 'express';
import { getApp } from '@src/app';
import { SERVICES } from '@common/constants';
import { initConfig, getConfig } from '@common/config';

describe('opa', function () {
  let app: Application;

  beforeAll(async function () {
    await initConfig(true);
    [app] = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: await jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
  });

  describe('#EvaluateOpa', function () {
    describe('Happy Path', function () {
      it('should return 502 when opa is enabled but the upstream is unreachable', async function () {
        const response = await agent(app)
          .post('/opa/prod/evaluate/authz/allow')
          .send({ input: { user: 'alice' } });

        expect(response.status).toBe(StatusCodes.BAD_GATEWAY);
        expect(response.body).toMatchObject({ message: 'OPA server is unreachable', environment: 'prod' });
        expect(response.body).toHaveProperty('targetUrl');
      });

      it('should forward the request to the upstream under /v1/data', async function () {
        let receivedMethod: string | undefined;
        let receivedUrl: string | undefined;
        const upstream = createServer((req, res) => {
          receivedMethod = req.method;
          receivedUrl = req.url;
          res.writeHead(StatusCodes.OK, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result: true }));
        });
        await new Promise<void>((resolve) => upstream.listen(0, resolve));
        const { port } = upstream.address() as AddressInfo;

        const config = getConfig();
        const originalGet = config.get.bind(config);
        // @ts-expect-error overriding get() for this test only
        config.get = (key: string) => (key === 'opa.servers' ? { ...originalGet(key), prod: `http://127.0.0.1:${port}` } : originalGet(key));

        try {
          const response = await agent(app)
            .post('/opa/prod/evaluate/authz/allow')
            .send({ input: { user: 'alice' } });

          expect(response.status).toBe(StatusCodes.OK);
          expect(response.body).toEqual({ result: true });
          expect(receivedMethod).toBe('POST');
          expect(receivedUrl).toBe('/v1/data/authz/allow');
        } finally {
          config.get = originalGet;
          await new Promise<void>((resolve) => upstream.close(() => resolve()));
        }
      });
    });

    describe('Bad Path', function () {
      it('should return 503 when opa.enabled is false', async function () {
        const config = getConfig();
        const originalGet = config.get.bind(config);
        vi.spyOn(config, 'get').mockImplementation((key: string) => (key === 'opa.enabled' ? false : originalGet(key as never)));

        let disabledApp: Application;
        try {
          [disabledApp] = await getApp({
            override: [
              { token: SERVICES.LOGGER, provider: { useValue: await jsLogger({ enabled: false }) } },
              { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
            ],
            useChild: true,
          });
        } finally {
          vi.restoreAllMocks();
        }

        const response = await agent(disabledApp).post('/opa/prod/evaluate/authz/allow');

        expect(response.status).toBe(StatusCodes.SERVICE_UNAVAILABLE);
        expect(response.body).toMatchObject({ message: 'OPA capabilities are disabled on this node' });
      });

      it('should return 405 for a DELETE request', async function () {
        const response = await agent(app).delete('/opa/prod/evaluate/authz/allow');

        expect(response.status).toBe(StatusCodes.METHOD_NOT_ALLOWED);
        expect(response.body).toHaveProperty('message');
      });

      it('should return 405 for a PUT request', async function () {
        const response = await agent(app).put('/opa/prod/evaluate/authz/allow');

        expect(response.status).toBe(StatusCodes.METHOD_NOT_ALLOWED);
        expect(response.body).toHaveProperty('message');
      });

      it('should return 404 for an unknown environment', async function () {
        const response = await agent(app).post('/opa/nonexistent/evaluate/authz/allow');

        expect(response.status).toBe(StatusCodes.NOT_FOUND);
        expect(response.body).toMatchObject({ message: `OPA environment 'nonexistent' not found` });
      });
    });

    describe('Sad Path', function () {
      it('should return 500 when opa.servers config is missing', async function () {
        const config = getConfig();
        const originalGet = config.get.bind(config);

        // @ts-expect-error overriding get() for this test only
        config.get = (key: string) => (key === 'opa.servers' ? undefined : originalGet(key));

        const response = await agent(app).post('/opa/prod/evaluate/authz/allow');

        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message');

        config.get = originalGet;
      });
    });
  });
});
