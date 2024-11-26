import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { rateLimit } from 'express-rate-limit'


const app = express()

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const allowedOrigins = [
  'https://serverfocuesd--profileselectiontool.netlify.app',
  'https://master--frabjous-sopapillas-35b199.netlify.app',
  'http://localhost:3000',
  'http://localhost:8000',
 'https://www.upwork.com',
'https://vibhutidigital.com',
	'https://tools.vibhutidigital.com'
];

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 500, // Limit each IP to 500 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	// store: ... , // Redis, Memcached, etc. See below.
  message: "Too many requests from this IP, please try again after 15 minutes."
})

// Apply the rate limiter to all requests
app.use(limiter);


app.use(cors( {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow credentials (cookies) to be included
} ));

app.use(express.json({limit: "50kb"}))
app.use(express.urlencoded({extended: true, limit: "50kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// Load Swagger JSON with fs and JSON.parse
const swaggerDocument = JSON.parse(fs.readFileSync(__dirname + '/swagger.json', 'utf-8'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


//routes import
import profileRouter from './routes/profile.routes.js';
import specializedProfileRouter from './routes/specializedProfile.routes.js';
import cookiesRouter from './routes/cookies.routes.js';
import userRouter from './routes/user.routes.js';
import jobRouter from './routes/job.routes.js';
import instructionsRouter from './routes/instructions.routes.js';
import skillsRouter from './routes/skills.routes.js';
import expertiseRouter from './routes/expertise.routes.js';
import profileSpecializationRouter from './routes/profileSpecialization.routes.js';
import pinnedProfileRouter from './routes/pinnedprofile.routes.js';
import validateEmail from './routes/validateEmail.routes.js';

//import { recommendProfile } from "./utils/recomendation.js";


// Example input data for recommendation (e.g., jobSuccessScore, totalHours, totalJobs, rating)
//const inputData = [95, 800, 15, 4.9];

// Make a recommendation
/*recommendProfile(inputData).then(profile => {
  console.log("Recommended Profile:", profile);
});*/


//routes declaration
app.use("/api/v1/profiles", profileRouter)
app.use("/api/v1/specializedProfiles", specializedProfileRouter)
app.use("/api/v1/cookies", cookiesRouter)
app.use("/api/v1/user", userRouter)
app.use("/api/v1/job", jobRouter)
app.use("/api/v1/instructions", instructionsRouter)
app.use("/api/v1/skills", skillsRouter)
app.use("/api/v1/expertise", expertiseRouter)
app.use("/api/v1/profileSpecialization", profileSpecializationRouter)
app.use("/api/v1/pinnedProfile", pinnedProfileRouter)
app.use("/api/v1/validate-email", validateEmail);

// http://localhost:8000/api/v1/users/register

export { app }