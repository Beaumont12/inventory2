import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, update, set, remove } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { BiShoppingBag } from "react-icons/bi";
import { FaUser, FaUserTie, FaClipboard, FaFire, FaSnowflake } from "react-icons/fa";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB8xVDaDEehGAqTAKtmqdD97pkBSIQJHyI",
    authDomain: "wenzinpossystem.firebaseapp.com",
    databaseURL: "https://wenzinpossystem-default-rtdb.firebaseio.com",
    projectId: "wenzinpossystem",
    storageBucket: "wenzinpossystem.appspot.com",
    messagingSenderId: "910317765447",
    appId: "1:910317765447:web:16a7a67c68b7216d0d4262"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [cancellationStatus, setCancellationStatus] = useState(null);
  const [orderType, setOrderType] = useState('All');
  const [cancelOrderId, setCancelOrderId] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      const db = getDatabase();
      const ordersRef = ref(db, 'orders');
      try {
        const snapshot = await get(ordersRef);
        if (snapshot.exists()) {
          setOrders(snapshot.val()); // Set orders object directly
        } else {
          console.log("No data available");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, []);

  const cancelOrder = async (orderNumber) => {
    setCancelOrderId(orderNumber);
  };

  const confirmCancelOrder = async () => {
    if (!cancelOrderId) {
      console.error("No order selected for cancellation.");
      setCancellationStatus("No order selected for cancellation");
      return;
    }
  
    const db = getDatabase();
    const ordersRef = ref(db, `orders/${cancelOrderId}`);
    const canceledRef = ref(db, `canceled/${cancelOrderId}`);
  
    try {
      const orderSnapshot = await get(ordersRef);
      if (!orderSnapshot.exists()) {
        console.error("Order does not exist.");
        setCancellationStatus("Order does not exist");
        return;
      }
  
      const orderData = orderSnapshot.val();
  
      await set(canceledRef, orderData);
  
      await remove(ordersRef);  
  
      setCancellationStatus("Order canceled successfully");
      console.log(`Order ${cancelOrderId} moved to canceled section successfully.`);
    } catch (error) {
      console.error(`Error canceling order ${cancelOrderId}:`, error);
      setCancellationStatus(`Error canceling order: ${error.message}`);
    }
  
    setCancelOrderId(null);
  };
  
  const filterOrdersByType = (order) => {
    if (orderType === 'All') {
      return true; 
    } else if (orderType === 'Dine In') {
      return order.Preference === 'Dine In';
    } else if (orderType === 'Take Out') {
      return order.Preference === 'Take Out'; 
    }
  };  

  return (  
    <div className="flex-grow items-center justify-center bg-white" style={{ scrollBehavior: 'smooth'}}>
      <div className="p-7">
        <h1 className="text-4xl md:text-6xl text-center font-bold text-black mt-2">Ongoing Orders</h1>
        <h3 className="text-lg md:text-base text-center mt-4 md:mt-8 font-semibold bg-main-green text-white">PLEASE MAKE SURE TO DOUBLE CHECK</h3>
        <div className="flex justify-start mb-4 mt-5">
          {/* Toggle buttons for filtering orders */}
          <button
            className={`text-white px-4 py-2 rounded-md mr-4 hover:bg-light-honey hover:text-main-green ${orderType === 'All' ? 'bg-darker-honey' : 'bg-light-green'}`}
            onClick={() => setOrderType('All')}
          >
            All
          </button>
          <button
            className={`text-white px-4 py-2 rounded-md mr-4 hover:bg-light-honey hover:text-main-green ${orderType === 'Dine In' ? 'bg-darker-honey' : 'bg-light-green'}`}
            onClick={() => setOrderType('Dine In')}
          >
            Dine In
          </button>
          <button
            className={`text-white px-4 py-2 rounded-md hover:bg-light-honey hover:text-main-green ${orderType === 'Take Out' ? 'bg-darker-honey' : 'bg-light-green'}`}
            onClick={() => setOrderType('Take Out')}
          >
            Take Out
          </button>
        </div>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8 w-full overflow-hidden">
          {Object.entries(orders)
            .filter(([orderNumber, order]) => filterOrdersByType(order)) // Filter orders based on order type
            .map(([orderNumber, order]) => (
              <div key={orderNumber} className="rounded-lg shadow-lg bg-gray-100 border border-gray-100 p-4 mb-4 mt-2"> {/* Add custom class for order slip background */}
                <h3 className="text-lg md:text-2xl font-semibold mb-4 text-center bg-main-honey text-white">Order Slip</h3>
                <div className="flex justify-between mb-4">
                  <p className="text-sm md:text-sm font-meduim border-b border-black pb-1 text-green-700">
                    Order# <span className="text-green-700 font-bold">{orderNumber}</span>
                  </p> 
                  <p className='text-sm md:text-xs'>{order.OrderDateTime}</p>
                </div>
                <div className="flex justify-between mb-4">
                  <div className="flex items-center">
                    <FaUser className="text-gray-600 mr-1" />
                    <p className="text-sm md:text-base font-bold text-amber-600 "> {order.CustomerName}</p>
                  </div>
                  <div className="flex items-center">
                    <FaUserTie className="text-gray-600 mr-1" />
                    <p className="text-sm md:text-base"> {order.StaffName}</p>
                  </div>
                </div>
                <hr className="my-2" />
                <div className="mt-4 item-center overflow-hidden">
                  <table className="min-w-full border border-gray-300 rounded-xl shadow-sm">
                    <thead>
                      <tr className="bg-light-green text-white text-xs">
                        <th className="p-2 text-left"></th>
                        <th className="p-2 text-center">Price</th>
                        <th className="p-2 text-center">Quantity</th>
                        <th className="p-2 text-center">Variation</th>
                        <th className="p-2 text-center">Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(order)
                        .filter(key => key.startsWith("Order_"))
                        .map(key => (
                          <React.Fragment key={key}>
                            <tr className="border-t">
                              <td className="p-2 text-left font-bold text-xs" colSpan="5">
                                <div className="flex items-center">
                                  <FaClipboard className="text-main-honey mr-1" /> {/* Icon for the order number */}
                                  <p className="text-sm md:text-sm font-bold">{order[key].ProductName}</p> {/* Display order number here */}
                                </div>
                              </td>
                            </tr>
                            <tr className="border-t text-xs">
                              <td></td>
                              <td className="p-2 text-center">&#8369;{order[key].Price}</td>
                              <td className="p-2 text-center">{order[key].Quantity}</td>
                              <td className="p-2 text-center flex items-center justify-center">
                                {order[key].Variation === "Hot" ? (
                                  <FaFire className="mr-1 text-red-600" /> // Fire icon for Hot
                                ) : order[key].Variation === "Iced" ? (
                                  <FaSnowflake className="mr-1 text-blue-500" /> // Snowflake icon for Iced
                                ) : null}
                                {order[key].Variation} {/* Display variation text */}
                              </td>
                              <td className="p-2 text-center">{order[key].Size}</td>
                            </tr>
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                </div>
                <hr className="my-4" />
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm md:text-sm font-bold">Subtotal: </p>
                  <p className="text-sm md:text-sm font-bold">&#8369;{order.Subtotal}</p>
                </div>
                <div className="flex justify-between items-center border-t border-gray-300 pt-1 pb-1">
                  <p className="text-sm md:text-sm font-semibold text-right">Discount: </p>
                  <p className="text-sm md:text-sm font-semibold">&#8369;{order.Discount}</p>
                </div>
                <div className="flex justify-between items-center border-t border-gray-300 pt-4">
                  <p className="text-sm md:text-sm font-bold">Total:</p>
                  <p className="text-sm md:text-sm font-bold">&#8369;{order.Total}</p>
                </div>

                <hr className="my-4" />
                <div>
                  <p className="text-sm md:text-base text-center bg-yellow-500 text-white font-semibold">{order.Preference}</p>
                </div>
                <div className="flex justify-center">
                  <button className="text-white hover:bg-red-500 bg-red-700 font-bold py-2 px-4 rounded-md mt-6" onClick={() => cancelOrder(orderNumber)}>Cancel Order</button>
                </div>
              </div>
            ))}
        </div>
        {cancellationStatus && <p className="text-center text-sm text-green-600 mt-4">{cancellationStatus}</p>}
      </div>

      {/* Confirmation dialog for canceling order */}
      {cancelOrderId && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <div className="relative bg-white rounded-lg overflow-hidden max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Confirm Cancel Order</h2>
                <p className="text-gray-700">Are you sure you want to cancel this order?</p>
                <div className="mt-4 flex justify-end">
                  <button onClick={() => setCancelOrderId(null)} className="mr-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">
                    Cancel
                  </button>
                  <button onClick={confirmCancelOrder} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;