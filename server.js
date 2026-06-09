```javascript
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Отдаем файлы из текущей директории
app.use(express.static(__dirname));

// Любой другой запрос перенаправляем на файл мессенджера
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'messenger.html'));
});

app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT);
});
