import httpStatus from 'http-status-codes'; // provide status code constants for to avoid status code in numbers for more readable code
import { injectable, inject } from 'tsyringe';
import type { Logger } from '@map-colonies/js-logger';
import type { TypedRequestHandlers } from '@openapi';
import { SERVICES } from '@common/constants';
import { CapabilitiesManager } from '../models/capabilitiesManager';

@injectable()
export class CapabilitiesController {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(CapabilitiesManager) private readonly manager: CapabilitiesManager
  ) {}

  public getCapabilities: TypedRequestHandlers['getCapabilities'] = (req, res) => {
    return res.status(httpStatus.OK).json(this.manager.getCapabilities());
  };
}
