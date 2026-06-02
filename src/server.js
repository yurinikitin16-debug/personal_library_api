require('dotenv').config({ quiet: true });

const app = require('./app');

const port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log(`Personal library API is running on port ${port}`);
});
