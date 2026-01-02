const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 정적 파일 제공 - docs 폴더
app.use(express.static(path.join(__dirname, 'docs')));

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

// 아비도스 계산기 페이지
app.get('/abidoscalculator', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'abidoscalculator', 'index.html'));
});

// 파견의뢰소 효율 비교 페이지
app.get('/dispatch', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'dispatch', 'index.html'));
});

// 404 처리
app.use((req, res) => {
  res.status(404).send('<h1>404 - 페이지를 찾을 수 없습니다</h1>');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
