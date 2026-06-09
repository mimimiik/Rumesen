```javascript
const express = require('express');
const path = require('path');

const app = express();
// Render автоматически назначает порт через переменную окружения PORT
const PORT = process.env.PORT || 3000;

// Если у вас появятся статические файлы (картинки, стили), их можно будет положить в папку public
// app.use(express.static(path.join(__dirname, 'public')));

// Обрабатываем все GET-запросы и отдаем наш главный файл мессенджера
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'messenger.html'));
});

// Запускаем сервер
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

```

