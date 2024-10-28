const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());
const { auth : authJwt } = require('express-oauth2-jwt-bearer');
const { v4 : uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { auth, requiresAuth } = require('express-openid-connect');


const externalUrl = process.env.RENDER_EXTERNAL_URL; 
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 4080;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
});

app.use(express.static('public'));

const config = {
  authRequired: false,
  idpLogout: true,
  secret: process.env.SESSION_SECRET, 
  baseURL: externalUrl || `https://localhost:${port}`,
  clientID: process.env.CLIENT_ID, 
  clientSecret: process.env.CLIENT_SECRET,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  authorizationParams: {
    response_type: 'code',
  },
};

app.use(auth(config));

app.get('/api/tickets/count', async (req, res) => {
  try {
      const { rowCount } = await pool.query('SELECT * FROM tickets');
      res.json({ count: rowCount });
  } catch (error) {
      console.error('Greška prilikom dohvata broja ulaznica:', error);
      res.status(500).json({ error: 'Greška prilikom dohvata broja ulaznica.' });
  }
});

const checkJwt = authJwt({
  audience: process.env.AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`
});


app.post('/api/generateTicket', checkJwt, async (req, res) => {

  const {vatin, firstName, lastName} = req.body;
  console.log(vatin, firstName, lastName);

  if (!vatin || !firstName || !lastName) {
            return res.status(400).json({
                error: 'All fields are required.'});
        }
    
  const vatinRegex = /^\d{11}$/; 
  const nameRegex = /^[A-Za-z]+$/; 

  if (!vatinRegex.test(vatin)) {
    return res.status(400).json({
      error: 'OIB must contain exactly 11 digits.'
    });
  }
  if (!nameRegex.test(firstName)) {
    return res.status(400).json({
      error: 'First name must contain only letters.'
    });
  }
  if (!nameRegex.test(lastName)) {
    return res.status(400).json({
      error: 'Last name must contain only letters.'
    });
  }

  try {
    const { rows: existingTickets } = await pool.query('SELECT COUNT(*) FROM tickets WHERE vatin = $1', [vatin]);
    
    if (parseInt(existingTickets[0].count) >= 3) {
      return res.status(400).json({
          error: 'Maximum 3 tickets allowed per OIB.'}); 
    }

    const ticketId = uuidv4();
    
    await pool.query('INSERT INTO tickets (ticketId, vatin, firstName, lastName) VALUES ($1, $2, $3, $4)', 
                [ticketId, vatin, firstName, lastName]);
    
    const ticketURL = `https://${req.get('host')}/api/tickets/${ticketId}`;
    const qrCode = await QRCode.toDataURL(ticketURL);

    //-------
    lastGeneratedTicket = {
      qrCode,
    };
    //------------
            
    res.json({ticketId, qrCode});

  } catch (err) {
    return res.status(500).send('Server error');
  }
    
});


app.get('/api/tickets/:ticketId', requiresAuth(), async (req, res) => {
  const { ticketId } = req.params;

  try {
    const { rows } = await pool.query('SELECT * FROM tickets WHERE ticketId = $1', [ticketId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const firstName = rows[0].firstname;
    const lastName = rows[0].lastname;
    const vatin = rows[0].vatin;
    const createdAt = rows[0].createdat;

    const userName = req.oidc.user.name; 
    const userEmail = req.oidc.user.email; 
    const userId = req.oidc.user.sub; 

    const ticketURL = `https://${req.get('host')}/api/tickets/${ticketId}`;
    const qrCode = await QRCode.toDataURL(ticketURL);

    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ticket Details</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f0f4f8;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .main-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 800px;
            margin: auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            width: 100%;
            align-items: center;
            margin-bottom: 20px;
          }
          .user-info {
            display: flex;
            align-items: center;
          }
          .user-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: #007BFF;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 20px;
            margin-right: 15px;
          }
          .user-details {
            font-size: 14px;
            color: #333;
          }
          .container {
            width: 100%;
            max-width: 700px;
            padding: 20px;
            background: white;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            text-align: center;
            margin-bottom: 20px;
          }
          h1 {
            color: #0056b3;
            margin-bottom: 10px;
          }
          p {
            line-height: 1.6;
          }
          .qr-code {
            margin-top: 20px;
          }
          .button-container {
            display: flex;
            gap: 10px;
          }
          .button-container button {
            padding: 10px;
            border: none;
            border-radius: 5px;
            background-color: #007BFF;
            color: white;
            cursor: pointer;
            font-size: 16px;
          }
          .button-container button:hover {
            background-color: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="main-container">
          <div class="header">
            <!-- Korisničke informacije -->
            <div class="user-info">
              <div class="user-avatar">${userName.charAt(0)}</div>
              <div class="user-details">
                <p><strong>Korisničko ime:</strong> ${userName}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p><strong>ID korisnika:</strong> ${userId}</p>
              </div>
            </div>
            
            <!-- Gumbi -->
            <div class="button-container">
              <button onclick="location.href='/'">Početna</button>
              <button onclick="location.href='/logout'">Odjavi se</button>
            </div>
          </div>
          
          <!-- Detalji ulaznice -->
          <div class="container">
            <h1>Detalji Ulaznice</h1>
            <p><strong>Ime:</strong> ${firstName}</p>
            <p><strong>Prezime:</strong> ${lastName}</p>
            <p><strong>OIB (VATIN):</strong> ${vatin}</p>
            <p><strong>Stvoreno:</strong> ${createdAt}</p>
            
            <!-- Prikaz QR koda -->
            <div class="qr-code">
              <img src="${qrCode}" alt="QR Kod" />
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });  }
});

//-----
let lastGeneratedTicket = null;
app.get('/api/lastGeneratedTicket', (req, res) => {
  if (!lastGeneratedTicket) {
    return res.status(404).json({ error: 'Nema generirane ulaznice' });
  }
  res.json(lastGeneratedTicket);
});
///----


app.get('/callback', async (req, res) => {
  const { access_token } = req.query; 

  if (access_token) {
    req.session.accessToken = access_token; 
    return res.redirect(req.session.returnTo || '/api/tickets/:ticketId'); 
  }

  return res.status(400).json({ error: 'Access token not received.' });
});


app.get('/api/auth-status', (req, res) => {
  if (req.oidc.isAuthenticated()) {
    res.json({
      isAuthenticated: true,
      user: {
        name: req.oidc.user.name,
        email: req.oidc.user.email,
        userId: req.oidc.user.sub
      }
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html'); 
});


app.get('/logout', (req, res) => {
  console.log("odjava");
  //--
  lastGeneratedTicket = null
  //----
  res.oidc.logout({
    returnTo: `${config.baseURL}` 
  });
});


if (externalUrl) { const hostname = '0.0.0.0'; //ne 127.0.0.1 
  app.listen(port, hostname, () => { 
    console.log(`Server locally running at http://${hostname}:${port}/ and from outside on ${externalUrl}`); 
  });
} else { 
  https.createServer({ 
    key: fs.readFileSync('server.key'), 
    cert: fs.readFileSync('server.cert') }, app) 
    .listen(port, function () { 
      console.log(`Server running at https://localhost:${port}/`);
   });
}