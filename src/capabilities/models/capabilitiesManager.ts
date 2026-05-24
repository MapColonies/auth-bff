import { inject, injectable } from 'tsyringe';
import type { Logger } from '@map-colonies/js-logger';
import type { components } from '@openapi'; // auto-generated from openapi3.yaml
import { SERVICES } from '@common/constants';
import { getBffConfig } from '@common/bffConfig';

// Single source of truth — type comes from the spec, not a manual definition
export type CapabilitiesResponse = components['schemas']['capabilities'];

@injectable()
export class CapabilitiesManager {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger) {}

  public getCapabilities(): CapabilitiesResponse {
    this.logger.info({ msg: 'getting capabilities' });

    const bffConfig = getBffConfig();

    return {
      site: bffConfig.site,
      environments: Object.keys(bffConfig.opa.servers),
      features: {
        managerEnabled: bffConfig.manager.enabled,
        opaEnabled: bffConfig.opa.enabled,
      },
    };
  }
}
