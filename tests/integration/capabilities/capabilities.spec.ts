import { jsLogger } from '@map-colonies/js-logger';
import { describe, it, expect, beforeAll } from 'vitest';
import { trace } from '@opentelemetry/api';
import { StatusCodes } from 'http-status-codes';
import { createRequestSender, type RequestSender } from '@map-colonies/openapi-helpers/requestSender';
import type { paths, operations } from '@openapi';
import { getApp } from '@src/app';
import { SERVICES } from '@common/constants';
import { initConfig } from '@common/config';

describe('capabilities', function () {
  let requestSender: RequestSender<paths, operations>;

  beforeAll(async function () {
    await initConfig(true);
    const [app] = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: await jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });

    requestSender = await createRequestSender<paths, operations>('openapi3.yaml', app);
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

        expect(Array.isArray(response.body.environments)).toBe(true);
      });

      it('should return managerEnabled and opaEnabled as booleans', async function () {
        const response = await requestSender.getCapabilities();

        expect(typeof response.body.features.managerEnabled).toBe('boolean');
        expect(typeof response.body.features.opaEnabled).toBe('boolean');
      });
    });

    describe('Bad Path', function () {
      it('should in theory test 400 status code', function () {
        expect(true).toBe(true);
      });
    });

    describe('Sad Path', function () {
      it('should in theory test 500 status code', function () {
        expect(true).toBe(true);
      });
    });
  });
});
