import express from 'express';
import cors from 'cors';
import pino from 'pino';
import exercisesRouter from './routes/exercises.js';
import categoriesRouter from './routes/categories.js';
import musclesRouter from './routes/muscles.js';
import authRouter from './routes/auth.js';
import pool from './config/db.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();

app.disable('x-powered-by');

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected' });
    } catch {
        res.status(503).json({ status: 'error', db: 'disconnected' });
    }
});

app.use('/exercises', exercisesRouter);
app.use('/categories', categoriesRouter);
app.use('/muscles', musclesRouter);
app.use('/auth', authRouter);

app.get('/', async (req, res) => {
    res.status(200).json({ message: 'Welcome to the API gym' });
});

// Centralized error handler
app.use((err, req, res, next) => {
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

    if (res.headersSent) return next(err);

    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        message: err.expose ? err.message : 'Internal server error',
    });
});

export default app;

const PORT = process.env.PORT ?? 3000;

// Only start listening when not running tests
let server;
if (!process.env.VITEST) {
    server = app.listen(PORT, () => {
        logger.info({ port: PORT }, 'Server started');
    });
}

// Graceful shutdown
function shutdown(signal) {
    logger.info({ signal }, 'Shutting down gracefully');

    const closePool = () => {
        pool.end().then(() => {
            logger.info('Pool closed');
            process.exit(0);
        }).catch((err) => {
            logger.error({ err }, 'Error closing pool');
            process.exit(1);
        });
    };

    if (server) {
        server.close(closePool);
    } else {
        closePool();
    }

    // Force exit after 10s
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
