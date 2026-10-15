import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { join, sep } from 'node:path';

const ASSETS_DIR = `${sep}assets${sep}`;

/**
 * Serves the built SPA from the API process, for single-container deploys.
 * Vite's hashed /assets/* files are cached for a year; everything else that
 * is not /api (e.g. /signin) gets index.html so client-side routing works.
 */
export function serveFrontend(app: NestExpressApplication, staticDir: string): void {
  app.useStaticAssets(staticDir, {
    index: false,
    setHeaders: (res, filePath) => {
      res.setHeader(
        'Cache-Control',
        filePath.includes(ASSETS_DIR) ? 'public, max-age=31536000, immutable' : 'no-cache',
      );
    },
  });

  const indexHtml = join(staticDir, 'index.html');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isPageRequest =
      (req.method === 'GET' || req.method === 'HEAD') &&
      !req.path.startsWith('/api') &&
      !req.path.startsWith('/assets/');
    if (!isPageRequest) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}
