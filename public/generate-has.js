const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Hash para admin123:', hash);
}

generateHash();