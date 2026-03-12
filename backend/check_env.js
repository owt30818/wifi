const dotenv = require('dotenv');
dotenv.config();

console.log('--- Environment Check ---');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
if (process.env.JWT_SECRET) {
    console.log('JWT_SECRET length:', process.env.JWT_SECRET.length);
}
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);

process.exit();
