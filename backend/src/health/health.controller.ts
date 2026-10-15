import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { SkipThrottle } from '@nestjs/throttler';
import { type Connection, ConnectionStates } from 'mongoose';

// Render sets RENDER_GIT_COMMIT; other hosts can pass GIT_SHA. The deploy job
// polls this to know when the new version is live.
const VERSION = process.env.RENDER_GIT_COMMIT ?? process.env.GIT_SHA ?? 'unknown';

/** Liveness/readiness probe for container healthchecks and load balancers. */
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  check(): { status: 'ok'; database: 'up'; version: string } {
    if (this.connection.readyState !== ConnectionStates.connected) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok', database: 'up', version: VERSION };
  }
}
