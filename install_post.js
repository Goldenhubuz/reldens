const http = require('http');

const data = new URLSearchParams({
  'app-host': 'http://localhost',
  'app-port': '8080',
  'app-public-url': 'http://localhost:8080',
  'app-admin-path': '/reldens-admin',
  'app-admin-secret': 'mysecret123',
  'app-admin-hot-plug': '1',
  'app-allow-packages-installation': '1',
  'db-storage-driver': 'prisma',
  'db-client': 'mysql2',
  'db-host': 'db',
  'db-port': '3306',
  'db-name': 'reldens',
  'db-username': 'reldens_user',
  'db-password': 'reldens_password',
  'db-basic-config': '1',
  'db-sample-data': '1'
}).toString();

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/install',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${responseData}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
