const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

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
    const featuresCollection = client.db("devspotDB").collection("features");
    const trendingCollection = client.db("devspotDB").collection("trending");
    const reviewsCollection = client.db("devspotDB").collection("reviews");

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
      const result = await trendingCollection.find().toArray();
      res.send(result);
    });

    // User Post his product data
    app.post("/api/v1/reviews", async (req, res) => {
      const body = req.body;
      const result = await reviewsCollection.insertOne(body);
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
