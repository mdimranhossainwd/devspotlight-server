const express = require("express");
const app = express();
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.DEVSPOTLIGHT_STRIPE_SK);
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Verify token
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send({ status: "unauthorized access" });
  if (token) {
    jwt.verify(token, process.env.DEVSPOTLIGHT_TOKEN_KEY, (err, decoded) => {
      if (err) {
        returnres.status(401).send({ status: "unauthorized access" });
      }
      console.log(decoded);
      req.user = decoded;
      next();
    });
  }
};

const uri = `mongodb+srv://${process.env.DEVSPOTLIGHT_USER_NAME}:${process.env.DEVSPOTLIGHT_PASSWORD}@cluster0.2xcsswz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const usersCollection = client.db("devspotDB").collection("users");
    const featuresCollection = client.db("devspotDB").collection("features");
    const trendingCollection = client.db("devspotDB").collection("trending");
    const reportCollection = client.db("devspotDB").collection("report");
    const reviewsCollection = client.db("devspotDB").collection("reviews");
    const paymentsCollection = client.db("devspotDB").collection("payments");
    const addProductCollection = client
      .db("devspotDB")
      .collection("addproduct");

    // JWT Generated
    app.post("/api/v1/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.DEVSPOTLIGHT_TOKEN_KEY, {
        expiresIn: "14d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          samesite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.get("/api/v1/logout", async (req, res) => {
      res
        .cookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          samesite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    // Payment post method
    app.post("/api/v1/create-payment-intent", async (req, res) => {
      const price = 10;
      const amount = price * 100;
      console.log(amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // Payment user's data posted
    app.post("/api/v1/payment", async (req, res) => {
      const body = req.body;
      const result = await paymentsCollection.insertOne(body);
      res.send(result);
    });

    // Payment data geted
    app.get("/api/v1/payment", async (req, res) => {
      const cursor = await paymentsCollection.find().toArray();
      res.send(cursor);
    });

    // Get user's Payment Data
    app.get("/api/v1/payment", async (req, res) => {
      const cursor = await paymentsCollection.find().toArray();
      res.send(cursor);
    });

    // User Info Posted on DB
    app.post("/api/v1/users", async (req, res) => {
      const body = req.body;
      const result = await usersCollection.insertOne(body);
      res.send(result);
    });

    // Get all User's email
    app.get("/api/v1/users", async (req, res) => {
      const cursor = await usersCollection.find().toArray();
      res.send(cursor);
    });

    // Get user's with email finding
    app.get("/api/v1/users/:email", async (req, res) => {
      const email = req.params.email;
      const cursor = await usersCollection.findOne({ email });
      res.send(cursor);
    });

    // Update user's status
    app.patch("/api/v1/users/:id", async (req, res) => {
      const id = req.params.id;
      const role = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: role,
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Delete a Users
    app.delete("/api/v1/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Report Data Post
    app.post("/api/v1/report", async (req, res) => {
      const body = req.body;
      const result = await reportCollection.insertOne(body);
      res.send(result);
    });

    // Moderator Get Reported Data
    app.get("/api/v1/report", async (req, res) => {
      const cursor = await reportCollection.find().toArray();
      res.send(cursor);
    });

    // Moderator Deleted Reported Data
    app.delete("/api/v1/report/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await reportCollection.deleteOne(query);
      res.send(result);
    });

    // Get Features Data
    app.get("/api/v1/features", async (req, res) => {
      const sort = req.query.sort;
      let options = {};
      if (sort === "asc") {
        options = { timestamp: 1 }; // Ascending order
      } else if (sort === "desc") {
        options = { timestamp: -1 }; // Descending order
      }
      const result = await featuresCollection.find({}).sort(options).toArray();
      res.send(result);
    });

    // User post Product
    app.post("/api/v1/add-products", async (req, res) => {
      const body = req.body;
      const result = await addProductCollection.insertOne(body);
      res.send(result);
    });

    // Get Features Specefic Data
    app.get("/api/v1/:type/:id", async (req, res) => {
      const { type, id } = req.params;
      try {
        let collection;
        if (type === "features") {
          collection = featuresCollection;
        } else if (type === "trending") {
          collection = trendingCollection;
        } else {
          return res.status(400).json({ message: "Invalid type" });
        }
        const product = await collection.findOne({ _id: new ObjectId(id) });
        res.send(product);
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    // Get Trending Data
    app.get("/api/v1/trending", async (req, res) => {
      const sort = req.query.sort;
      let options = {};
      if (sort === "asc") {
        options = { product_totalcount: 1 }; // Ascending order
      } else if (sort === "desc") {
        options = { product_totalcount: -1 }; // Descending order
      }
      const result = await trendingCollection.find({}).sort(options).toArray();
      res.send(result);
    });

    // User Post his product data
    app.post("/api/v1/reviews", async (req, res) => {
      const body = req.body;
      const result = await reviewsCollection.insertOne(body);
      res.send(result);
    });

    // Get Add product data specefic user's
    app.get("/api/v1/add-products", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await addProductCollection.find(query).toArray();
      res.send(result);
    });

    // Post a product data with featuresCollections
    app.post("/api/v1/review-products/:id", async (req, res) => {
      const body = req.body;
      const result = await featuresCollection.insertOne(body);
      res.send(result);
    });

    // Get all Product
    app.get("/api/v1/review-products", async (req, res) => {
      const cursor = await addProductCollection.find().toArray();
      res.send(cursor);
    });

    // Get all Acceptable Product
    app.get("/api/v1/accepted-products", async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page) - 1;
      const sort = req.query.sort;
      const search = req.query.search;
      const query = {
        status: "Accepted",
        tags: { $regex: search, $options: "i" },
      };
      let options = {};
      if (sort) options = { sort: { timestamp: sort === "asc" ? 1 : -1 } };
      const cursor = await addProductCollection
        .find(query, options)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(cursor);
    });

    // Get Count Data
    app.get("/api/v1/products-count", async (req, res) => {
      const search = req.query.search;
      const query = {
        status: "Accepted",
        tags: { $regex: search, $options: "i" },
        // This should match the search filter
      };
      const count = await addProductCollection.countDocuments(query);
      res.send({ count });
    });

    // Get specefic Product data
    app.get("api/v1/review-products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addProductCollection.findOne(query);
      res.send(result);
    });

    // Update a Product data with
    app.put("/api/v1/add-products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const addProductData = req.body;
      const updateDoc = {
        $set: {
          ...addProductData,
        },
      };
      const result = await addProductCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Update a product status
    app.patch("/api/v1/review-products/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: status,
      };
      const result = await addProductCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Delete a Product
    app.delete("/api/v1/add-products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addProductCollection.deleteOne(query);
      res.send(result);
    });

    // Get user review data
    app.get("/api/v1/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("devSpotlight server is Running ---->");
});

app.listen(port, () => {
  console.log(`devSpotlight server Currently Running on: ----> ${port}`);
});

// give me generated to server code here
