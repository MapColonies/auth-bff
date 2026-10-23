import { inject, injectable } from 'tsyringe';
import type { Logger } from '@map-colonies/js-logger';
import type { components } from '@openapi';
import { SERVICES } from '@common/constants';
import type { ConfigType } from '@common/config';

export type CapabilitiesResponse = components['schemas']['capabilities'];

@injectable()
export class CapabilitiesManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: ConfigType
  ) {}

  public getCapabilities(): CapabilitiesResponse {
    this.logger.info({ msg: 'getting capabilities' });

    return {
      site: this.config.get('site'),
      environments: Object.keys(this.config.get('opa.servers')),
      features: {
        managerEnabled: this.config.get('manager.enabled'),
        opaEnabled: this.config.get('opa.enabled'),
      },
    };
  }
}
