const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();

const port = process.env.PORT || 5000

const app = express();

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.ngcynwn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJwt = (req, res, next) => {
    console.log("jwt")
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: ('unauthorized access') });
    }
    const token = authorization.split(' ')[1];
    console.log(token)
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(403).send({ error: true, message: "unauthorized access" })
        };
        req.decoded = decoded;
        next()
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const servicesCollection = client.db("carsDoctor").collection('services');
        const checkOutCollection = client.db("carsDoctor").collection('checkOut');

        // jwt

        app.post('/jwt', (req, res) => {
            const user = req.body;
            // console.log(user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            console.log(token)
            res.send({ token })
        })


        // services

        app.get('/services', async (req, res) => {
            const serviceData = servicesCollection.find();
            const result = await serviceData.toArray();
            res.send(result)
        });

        app.get("/services/:id", async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const query = { _id: new ObjectId(id) };
            const options = {
                // Include only the `title` and `imdb` fields in each returned document
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            };

            const result = await servicesCollection.findOne(query, options);
            res.send(result)
        })

        // checkOut

        app.get('/checkOuts', verifyJwt, async (req, res) => {
            req.decoded = decoded;
            console.log(req.headers.authorization)
            if (decoded.email !== req.query.email) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            let query = {};
            if (req.query?.email) {
                query = { customerEmail: req.query.email }
                // console.log(query.email)
            }
            const result = await checkOutCollection.find(query).toArray();
            res.send(result)
        })

        app.post('/checkOuts', async (req, res) => {
            const checkOut = req.body;
            console.log(checkOut)
            const result = await checkOutCollection.insertOne(checkOut)
            res.send(result)
        })

        app.patch('/checkOuts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updating = req.body;
            // console.log(updating)
            const updateDoc = {
                $set: {
                    status: updating.status
                }
            };
            const result = await checkOutCollection.updateOne(query, updateDoc);
            res.send(result)
        })

        app.delete('/checkOuts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await checkOutCollection.deleteOne(query);
            res.send(result)
        })





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('server is running')
});

app.listen(port);