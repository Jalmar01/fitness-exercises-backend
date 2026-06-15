import pool from './config/db.js'
import express  from 'express';
import cors from 'cors';
import exercisesRouter from './routes/exerceses.js';

const app = express();

app.disable('x-powered-by');

app.use(cors());
app.use(express.json());
app.use('/exercises', exercisesRouter);

const PORT = process.env.PORT ?? 3000;

app.get('/', async (req, res) => {
    try {
        //const [rows] = await pool.query('SELECT NOW() as data');
        res.status(200).json({message: "Welcome to the API gym", /*database_time: rows[0].data*/})
    } catch (error) {
        //console.error("⚠️ ERROR REAL DE MYSQL:", error); 
        
        res.status(500).json({ error: "Database connection failed"})
    }
    
});



app.listen( PORT, () => {
    console.log(`Open life server run in the porto:${PORT}`)
});