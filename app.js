const express = require('express');
const morgan = require('morgan');

/* 라우터 미들웨어를 가져온다. */
const tourRouter = require('./route/tourRoute');
const userRouter = require('./route/userRoute');

const app = express();

/*
 * 미들웨어는 요청이나 응답 객체를 조작할 수 있는 함수이다. 요청과 응답 사이의 중간에 위치하기에 미들웨어라고 부른다.
 * 미들웨어 스택은 애플리케이션에서 사용하는 모든 미들웨어이다.
 * 매우 중요한 점은 미들웨어 스택 내에서 미들웨어의 순서는 코드에서 미들웨어가 정의된 순서와 같다는 것이다.
 * 코드에서 처음으로 나타나는 미들웨어는 나중에 나타나는 미들웨어보다 먼저 실행된다.
 * 전체 과정은 생성된 요청/응답 객체가 각 미들웨어를 통해 통과되어 처리되며 각 미들웨어 함수의 끝에서 다음 함수가 호출된다.
 * 즉, next() 함수를 호출할 때 미들웨어 스택 내의 다음 미들웨어가 실행된다. 이 과정은 마지막 미들웨어에 도달할 때까지 반복된다.
 * 미들웨어 함수는 다음 함수를 호출하지 않으며 응답을 전송한다.
 *
 * 요청-응답 주기
 * 요청 -> 미들웨어 스택의 모든 미들웨어 -> 응답
 *
 * 미들웨어를 사용하기 위해 app.use() 함수를 사용한다.
 */

if (process.env.NODE_ENV === 'development') {
  /* morgan은 콘솔에서 요청 데이터를 볼 수 있게 해주는 미들웨어이다. */
  app.use(morgan('dev'));
}

/* express.json() 미들웨어는 본문의 데이터를 요청 객체에 추가한다. */
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  console.log('middleware!');

  next();
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();

  next();
});

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

module.exports = app;
