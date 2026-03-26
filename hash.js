const bcrypt = require('bcrypt');
console.log('BCRYPT_HASH=' + bcrypt.hashSync('password123', 10));
