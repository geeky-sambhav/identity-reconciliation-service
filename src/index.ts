import express, { type Request, type Response } from 'express';
import { identifyContact } from './services/contactService';
import { IdentifyRequest } from './types';

const app = express();
const port = process.env.PORT ;

app.use(express.json());




app.post('/identify', async (req: Request, res: Response): Promise<any> => {
  const { email, phoneNumber } = req.body as IdentifyRequest;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'Either email or phoneNumber must be provided.' });
  }

  try {
    const responsePayload = await identifyContact({ email, phoneNumber });
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('An error occurred in /identify endpoint:', error);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
