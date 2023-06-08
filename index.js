var express = require('express')
var cors = require('cors')
var app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.VITE_USER}:${process.env.VITE_PASS}@cluster0.jt15atw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    await client.connect();

    const ClassesCollection = client.db("MusicSchool").collection("classes");
    const UsersCollection = client.db("MusicSchool").collection("users");
    const CardsCollection = client.db("MusicSchool").collection("cards");
    // Send a ping to confirm a successful connection
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.send({ token })
    })

    //  user relates api 


    app.post('/users', async (req, res) => {
      const body = req.body;
      const query = { email: body.email }
      const existingUser = await UsersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await UsersCollection.insertOne(body);
      res.send(result)
    })

    // cards related aip 
    app.post('/cards', verifyJWT, async (req, res) => {
      const body = req.body;
      const result = await CardsCollection.insertOne(body);
      res.send(result)
    })

    app.get('/cards', verifyJWT, async (req, res) => {
      const query = { email: req.query.email }
      const result = await CardsCollection.find(query).toArray();
      res.send(result)
    })
    app.delete('/cards/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }

      const result = await CardsCollection.deleteOne(query)
      res.send(result)
    })

    // classes 
    app.get('/classes', verifyJWT, async (req, res) => {
      const result = await ClassesCollection.find().toArray();
      // console.log(result);
      res.send(result)

    })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})