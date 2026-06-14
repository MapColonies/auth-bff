import { inject, injectable } from 'tsyringe';
import type { Logger } from '@map-colonies/js-logger';
import type { components } from '@openapi';
import { SERVICES } from '@common/constants';
import { getConfig } from '@common/config';

export type CapabilitiesResponse = components['schemas']['capabilities'];

@injectable()
export class CapabilitiesManager {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger) {}

  public getCapabilities(): CapabilitiesResponse {
    this.logger.info({ msg: 'getting capabilities' });

    const config = getConfig();

    return {
      site: config.get('site'),
      environments: Object.keys(config.get('opa.servers')),
      features: {
        managerEnabled: config.get('manager.enabled'),
        opaEnabled: config.get('opa.enabled'),
      },
    };
  }
}
