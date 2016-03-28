var mongoose        = require('mongoose');
var WorkflowHandler = require('./workflow');
var RESPONSES       = require('../constants/responses');

var Proforma = function (models) {
	'use strict';

	var async           = require('async');

	var ProformaSchema  = mongoose.Schemas.Proforma;
	var QuotationSchema = mongoose.Schemas.Quotation;
	var objectId = mongoose.Types.ObjectId;
	var workflowHandler = new WorkflowHandler(models);


	this.create = function (req, res, next) {
		var dbIndex   = req.session.lastDb;
		var id        = req.body.quotationId;
		var Proforma  = models.get(dbIndex, 'Proforma', ProformaSchema);
		var Quotation = models.get(dbIndex, 'Quotation', QuotationSchema);
		var request;
		var parallelTasks;
		var waterFallTasks;

		function fetchFirstWorkflow(callback) {
			request = {
				query  : {
					wId         : 'Sales Invoice',
				},
				session: req.session
			};
			workflowHandler.getFirstForConvert(request, callback);
		}

		function findQuotation(callback) {
			var query = Quotation.findById(id).lean();

			query
				.populate('products.product')
				.populate('products.jobs')
				.populate('project', '_id projectName projectmanager');

			query.exec(callback);

			/*Quotation.aggregate([
				{
					$match: {
						_id: objectId(id)
					}
				},
				{
					$unwind: '$products'
				},
				{
					$lookup: {
						from                   : 'Product',
						localField             : 'products.product',
						foreignField: "_id", as: 'products.product'
					}
				},
				{
					$lookup: {
						from                   : 'jobs',
						localField             : 'products.jobs',
						foreignField: "_id", as: 'products.jobs'
					}
				},
				{
					$lookup: {
						from                   : 'Project',
						localField             : 'project',
						foreignField: "_id", as: 'project'
					}
				},
				{
					$project: {
						'products.product': {$arrayElemAt: ['$products.product', 0]},
						'products.jobs': {$arrayElemAt: ['$products.jobs', 0]},
						project       : {$arrayElemAt: ['$project', 0]},
						'products.subTotal'   : 1,
						'products.unitPrice'  : 1,
						'products.taxes'      : 1,
						'products.description': 1,
						'products.quantity'   : 1,
						currency      : 1,
						forSales      : 1,
						type          : 1,
						isOrder       : 1,
						supplier      : 1,
						deliverTo     : 1,
						orderDate     : 1,
						expectedDate  : 1,
						name          : 1,
						destination   : 1,
						incoterm      : 1,
						invoiceControl: 1,
						invoiceRecived: 1,
						paymentTerm   : 1,
						paymentInfo   : 1,
						workflow      : 1,
						whoCanRW      : 1,
						groups        : 1,
						creationDate  : 1,
						createdBy     : 1,
						editedBy      : 1,
						_id           : 0
					}
				}
			], function(err, quotation) {
				callback(err, quotation[0]);
			});*/

		};

		function parallel(callback) {
			async.parallel(parallelTasks, callback);
		};

		function createProforma(parallelResponse, callback) {
			var quotation;
			var workflow;
			var err;
			var proforma;

			if (parallelResponse && parallelResponse.length) {
				quotation    = parallelResponse[0];
				workflow = parallelResponse[1];
			} else {
				err        = new Error(RESPONSES.BAD_REQUEST);
				err.status = 400;

				return callback(err);
			}

			delete quotation._id;

			proforma = new Proforma(quotation);


			if (req.session.uId) {
				proforma.createdBy.user = req.session.uId;
				proforma.editedBy.user  = req.session.uId;
			}

			proforma.sourceDocument      = id;
			proforma.paymentReference    = quotation.name;
			proforma.workflow            = workflow._id;
			proforma.paymentInfo.balance = quotation.paymentInfo.total;

			if (!proforma.project) {
				proforma.project = quotation.project ? order.quotation._id : null;
			}

			proforma.supplier = quotation.supplier;
			proforma.salesPerson = quotation.project.projectmanager ? quotation.project.projectmanager : null;

			proforma.save(callback);
		};

		parallelTasks  = [findQuotation, fetchFirstWorkflow];
		waterFallTasks = [parallel, createProforma];

		async.waterfall(waterFallTasks, function (err, result) {
			if (err) {
				return next(err)
			}

			res.status(201).send(result);

		});
	};
};

module.exports = Proforma;
