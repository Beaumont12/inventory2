import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db, app } from '../../firebaseConfig'
import { MdOutlineHistory } from "react-icons/md";
import { FaSearch, FaUser, FaUserTie, FaFire, FaSnowflake, FaClipboard } from 'react-icons/fa';

const History = () => {
  const [historyData, setHistoryData] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const historyRef = ref(db, 'history');
        const snapshot = await get(historyRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const historyArray = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
            totalQuantity: Object.values(data[key].orderItems).reduce((acc, item) => acc + item.quantity, 0),
            orderDate: new Date(data[key].orderDateTime).toDateString()
          }));
          setHistoryData(historyArray);
        } else {
          setHistoryData([]);
        }
      } catch (error) {
        console.error('Error fetching history data:', error);
      }
    };
    fetchData();
  }, []);

  const handleHistoryClick = (id) => {
    const selected = historyData.find((item) => item.id === id);
    setSelectedHistory(selected);
  };

  const closeModal = () => {
    setSelectedHistory(null);
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  // Filter history based on search query and month
  const filteredHistoryData = historyData.filter(history => 
    (history.orderNumber.includes(searchQuery) || history.staffName.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (selectedMonth === '' || new Date(history.orderDateTime).toLocaleString('default', { month: 'short' }) === selectedMonth)
  );

  // Calculate total quantity and amount for the filtered data (based on the selected month)
  const totalQuantity = filteredHistoryData.reduce((total, history) => total + history.totalQuantity, 0);
  const totalAmount = filteredHistoryData.reduce((total, history) => total + parseFloat(history.total), 0);

  const months = [
    { value: '', label: 'All Months' },
    { value: 'Jan', label: 'January' },
    { value: 'Feb', label: 'February' },
    { value: 'Mar', label: 'March' },
    { value: 'Apr', label: 'April' },
    { value: 'May', label: 'May' },
    { value: 'Jun', label: 'June' },
    { value: 'Jul', label: 'July' },
    { value: 'Aug', label: 'August' },
    { value: 'Sep', label: 'September' },
    { value: 'Oct', label: 'October' },
    { value: 'Nov', label: 'November' },
    { value: 'Dec', label: 'December' },
  ];
  
  return (
    <div>
      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white p-8 rounded-lg z-50 flex justify-center items-center w-1/3 h-auto">
            <div className="mt-2 items-center justify-center flex w-full">
              <div
                key={selectedHistory.id}
                className="rounded-lg shadow-lg bg-white border border-gray-100 p-4 mb-4 relative w-full"
                style={{ maxHeight: "80vh", overflowY: "auto", paddingTop: "3rem" }}
              >
                <button
                  className="absolute top-2 right-2 text-white items-center mb-3 hover:text-gray-700 bg-red-600 px-2 rounded-lg"
                  onClick={closeModal}
                >
                  Close
                </button>
                <h3 className="text-lg md:text-2xl font-semibold mb-4 text-center bg-main-honey text-white">
                  Order Slip
                </h3>
                <div className="flex justify-between mb-4">
                  <p className="text-sm md:text-sm font-medium border-b border-black pb-1 text-green-700">
                    Order# <span className="text-green-700 font-bold">{selectedHistory.orderNumber}</span>
                  </p>
                  <p className="text-sm md:text-xs">{selectedHistory.orderDateTime}</p>
                </div>
                <div className="flex justify-between mb-4">
                  <div className="flex items-center">
                    <FaUser className="text-gray-600 mr-1" />
                    <p className="text-sm md:text-base font-bold text-amber-600">
                      {selectedHistory.customerName}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <FaUserTie className="text-gray-600 mr-1" />
                    <p className="text-sm md:text-base">{selectedHistory.staffName}</p>
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
                      {Object.keys(selectedHistory.orderItems).map((key) => (
                        <React.Fragment key={key}>
                          <tr className="border-t">
                            <td className="p-2 text-left font-bold text-xs" colSpan="5">
                              <div className="flex items-center">
                                <FaClipboard className="text-main-honey mr-1" />
                                <p className="text-sm md:text-sm font-bold">{selectedHistory.orderItems[key].productName}</p>
                              </div>
                            </td>
                          </tr>
                          <tr className="border-t text-xs">
                            <td></td>
                            <td className="p-2 text-center">
                              &#8369;{selectedHistory.orderItems[key].price}
                            </td>
                            <td className="p-2 text-center">{selectedHistory.orderItems[key].quantity}</td>
                            <td className="p-2 text-center flex items-center justify-center">
                              {selectedHistory.orderItems[key].variation === "Hot" ? (
                                <FaFire className="mr-1 text-red-600" />
                              ) : selectedHistory.orderItems[key].variation === "Iced" ? (
                                <FaSnowflake className="mr-1 text-blue-500" />
                              ) : null}
                              {selectedHistory.orderItems[key].variation}
                            </td>
                            <td className="p-2 text-center">{selectedHistory.orderItems[key].size}</td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <hr className="my-4" />
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm md:text-sm font-bold">Subtotal:</p>
                  <p className="text-sm md:text-sm font-bold">
                    &#8369;{selectedHistory.subtotal}
                  </p>
                </div>
                <div className="flex justify-between items-center border-t border-gray-300 pt-1 pb-1">
                  <p className="text-sm md:text-sm font-semibold text-right">Discount:</p>
                  <p className="text-sm md:text-sm font-semibold">
                    &#8369;{selectedHistory.discount}
                  </p>
                </div>
                <div className="flex justify-between items-center border-t border-gray-300 pt-4">
                  <p className="text-sm md:text-sm font-bold">Total:</p>
                  <p className="text-sm md:text-sm font-bold">
                    &#8369;{selectedHistory.total}
                  </p>
                </div>
                <hr className="my-4" />
                <div>
                  <p className="text-sm md:text-base text-center bg-yellow-500 text-white font-semibold">
                    {selectedHistory.preference}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-7 bg-white">
        <h1 className="text-6xl text-center mt-2 font-bold">Transaction History</h1>
        <h3 className="text-lg md:text-base text-center mt-4 md:mt-8 font-semibold bg-main-green text-white">PLEASE MAKE SURE TO DOUBLE CHECK</h3>
        <div className="mt-8">
          <div className="flex justify-between">
            <div className="relative mb-4 w-full mr-2 ">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search products by name"
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="appearance-none block w-full bg-white text-gray-700 border shadow-md border-gray-200 rounded-lg py-3 px-10 leading-tight focus:outline-none focus:bg-white focus:border-honey"
              />
            </div>
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="appearance-none bg-main-honey text-light-green font-semibold border border-gray-200 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 mb-4"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
            <div className="bg-main-green rounded-lg p-4 shadow-lg mt-4">
              <h2 className="text-xl font-semibold mb-2 text-white">Total Transactions</h2>
              <p className='text-white'>Total Quantity: {totalQuantity}</p>
              <p className='text-white'>Total Amount: &#8369;{totalAmount.toFixed(2)}</p>
            </div>
          <div className="flex justify-between items-center p-4 my-4 bg-main-honey text-white rounded-lg shadow-md font-extrabold mt-4">
            <span className="text-lg w-1/5 text-center">Order #</span>
            <span className="text-lg w-1/5 text-center">Staff Name</span>
            <span className="text-lg w-1/5 text-center">Date</span>
            <span className="text-lg w-1/5 text-center">Quantity</span>
            <span className="text-lg w-1/5 text-center">Total</span>
          </div>
          <ul>
          {filteredHistoryData.slice().reverse().map((history) => (
              <li key={history.id} className="cursor-pointer" onClick={() => handleHistoryClick(history.id)}>
                <div className="flex justify-between items-center p-4 my-2 bg-white rounded-lg shadow-md">
                  <span className="text-lg font-semibold w-1/5 text-center text-gray-600">{history.orderNumber}</span>
                  <span className="text-lg w-1/5 text-center font-semibold text-gray-600">{history.staffName}</span>
                  <span className="text-lg w-1/5 text-center font-semibold text-gray-600">{history.orderDate}</span>
                  <span className="text-lg w-1/5 text-center font-semibold text-gray-600">{history.totalQuantity}</span>
                  <span className="text-lg w-1/5 text-center font-semibold text-gray-600">&#8369;{history.total}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default History;