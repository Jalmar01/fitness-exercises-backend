import express  from 'express';
import cors from 'cors';
import exercisesRouter from './routes/exerceses.js';

const app = express();

app.disable('x-powered-by');

app.use(cors());
app.use(express.json());
app.use('/exercises', exercisesRouter);

app.get('/', async (req, res) => {
    res.status(200).json({message: "Welcome to the API gym"})
});

export default app;

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
    console.log(`Open life server run in the porto:${PORT}`)
});