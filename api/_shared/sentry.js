import { SENTRY_DSN } from './config.js';
import { init, captureException, logger, flush } from '@sentry/node';

init({
	dsn: SENTRY_DSN,
	environment: process.env.CONTEXT || 'development',
});

export { captureException, logger, flush };
