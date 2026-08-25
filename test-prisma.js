const { MySQLInstaller } = require('@reldens/cms/lib/mysql-installer');
const projectRoot = process.cwd();
const dbConfig = {
    client: 'mysql',
    config: {
        host: 'db',
        port: 3306,
        user: 'reldens_user',
        password: 'reldens_pass',
        database: 'reldens'
    }
};

(async () => {
    process.env.RELDENS_DB_URL = 'mysql://reldens_user:reldens_pass@db:3306/reldens';
    console.log('Generating Prisma Client...');
    try {
        let generatedClient = await MySQLInstaller.generateMinimalPrismaClient(dbConfig, projectRoot);
        console.log('Generated:', !!generatedClient);
        if(generatedClient) {
            console.log('Connecting...');
            await generatedClient.$connect();
            console.log('Connected!');
            await generatedClient.$disconnect();
        }
    } catch(e) {
        console.error('ERROR:', e);
    }
})();
