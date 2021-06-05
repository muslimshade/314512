
const express = require('express');
const app = express();
//const bodyParser = require('body-parser');

app.use(express.json())
app.set("port", 3000)
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
})

const MongoClient = require("mongodb").MongoClient

let dp;

MongoClient.connect("mongodb+srv://uzair:saceblack123@@cluster0.lecbo.mongodb.net", (err, client) => {

    db = client.db('webstore')
})

app.get("/", (req, res, next) => {
    res.send("select a collection, e.g , /collection/messages")
})


app.param('collectionName', (req, res, next, collectionName) => {

    req.collection = db.collection(collectionName)

    // console.log('collection name:', req.collection)

    return next()

})


app.get('/collection/:collectionName', (req, res, next) => {

    req.collection.find({}).toArray((e, results) => {

        if (e) return next(e)

        res.send(results)

    })

})

//adding the post
app.post('/collection/:collectionName', (req, res, next) => {
    req.collection.insert(req.body, (e, results) => {
        if (e) return next(e)
        res.send(results.ops)
    })

})

// return with object id 
const ObjectId = require('mongodb').ObjectID;
app.get('/collection/:collectionName/:id', (req, res, next) => {

    req.collection.findOne({ _id: new ObjectId(req.params.id) }, (e, result) => {

        if (e) return next(e)

        res.send(result)

    })

})


app.put('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.update(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body },
        { safe: true, multi: false },
        (e, result) => {
            if (e) return next(e)
            res.send((result.result.n === 1) ? { msg: 'success' } : { msg: 'error' })
        })
})

// delete an object by ID 
app.delete('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.deleteOne(
        { _id: ObjectId(req.params.id) },
        (e, result) => {
            if (e) return next(e)
            res.send((result.result.n === 1) ? { msg: 'success' } : { msg: 'error' })
        })
})


const port = process.env.PORT || 3000
app.listen(port);