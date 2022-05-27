const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//midddlewere
//app.use(cors());
const corsConfig = {
    origin: true,
    credentials: true,
};
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ssomg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {
        await client.connect();
        const instrumentCollection = client.db('music_store').collection('instruments');
        const reviewCollection = client.db('music_store').collection('reviews');
        const orderCollection = client.db('music_store').collection('orders');
        const userCollection = client.db('music_store').collection('users');

        //all instruments loaded
        app.get('/instruments', async (req, res) => {
            const query = {};
            const cursor = instrumentCollection.find(query);
            const instruments = await cursor.toArray();
            res.send(instruments);
        })

        //get an instrument info
        app.get('/instruments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const instrument = await instrumentCollection.findOne(query);
            res.send(instrument);
        })


        //all reviews loaded
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        //add user
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })

        //add a new order
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send({ success: true, result });
        })

        //get all orders of a user
        app.get('/order', async (req, res) => {
            const customerEmail = req.query.customerEmail;
            //const decodedEmail = req.decoded.email;

            const query = { customerEmail: customerEmail };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);

            // if (customerEmail === decodedEmail) {
            //     const query = { customerEmail: customerEmail };
            //     const orders = await orderCollection.find(query).toArray();
            //     res.send(orders);
            // }
            // else {
            //     return res.send({ message: 'forbidden access' });
            // }

        })


    }

    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from Music Store!')
})

app.listen(port, () => {
    console.log(`Music store listening on port ${port}`)
})