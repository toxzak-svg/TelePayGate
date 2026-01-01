const fs = require('fs');
const path = require('path');

const tcFile = path.resolve(__dirname, 'tmp', 'tc-db.json');
if (fs.existsSync(tcFile)) {
  const data = JSON.parse(fs.readFileSync(tcFile, 'utf8'));
  if (data.databaseUrl) {
    process.env.DATABASE_URL = data.databaseUrl;
  }
}
