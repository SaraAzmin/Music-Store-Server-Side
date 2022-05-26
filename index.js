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

        //all instruments loaded
        app.get('/instruments', async (req, res) => {
            const query = {};
            const cursor = instrumentCollection.find(query);
            const instruments = await cursor.toArray();
            res.send(instruments);
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