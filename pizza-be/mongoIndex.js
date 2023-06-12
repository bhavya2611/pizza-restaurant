const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const { MongoClient } = require("mongodb");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// MongoDB connection URL
const mongoURL = "mongodb://localhost:27017";
// MongoDB database name
const dbName = "pizza-restaurant";

// Timing values for each stage
const doughChefTime = 7; // in seconds
const toppingChefTime = 4; // in seconds
const ovenTime = 10; // in seconds
const waiterTime = 5; // in seconds

// Set up WebSocket connection
io.on("connection", (socket) => {
  console.log("A client connected.");

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("A client disconnected.");
  });
});

// Set up API endpoints
app.get("/orders", async (req, res) => {
  const client = await MongoClient.connect(mongoURL);
  const db = client.db(dbName);

  // Retrieve orders from the database
  const orders = await db.collection("orders").find().toArray();

  client.close();

  // Return the orders as a JSON response
  res.json(orders);
});

app.post("/orders", async (req, res) => {
  const client = await MongoClient.connect(mongoURL);
  const db = client.db(dbName);

  // Create a new order in the database
  const result = await db.collection("orders").insertOne({
    status: "Dough Chef",
    createdAt: new Date()
  });

  client.close();

  const orderId = result.insertedId;

  // Emit a new order event to all connected clients
  io.emit("newOrder", orderId, "Dough Chef");
  res.status(201).json({ orderId });
});

// Function to update order status based on the pizza pipeline
const updateOrderStatus = async () => {
  const client = await MongoClient.connect(mongoURL);
  const db = client.db(dbName);
  const orders = await db.collection("orders").find().toArray();

  for (const order of orders) {
    let newStatus = "";

    switch (order.status) {
      case "Dough Chef":
        newStatus = "Topping Chef";
        await delay(doughChefTime);
        break;
      case "Topping Chef":
        newStatus = "Oven";
        await delay(toppingChefTime);
        break;
      case "Oven":
        newStatus = "Serving";
        await delay(ovenTime);
        break;
      case "Serving":
        newStatus = "Done";
        await delay(waiterTime);
        break;
      default:
        break;
    }

    if (newStatus !== "") {
      await db
        .collection("orders")
        .updateOne({ _id: order._id }, { $set: { status: newStatus } });

      io.emit("orderUpdated", order._id, newStatus);
    }
  }

  client.close();
};

// Helper function to delay execution
const delay = (seconds) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

// Start the server
const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);

  // Start the interval for updating order statuses
  setInterval(updateOrderStatus, 1000);
});
