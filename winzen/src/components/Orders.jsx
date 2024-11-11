import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, set, remove } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { FaUser, FaUserTie, FaClipboard, FaFire, FaSnowflake, FaSearch } from "react-icons/fa";
import { message, Modal, Card, Input } from 'antd'; 
import { SearchOutlined } from '@ant-design/icons';

const { Search } = Input; // Destructure the Search component

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
  const [filteredOrders, setFilteredOrders] = useState([]); // State for filtered orders
  const [cancellationStatus, setCancellationStatus] = useState(null);
  const [orderType, setOrderType] = useState('All');
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false); // Modal visibility state
  const [searchTerm, setSearchTerm] = useState(''); // State for search input

  useEffect(() => {
    const fetchOrders = async () => {
      const db = getDatabase();
      const ordersRef = ref(db, 'orders');
      try {
        const snapshot = await get(ordersRef);
        if (snapshot.exists()) {
          const fetchedOrders = snapshot.val();
          setOrders(fetchedOrders);
          setFilteredOrders(fetchedOrders); // Initialize filtered orders with all orders
        } else {
          console.log("No data available");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, []);

  const showCancelModal = (orderNumber) => {
    setCancelOrderId(orderNumber);
    setIsModalVisible(true); // Show the modal when cancel is triggered
  };

  const handleCancelModal = () => {
    setIsModalVisible(false); // Close the modal without canceling
    setCancelOrderId(null);
  };

  const confirmCancelOrder = async () => {
    if (!cancelOrderId) {
      message.error("No order selected for cancellation.");
      setCancellationStatus("No order selected for cancellation");
      return;
    }

    const db = getDatabase();
    const ordersRef = ref(db, `orders/${cancelOrderId}`);
    const canceledRef = ref(db, `canceled/${cancelOrderId}`);

    try {
      const orderSnapshot = await get(ordersRef);
      if (!orderSnapshot.exists()) {
        message.error("Order does not exist.");
        setCancellationStatus("Order does not exist");
        return;
      }

      const orderData = orderSnapshot.val();

      await set(canceledRef, orderData);
      await remove(ordersRef);

      message.success(`Order ${cancelOrderId} canceled successfully.`);
      setCancellationStatus("Order canceled successfully");
      console.log(`Order ${cancelOrderId} moved to canceled section successfully.`);
    } catch (error) {
      message.error(`Error canceling order: ${error.message}`);
      setCancellationStatus(`Error canceling order: ${error.message}`);
    }

    setCancelOrderId(null);
    setIsModalVisible(false); // Close the modal after confirming
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

  // Function to handle search based on Order ID
  const handleSearch = (value) => {
    setSearchTerm(value); // Update search term state
    if (!value) {
      setFilteredOrders(orders); // If search is cleared, show all orders
    } else {
      const filtered = Object.entries(orders).filter(([orderNumber]) =>
        orderNumber.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOrders(Object.fromEntries(filtered)); // Update filtered orders
    }
  };

  return (
    <div className="flex-grow items-center justify-center bg-white" style={{ scrollBehavior: 'smooth' }}>
      <div className="m-7">
        <h1 className="text-4xl md:text-6xl text-center font-bold text-black mt-2">Ongoing Orders</h1>
        <h3 className="text-lg md:text-base text-center mt-4 md:mt-8 font-semibold rounded-lg bg-main-green text-white">PLEASE MAKE SURE TO DOUBLE CHECK</h3>
        
        <div className="my-4">
        <Input
          className='rounded-lg shadow-lg p-2'
            prefix={<SearchOutlined className='mr-2'/>}
            placeholder="Search by Order ID"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: '100%'}}
          />
        </div>

        <div className="flex justify-start mb-4">
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

        {/* Orders Grid */}
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8 w-full overflow-hidden">
          {Object.entries(filteredOrders)
            .filter(([orderNumber, order]) => filterOrdersByType(order)) // Filter orders based on order type
            .map(([orderNumber, order]) => (
              <Card
                key={orderNumber}
                className="shadow-lg border border-gray-100 mb-4 mt-2 rounded-lg"
                title={<h3 className="text-lg md:text-2xl font-semibold text-center bg-main-honey text-white">Order Slip</h3>}
                bordered
              >
                <div className="flex justify-between mb-4">
                  <p className="text-sm md:text-sm font-medium border-b border-black pb-1 text-green-700">
                    Order# <span className="text-green-700 font-bold">{orderNumber}</span>
                  </p>
                  <p className="text-sm md:text-xs">{order.OrderDateTime}</p>
                </div>
                <div className="flex justify-between mb-4">
                  <div className="flex items-center">
                    <FaUser className="text-gray-600 mr-1" />
                    <p className="text-sm md:text-base font-bold text-amber-600 ">{order.CustomerName}</p>
                  </div>
                  <div className="flex items-center">
                    <FaUserTie className="text-gray-600 mr-1" />
                    <p className="text-sm md:text-base">{order.StaffName}</p>
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
                                  <FaClipboard className="text-main-honey mr-1" />
                                  <p className="text-sm md:text-sm font-bold">{order[key].ProductName}</p>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-t text-xs">
                              <td></td>
                              <td className="p-2 text-center">&#8369;{order[key].Price}</td>
                              <td className="p-2 text-center">{order[key].Quantity}</td>
                              <td className="p-2 text-center flex items-center justify-center">
                                {order[key].Variation === "Hot" ? (
                                  <FaFire className="mr-1 text-red-600" />
                                ) : order[key].Variation === "Iced" ? (
                                  <FaSnowflake className="mr-1 text-blue-500" />
                                ) : null}
                                {order[key].Variation}
                              </td>
                              <td className="p-2 text-center">{order[key].Size}</td>
                            </tr>
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => showCancelModal(orderNumber)} // Show modal when cancel button is clicked
                    className="text-sm md:text-sm bg-red-600 hover:bg-red-400 text-white font-bold py-1 px-3 rounded focus:outline-none"
                  >
                    Cancel Order
                  </button>
                </div>
              </Card>
            ))}
        </div>
      </div>

      {/* Ant Design Modal for cancel confirmation */}
      <Modal
        title="Confirm Order Cancellation"
        visible={isModalVisible}
        onOk={confirmCancelOrder} // Confirm cancellation
        onCancel={handleCancelModal} // Close modal without cancellation
        okText="Confirm"
        cancelText="Cancel"
        okButtonProps={{ danger: true }} // Style confirm button as dangerous
      >
        <p>Are you sure you want to cancel order #{cancelOrderId}?</p>
      </Modal>
    </div>
  );
};

export default Orders;