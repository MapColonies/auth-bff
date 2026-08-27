import { jsLogger } from '@map-colonies/js-logger';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { trace } from '@opentelemetry/api';
import { StatusCodes } from 'http-status-codes';
import { agent } from 'supertest';
import type { Application } from 'express';
import { createRequestSender, type RequestSender } from '@map-colonies/openapi-helpers/requestSender';
import type { paths, operations } from '@openapi';
import { getApp } from '@src/app';
import { SERVICES } from '@common/constants';
import { initConfig, getConfig } from '@common/config';

describe('capabilities', function () {
  let app: Application;
  let requestSender: RequestSender<paths, operations>;

  beforeAll(async function () {
    await initConfig(true);
    [app] = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: await jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });

    requestSender = await createRequestSender<paths, operations>('openapi3.yaml', app);
  });

  afterEach(function () {
    vi.restoreAllMocks();
  });

  describe('#GetCapabilities', function () {
    describe('Happy Path', function () {
      it('should return 200 status code and the capabilities object', async function () {
        const response = await requestSender.getCapabilities();

        expect(response).toSatisfyApiSpec();
        expect(response).toMatchObject({ status: StatusCodes.OK });
        expect(response.body).toHaveProperty('site');
        expect(response.body).toHaveProperty('environments');
        expect(response.body).toHaveProperty('features');
      });

      it('should return environments as an array derived from opa.servers config keys', async function () {
        const response = await requestSender.getCapabilities();

        if (response.status !== 200) {
          throw new Error(`expected ${StatusCodes.OK}, got ${response.status}`);
        }

        expect(Array.isArray(response.body.environments)).toBe(true);
      });

      it('should return managerEnabled and opaEnabled as booleans', async function () {
        const response = await requestSender.getCapabilities();

        if (response.status !== 200) {
          throw new Error(`expected ${StatusCodes.OK}, got ${response.status}`);
        }

        expect(typeof response.body.features.managerEnabled).toBe('boolean');
        expect(typeof response.body.features.opaEnabled).toBe('boolean');
      });
    });

    describe('Bad Path', function () {
      it('should return 400 for an unknown query parameter', async function () {
        const response = await agent(app).get('/capabilities').query({ foo: 'bar' });

        expect(response.status).toBe(StatusCodes.BAD_REQUEST);
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('Sad Path', function () {
      it('should return 500 when config throws while building the capabilities response', async function () {
        const config = getConfig();
        vi.spyOn(config, 'get').mockImplementation(() => {
          throw new Error('config not initialized');
        });

        const response = await requestSender.getCapabilities();

        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toMatchObject({ message: 'config not initialized' });
      });
    });
  });
});
