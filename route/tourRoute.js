const express = require('express');

const tourController = require('../controller/tourController');

const router = express.Router();

/* 매개변수 미들웨어는 특정 매개변수에 대해서만 실행되는 미들웨어이다. 즉, URL에 특정 매개변수를 가지고 있을 때 실행된다. */
router.param('id', tourController.checkId);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(tourController.checkBody, tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(tourController.deleteTour);

module.exports = router;
