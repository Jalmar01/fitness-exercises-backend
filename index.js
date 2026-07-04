import express  from 'express';
import cors from 'cors';
import exercisesRouter from './routes/exercises.js';
import categoriesRouter from './routes/categories.js';
import musclesRouter from './routes/muscles.js';
import authRouter from './routes/auth.js';

const app = express();

app.disable('x-powered-by');

app.use(cors());
app.use(express.json());
app.use('/exercises', exercisesRouter);
app.use('/categories', categoriesRouter);
app.use('/muscles', musclesRouter);
app.use('/auth', authRouter);

app.get('/', async (req, res) => {
    res.status(200).json({message: "Welcome to the API gym"})
});

export default app;

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
    console.log(`Open life server run in the porto:${PORT}`)
});