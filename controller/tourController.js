const fs = require('fs');

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
);

exports.checkId = (req, res, next, val) => {
  console.log(val);

  if (val > tours.length) {
    /*
     * 반환문이 없으면 응답을 보내지만 함수 내의 코드 실행을 계속한다.
     * 그래서 응답을 보낸 후에도 다음 미들웨어로 넘어가 다른 응답을 보낸다.
     */
    return res.status(404).json({
      status: 'not found',
      message: 'invalid id',
    });
  }

  next();
};

exports.checkBody = (req, res, next) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({
      status: 'bad request',
      message: 'missing name or price',
    });
  }

  next();
};

exports.getAllTours = (req, res) => {
  res.status(200).json({
    status: 'ok',
    results: tours.length,
    data: {
      tours,
    },
  });
};

exports.getTour = (req, res) => {
  const id = req.params.id * 1;
  const tour = tours.find((tour) => tour.id === id);

  res.status(200).json({
    status: 'ok',
    data: {
      tour,
    },
  });
};

exports.createTour = (req, res) => {
  const id = tours[tours.length - 1];
  const tour = Object.assign({ id }, req.body);

  tours.push(tour);

  fs.writeFile(
    `${__dirname}/dev-data/data/tour-simple.json`,
    JSON.stringify(tours),
    (err) => {
      res.status(201).json({
        status: 'created',
        data: {
          tour,
        },
      });
    }
  );
};
exports.updateTour = (req, res) => {
  res.status(200).json({
    status: 'ok',
    data: {
      tour: 'update',
    },
  });
};

exports.deleteTour = (req, res) => {
  res.status(204).json({
    status: 'ok',
    data: null,
  });
};
