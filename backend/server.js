import express from 'express';
import { auth } from './middleware/auth.js';
import { api } from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(auth);
app.use('/api', api);

// JSON parse errors → consistent error shape instead of HTML
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' },
    });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Kudos API (mock DB) listening on http://localhost:${PORT}`);
});
