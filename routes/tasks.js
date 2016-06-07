var express = require('express');
var router = express.Router();
var TasksHandler = require('../handlers/tasks');
var authStackMiddleware = require('../helpers/checkAuth');
var MODULES = require('../constants/modules');

module.exports = function (models, event) {
    'use strict';
    var moduleId = MODULES.TASKS;
    var handler = new TasksHandler(models, event);
    var accessStackMiddleware = require('../helpers/access')(moduleId, models);

    router.use(authStackMiddleware);
    router.use(accessStackMiddleware);

    router.post('/', handler.createTask);
    router.get('/priority', handler.getTasksPriority);
    router.get('/getLengthByWorkflows', handler.getLengthByWorkflows);

    router.get('/getFilterValues', handler.getFilterValues);

    router.get('/', handler.getTasks);

    router.patch('/:_id', handler.taskUpdateOnlySelectedFields);
    router.delete('/:_id', handler.removeTask);

    return router;
};