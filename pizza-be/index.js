const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const corsIO = require("./helper");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, corsIO);

// Enable Body Parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());

// Enable CORS
app.use(cors());

const orders = [];

const stageProps = {
  "Dough Chef": {
    processTime: 4,
    nextStage: "Topping Chef",
    workers: 2,
    queue: []
  },
  "Topping Chef": { processTime: 7, nextStage: "Oven", workers: 3, queue: [] },
  Oven: { processTime: 10, nextStage: "Serving", workers: 1, queue: [] },
  Serving: { processTime: 5, nextStage: "Done", workers: 2, queue: [] }
};

const queueProcessor = async ({
  status,
  processTime,
  currentQueue,
  nextQueue,
  nextStage,
  workers
}) => {
  const processingOrderList = [];
  while (true) {
    if (processingOrderList?.length < workers && currentQueue.length) {
      const pizza = currentQueue.pop();
      io.emit("orderUpdated", pizza.orderId, pizza.id, status);
      if (status === "Topping Chef" && pizza.topping) {
        const time = (pizza.topping / 2) * 4;
        if (time) {
          await new Promise((r) => setTimeout(r, time * 1000));
        }
      }
      processingOrderList.push(pizza);
      setTimeout(() => {
        processingOrderList.pop();
        if (nextQueue) {
          nextQueue.push(pizza);
        } else {
          io.emit("orderUpdated", pizza.id, nextStage);
        }
      }, processTime * 1000);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
};

const createProcessors = () => {
  for (const status in stageProps) {
    const { processTime, queue, workers, nextStage } = stageProps[status];
    queueProcessor({
      workers,
      status,
      processTime,
      currentQueue: queue,
      ...(status !== "Serving"
        ? { nextQueue: stageProps[nextStage].queue }
        : {}),
      nextStage
    });
  }
};

//
createProcessors();

// Set up WebSocket connection
io.on("connection", (socket) => {
  console.log("A client connected.");

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("A client disconnected.");
  });
});

// Set up API endpoints
app.get("/orders", (req, res) => {
  res.json(orders);
});

app.post("/orders", (req, res) => {
  const { pizzas } = req.body;

  const orderId = generateId();
  const pizzaDetails = pizzas.map((toppings) => ({
    id: generateId(),
    status: "Pending",
    toppings,
    orderId
  }));
  const order = { orderId, pizzas: pizzaDetails, createdAt: new Date() };
  orders.push(order);
  pizzaDetails.forEach((pizza) => {
    stageProps["Dough Chef"].queue.push(pizza);
  });
  res.status(201).json(order);
  //updateOrderStatus(order);
});

// Helper function to generate a random order ID
const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

// Start the server
const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
