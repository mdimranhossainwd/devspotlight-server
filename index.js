const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    // Get Features Data
    app.get("/api/v1/features", async (req, res) => {
      const result = await featuresCollection.find().toArray();
      res.send(result);
    });

    // Get Trending Data
    app.get("/api/v1/trending", async (req, res) => {
      const result = await trendingCollection.find().toArray();
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
