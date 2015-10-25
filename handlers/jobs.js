/**
 * Created by liliya on 22.10.15.
 */
var mongoose = require('mongoose');
var async = require('async');

var Jobs = function (models) {
    var JobsSchema = mongoose.Schemas['jobs'];
    var wTrackSchema = mongoose.Schemas['wTrack'];
    var access = require("../Modules/additions/access.js")(models);
    var objectId = mongoose.Types.ObjectId;


this.getData = function (req, res, next) {
    var JobsModel = models.get(req.session.lastDb, 'jobs', JobsSchema );
    var queryObj = {};

    var query = req.query;


    if (query.project) {
        queryObj.project = objectId(query.project);
    }

    JobsModel.find(query).exec(function(err, result){
        if (err){
            return next(err);
        }

        res.status(200).send(result)
    })

    };

    this.getForDD = function(req, res, next){
        var pId = req.body.projectId;
        var query = models.get(req.session.lastDb, 'jobs', JobsSchema );

        query.select('_id name ');
        query.where({'type': "Empty", 'project': objectId(pId)});
        query.sort({'name': 1});
        query.exec(function (err, jobs) {
            if (err) {
              return  next(err);
            }
                res.status(200).send({data: jobs});

        });
    },

    this.update = function(req, res, next){
        var JobsModel = models.get(req.session.lastDb, 'jobs', JobsSchema );
        var wTrack = models.get(req.session.lastDb, 'wTrack', wTrackSchema );

        var data = req.body;
        var id = data._id;
        var query;
        var updatewTracks = false;

        if(data.workflowId){
            query = {workflow: {_id: data.workflowId, name: data.workflowName}};
        } else if (data.name){
            query = {name: data.name};
            updatewTracks = true;
        }

        delete data._id;

        JobsModel.findByIdAndUpdate( id, query, {new: true}, function(err, result){
            if (err){
                return next(err);
            }

            var jobId = result.get('_id');
            var jobName = result.get('name');

            if(updatewTracks){
                wTrack.update({"jobs._id": jobId}, {$set: {"jobs.name":jobName }}, {multi: true}, function(err, result){
                    if (err){
                        return next(err);
                    }

                    console.log('updated wTracks');
                })
            }

            res.status(200).send(result)
        })
    }

};

module.exports = Jobs;
