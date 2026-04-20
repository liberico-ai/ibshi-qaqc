import 'dotenv/config'; // trigger reload 2
import fs from 'fs';
import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { loadBackendModules } from './core/backend-loader.js';
import { createLogger, setLogLevel } from './core/logger.js';
import { SettingsService } from './core/settings.js';
import { errorMiddleware } from './core/errors.js';
import { requestContext, generateTraceId } from './core/request-context.js';

const log = createLogger('server');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD;

async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === 'production'
) {
  const resolve = (p) => path.resolve(__dirname, '..', p);
  const app = express();
  
  if (isProd) {
    app.use(helmet({ contentSecurityPolicy: false }));
  }
  app.use(cors({ 
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : (isProd ? false : '*'),
    credentials: true 
  }));
  app.use(express.json({ limit: '16kb' })); // Parse JSON bodies

  // Tracing middleware: gán traceId cho mỗi request
  app.use((req, res, next) => {
    const clientTrace = req.headers['x-trace-id'];
    const traceId = (clientTrace && /^[a-f0-9]{8,32}$/i.test(clientTrace)) 
      ? clientTrace 
      : generateTraceId();
    res.setHeader('x-trace-id', traceId);
    requestContext.run({ traceId }, () => next());
  });

  // Apply log level from DB settings (override env default if set)
  try {
    const logLevel = await SettingsService.getSetting('log_level');
    if (logLevel) setLogLevel(logLevel);
  } catch {
    // DB may not be ready yet on first run — env default stays in effect
  }

  // Load backend modules (APIs)
  log.info('Loading backend modules...');
  await loadBackendModules(app);

  // Centralized error handler for all API routes (must be after loadBackendModules)
  app.use('/api', errorMiddleware);

  let vite;
  if (!isProd) {
    // Development mode
    vite = await (await import('vite')).createServer({
      root,
      logLevel: isTest ? 'error' : 'info',
      server: {
        middlewareMode: true,
        watch: {
          usePolling: true,
          interval: 100
        }
      },
      appType: 'custom'
    });
    // use vite's connect instance as middleware
    app.use(vite.middlewares);
  } else {
    // Production mode
    app.use(express.static(resolve('dist/client'), { index: false }));
  }

  app.use('*', async (req, res) => {
    try {
      const url = req.originalUrl;
      
      // Skip api routes in SSR catch-all
      if (url.startsWith('/api')) {
         return res.status(404).json({ error: 'API endpoint not found' });
      }

      let template, render;

      if (!isProd) {
        // always read fresh template in dev
        template = fs.readFileSync(resolve('index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        render = (await vite.ssrLoadModule('/src/entry-server.js')).render;
      } else {
        template = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8');
        render = (await import(resolve('dist/server/entry-server.js'))).render;
      }

      const { html } = await render(url);
      const output = template.replace(`<!--ssr-outlet-->`, html);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(output);
    } catch (e) {
      if (vite) {
        vite.ssrFixStacktrace(e);
      }
      log.error(e, 'SSR render error');
      res.status(500).end(isProd ? 'Internal Server Error' : e.stack);
    }
  });

  return { app, vite };
}

import { Server as SocketIOServer } from 'socket.io';
import { initSystemSocket } from './modules/system/backend/socket.js';
import { initScheduler } from './core/scheduler.js';

createServer().then(({ app }) => {
  let port = parseInt(process.env.PORT || 3005, 10);
  
  const startServer = () => {
    const server = app.listen(port, () => {
      log.info(`Server running at http://localhost:${port}`);
    });

    const io = new SocketIOServer(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
        credentials: true
      }
    });
    
    initSystemSocket(io);
    app.set('io', io); // so controllers can use req.app.get('io')

    // Start background jobs
    initScheduler();
    
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        log.warn(`Port ${port} is busy, trying ${port + 1}...`);
        port++;
        startServer();
      } else {
        log.error(e, 'Server start error');
      }
    });
  };
  
  startServer();
});
