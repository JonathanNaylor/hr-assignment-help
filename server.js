'use strict';

const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

const app = createApp();

app.listen(port, host, () => {
  console.log(`HR Assignment Help blog running at http://localhost:${port}`);
});
