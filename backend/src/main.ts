import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { requestContext } from './common/middleware/request-context.middleware';
import type { Env } from './config/env.validation';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Structured JSON logs in production for log aggregators; readable text locally.
    logger: new ConsoleLogger({ json: process.env.NODE_ENV === 'production' }),
  });
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  app.use(requestContext);
  app.useBodyParser('json', { limit: '10kb' });
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  logger.log(`Listening on port ${port}`);
}

process.on('unhandledRejection', (reason) => {
  logger.error(
    `Unhandled promise rejection: ${String(reason)}`,
    reason instanceof Error ? reason.stack : undefined,
  );
});

process.on('uncaughtException', (error) => {
  logger.fatal(`Uncaught exception: ${error.message}`, error.stack);
  process.exit(1);
});

bootstrap().catch((error: unknown) => {
  logger.fatal(
    `Failed to start: ${error instanceof Error ? error.message : String(error)}`,
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});
