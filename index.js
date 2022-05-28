const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

//middlewere function to verify jwt to avoid unauthorized access
function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {

        if (error) {
            return res.status(403).send({ message: 'Forbidden access' })
        }

        req.decoded = decoded;
        next();
    });
}

async function run() {

    try {
        await client.connect();
        const instrumentCollection = client.db('music_store').collection('instruments');
        const reviewCollection = client.db('music_store').collection('reviews');
        const orderCollection = client.db('music_store').collection('orders');
        const userCollection = client.db('music_store').collection('users');

        //middlewere to verify if it is an admin
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.userType === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }

        }

        //add a payment intent
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const order = req.body;
            const price = order.orderPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });


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

        //add a new review
        app.post('/reviews', verifyJWT, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send({ success: true, result });
        })

        //get all users for admin
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);

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

        //delete an order
        app.delete('/order/:customerEmail', verifyJWT, async (req, res) => {
            const customerEmail = req.params.customerEmail;
            const filter = { customerEmail: customerEmail };
            const result = await orderCollection.deleteOne(filter);
            res.send(result);
        })

        //get a order info
        app.get('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query);
            res.send(order);
        })


        //get if the role of user
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.userType === 'admin';
            res.send({ admin: isAdmin })
        })

        //set admin role to user
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {

            const email = req.params.email;

            const filter = { email: email };
            const updateDoc = {
                $set: { userType: 'admin' },
            };

            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        //get all orders of a user
        app.get('/order', verifyJWT, async (req, res) => {
            const customerEmail = req.query.customerEmail;
            const decodedEmail = req.decoded.email;

            if (customerEmail === decodedEmail) {
                const query = { customerEmail: customerEmail };
                const orders = await orderCollection.find(query).toArray();
                res.send(orders);
            }
            else {
                return res.status(403).send({ message: 'forbidden access' });
            }

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