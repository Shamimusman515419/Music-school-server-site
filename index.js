var express = require('express')
var cors = require('cors')
var app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
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
    const InstractorCollection = client.db("MusicSchool").collection("Instractor");
    const PaymentCollection = client.db("MusicSchool").collection("payment");
    // Send a ping to confirm a successful connection
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.send({ token })
    })

    //  user relates api 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await UsersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });

      }
      next();
    }

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await UsersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await UsersCollection.findOne(query);
      const result = { Instructor: user?.role === 'instructor' }

      res.send(result);
    })

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await UsersCollection.deleteOne(query);
      res.send(result);
    })
    app.patch('/users/admin/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await UsersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    app.patch('/users/instructor/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await UsersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })




    app.get('/users', verifyJWT, async (req, res) => {
      const result = await UsersCollection.find().toArray();
      res.send(result)
    })

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
    //  payment relate aip 


    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    app.get('/payment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await CardsCollection.findOne(query)
      res.send(result)
    })

    app.post('/payment', verifyJWT, async (req, res) => {
      const body = req.body;
      const result = await PaymentCollection.insertOne(body);
      res.send(result)
    })

    app.delete('/payment/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await CardsCollection.deleteOne(query);
      res.send(result);
    })



    app.get('/paymentHistory', verifyJWT, async (req, res) => {
      const query = { email: req.query.email };
      const result = await PaymentCollection.find(query).toArray()
      res.send(result)
    })

    // classes 

    app.get('/classes', async (req, res) => {
      const result = await ClassesCollection.find().toArray();
      res.send(result)
    })

    app.post('/classes', verifyJWT, async (req, res) => {
      const body = req.body;
      const result = await ClassesCollection.insertOne(body);
      res.send(result)
    })

    app.get('/classes/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };

      const result = await ClassesCollection.find(query).toArray();
      res.send(result)
    })


    app.patch('/classes/approved/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'approved'
        },
      };
      const result = await ClassesCollection.updateOne(filter, updateDoc);
      res.send(result);

    })
    app.patch('/classes/denied/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'denied'
        },
      };
      const result = await ClassesCollection.updateOne(filter, updateDoc);
      res.send(result);

    })


    // instractor 
    app.get('/instractor', async (req, res) => {
      const result = await InstractorCollection.find().toArray();
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