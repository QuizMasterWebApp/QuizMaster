const path = require('path');

console.log('Проверка конфигурации Jest...');
console.log('Текущая директория:', process.cwd());
console.log('Путь к jest.config.js:', path.join(process.cwd(), 'jest.config.js'));
console.log('Путь к babel.config.js:', path.join(process.cwd(), 'babel.config.js'));
console.log('Путь к setupTests.js:', path.join(process.cwd(), 'src/setupTests.js'));