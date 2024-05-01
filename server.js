const dotenv = require('dotenv');

dotenv.config({
  path: './config.env',
});

/* 환경변수를 설정해야 애플리케이션에서 읽을 수 있다. */
const app = require('./app');

const port = process.env.NODE_ENV || 3000;
app.listen(port, () => {});
