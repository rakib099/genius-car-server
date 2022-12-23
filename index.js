const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middle wares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.i9w8jvi.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// verify JWT function
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({message: 'unauthorized access'});
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
        if (err) {
            return res.status(403).send({message: 'forbidden access'});
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const serviceCollection = client.db("geniusCar").collection("services");
        const orderCollection = client.db("geniusCar").collection("orders");

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'});
            res.send({token});
        });

        // Read
        app.get('/services', async (req, res) => {
            // query or filter field by operators
            // const query = {price: {$gt: 100, $lt: 300}};
            // const query = {price: {$eq: 200}};
            // const query = {price: {$lte: 200}};
            // const query = {price: {$ne: 150}};
            // const query = {price: {$in: [20, 40, 150]}};
            // const query = {price: {$nin: [20, 40, 150]}};
            // const query = {$and: [{price: {$gt: 20}}, {price: {$gt: 100}}]};
            const search = req.query.search;
            let query = {};
            if (search.length) {
                query = {
                    $text: {
                        $search: search
                    }
                }
            }
            console.log(search);
            const order = req.query.order === 'asc' ? 1 : -1;
            const cursor = serviceCollection.find(query).sort({price: order});
            const services = await cursor.toArray();
            res.send(services);
        });

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const service = await serviceCollection.findOne(query);
            res.send(service);
        });

        // orders api
        app.get('/orders', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            // console.log('inside orders api', decoded);
            if (decoded.email !== req.query.email) {
                return res.status(403).send({message: "forbidden access"});
            }

            let query = {};
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        app.post('/orders', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            console.log(result);
            res.send(result);
        });

        app.patch('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
                $set: {
                    status: status
                }
            }
            const result = await orderCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        app.delete('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await orderCollection.deleteOne(query);
            console.log(result);
            res.send(result);
        });
    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Genius Car Server is Running");
});

app.listen(port, () => {
    console.log(`Genius Car Server Running on port ${port}`);
});