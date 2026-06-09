const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Обслуживаем статические файлы из текущей директории
app.use(express.static(__dirname));

// Обрабатываем все входящие запросы
app.get('*', (req, res) => {
    // Проверяем, какой файл существует в папке проекта, и отдаем его
    const indexPath = path.join(__dirname, 'index.html');
    const messengerPath = path.join(__dirname, 'messenger.html');
    const publicIndexPath = path.join(__dirname, 'public', 'index.html');
    const publicMessengerPath = path.join(__dirname, 'public', 'messenger.html');

    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else if (fs.existsSync(messengerPath)) {
        res.sendFile(messengerPath);
    } else if (fs.existsSync(publicIndexPath)) {
        res.sendFile(publicIndexPath);
    } else if (fs.existsSync(publicMessengerPath)) {
        res.sendFile(publicMessengerPath);
    } else {
        res.status(404).send('Ошибка: Главный HTML-файл мессенджера не найден в проекте.');
    }
});

app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT);
});
