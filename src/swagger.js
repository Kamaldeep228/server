import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'My API',
    description: 'Description'
  },
  host: process.env.SWAGGER_HOST

};

const outputFile = './swaggerU.json';
const routes = ['./routes/profile.routes.js', './routes/specializedProfile.routes.js', './routes/cookies.routes.js', './routes/user.routes.js', './routes/job.routes.js', './routes/instructions.routes.js', './routes/skills.routes.js', './routes/expertise.routes.js'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen()(outputFile, routes, doc);