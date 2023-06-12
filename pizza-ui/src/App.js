import React, { useEffect, useState } from "react";
import { Select } from "antd";
import io from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:3000"); // Connect to the backend WebSocket

const toppingOptions = [];
for (let i = 1; i < 10; i++) {
  toppingOptions.push({
    value: "T" + i,
    label: "T" + i
  });
}

const pizzaOptions = [];
for (let i = 1; i < 10; i++) {
  pizzaOptions.push({
    value: "P" + i,
    label: "P" + i
  });
}

function App() {
  const [orders, setOrders] = useState(new Map());
  const [newOrder, setNewOrder] = useState([0]);

  const handleToppingsChange = (index, value) => {
    newOrder[index] = value.length;
    setNewOrder([...newOrder]);
  };

  const addNewPizza = () => {
    newOrder.push(1);
    setNewOrder([...newOrder]);
  };

  const removeNewPizza = (index) => {
    newOrder.splice(index, 1);
    setNewOrder([...newOrder]);
  };

  useEffect(() => {
    // Fetch orders on component mount
    fetchOrders();

    // Listen for order updates from the backend
    socket.on("orderUpdated", (orderId, status) => {
      updateOrderStatus(orderId, status);
    });

    // Clean up on component unmount
    // return () => {
    //   socket.disconnect();
    // };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrders = async () => {
    const response = await fetch("http://localhost:3000/orders");
    const data = await response.json();
    const newOrders = new Map();
    data.forEach((obj) => {
      newOrders.set(obj.orderId, obj);
    });
    setOrders(newOrders);
  };

  const createOrder = async () => {
    const nonZeroOrder = newOrder.filter((i) => i !== 0);
    if (nonZeroOrder.length) {
      const response = await fetch("http://localhost:3000/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pizzas: nonZeroOrder
        })
      });
      const data = await response.json();
      const { orderId } = data;
      debugger;
      orders.set(orderId, data);
      setOrders(new Map(orders));
      setNewOrder([1]);
    }
  };

  const updateOrderStatus = (orderId, pizzaId, status) => {
    if (orders.has(orderId)) {
      const order = orders.get(orderId);
      if (order?.pizza) {
        order.pizzas.map((pizza) =>
          pizza.id === pizzaId ? { ...pizza, status } : pizza
        );
      }
      orders.set(orderId, order);
      setOrders(new Map(orders));
    }
  };

  console.log(Array.from(orders.values()));

  if (orders.size) {
    return (
      <div className='layout'>
        <h1>Pizza Restaurant Management System</h1>
        <div className='orderDiv'>
          <div style={{ width: "100%" }}>
            {newOrder.map((item, index) => (
              <div className='inputDiv'>
                <Select
                  size='large'
                  placeholder='Please select a pizza'
                  onChange={handleToppingsChange}
                  defaultValue={[pizzaOptions[0]]}
                  style={{
                    width: "100%",
                    marginRight: "20px"
                  }}
                  options={pizzaOptions}
                />
                <Select
                  mode='multiple'
                  size='large'
                  placeholder='Please select toppings'
                  onChange={(val) => handleToppingsChange(index, val)}
                  style={{
                    width: "100%"
                  }}
                  defaultValue={[toppingOptions[0]]}
                  options={toppingOptions}
                />
                {index === 0 && (
                  <button onClick={addNewPizza} className='iconBtn'>
                    +
                  </button>
                )}
                {index > 0 && (
                  <button
                    onClick={() => removeNewPizza(index)}
                    className='iconBtn red'
                  >
                    -
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className='btn' onClick={createOrder}>
            Create Order
          </button>
        </div>

        <div className='content'>
          {orders &&
            Array.from(orders.keys()).map((key, index) => {
              const pizzas = orders.get(key).pizzas;
              const orderStatus =
                pizzas.filter((pizza) => pizza.status !== "PENDING").length > 0
                  ? "PENDING"
                  : "DONE";
              return (
                <>
                  <div>
                    <div className='orderHeading'>
                      <h3>
                        Order {index} - {key} - Status -{" "}
                        <span className={`${orderStatus.toLowerCase()}`}>
                          {orderStatus}
                        </span>
                      </h3>
                    </div>
                    {pizzas?.map((pizza, index) => (
                      <div className='pizzaHeading'>
                        <h5>
                          Pizza {index + 1} - Status -{" "}
                          <span
                            className={`${pizza.status
                              .replace(" ", "")
                              .toLowerCase()}`}
                          >
                            {pizza.status.toUpperCase()}
                          </span>
                        </h5>
                      </div>
                    ))}
                  </div>
                  <hr />
                </>
              );
            })}
        </div>
      </div>
    );
  }
}

export default App;
