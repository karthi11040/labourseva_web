const bcrypt = require('bcryptjs');

const hash = '$2y$10$rCpVrsDFmK2vTkAiS2DE4Od3X2A/wtvZiGlZMl9I6wo/9r3QdAty6';
const normalized = hash.replace(/^\$2y\$/, '$2a$');
console.log('compare Karthi@2004:', bcrypt.compareSync('Karthi@2004', normalized));

const hash2 = '$2y$10$UZ5kgFnhYl00yygi.J0m8uaQDbH9xSLSoXEMxcgrnvj2hpdNM6RS2';
const normalized2 = hash2.replace(/^\$2y\$/, '$2a$');
console.log('compare distributor123:', bcrypt.compareSync('distributor123', normalized2));
