import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../../firebaseConfig';
import { FaSearch, FaClipboard, FaFire, FaSnowflake, FaUser, FaUserTie } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import moment from 'moment'; 
import { Table, Button, Modal, Card } from 'antd';  // Import Ant Design components

const History = () => {
  const [historyData, setHistoryData] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10
  });

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
            orderDate: new Date(data[key].orderDateTime).toDateString(),
            staffName: data[key].staffName,
            orderDateTime: data[key].orderDateTime,  // Include the actual timestamp
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
    if (selected) {
      setSelectedHistory(selected); // Set the selected history to state
    }
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

  const filteredHistoryData = historyData
    .filter(history => 
      (history.orderNumber.includes(searchQuery) || history.staffName.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedMonth === '' || new Date(history.orderDateTime).toLocaleString('default', { month: 'short' }) === selectedMonth)
    )
    .sort((a, b) => moment(b.orderDateTime).diff(moment(a.orderDateTime)));  // Sort by orderDateTime in descending order

  const totalQuantity = filteredHistoryData.reduce((total, history) => total + history.totalQuantity, 0);
  const totalAmount = filteredHistoryData.reduce((total, history) => total + parseFloat(history.total), 0);

  const prepareStaffSummary = () => {
    const staffSummary = {};
    let overallTotalQuantity = 0;
    let overallTotalAmount = 0;
  
    filteredHistoryData.forEach(history => {
      if (!staffSummary[history.staffName]) {
        staffSummary[history.staffName] = { totalQuantity: 0, totalOrders: 0, totalAmount: 0 };
      }
      staffSummary[history.staffName].totalQuantity += history.totalQuantity;
      staffSummary[history.staffName].totalOrders += 1;
      staffSummary[history.staffName].totalAmount += parseFloat(history.total);
  
      overallTotalQuantity += history.totalQuantity;
      overallTotalAmount += parseFloat(history.total);
    });
  
    const staffSummaryArray = Object.entries(staffSummary).map(([staffName, { totalQuantity, totalOrders, totalAmount }]) => ({
      staffName,
      totalQuantity,
      totalOrders,
      totalAmount
    }));
  
    staffSummaryArray.push({
      staffName: 'Total',
      totalQuantity: overallTotalQuantity,
      totalOrders: filteredHistoryData.length,
      totalAmount: overallTotalAmount
    });
  
    return staffSummaryArray;
  };  

  const handleExportToExcel = () => {
    const historySheet = XLSX.utils.json_to_sheet(filteredHistoryData);
    
    const staffSummaryData = prepareStaffSummary();
    const summarySheet = XLSX.utils.json_to_sheet(staffSummaryData);

    const wb = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(wb, historySheet, "TransactionHistory");
    XLSX.utils.book_append_sheet(wb, summarySheet, "StaffSummary");

    XLSX.writeFile(wb, `TransactionHistory_${moment().format('YYYYMMDD')}.xlsx`);
  };

  const months = [
    { value: '', label: 'OVERALL' },
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

  // Columns for Ant Design Table
  const columns = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text, record) => (
        <a onClick={() => handleHistoryClick(record.id)}>{text}</a>
      )
    },
    {
      title: 'Staff Name',
      dataIndex: 'staffName',
      key: 'staffName',
    },
    {
      title: 'Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
    },
    {
      title: 'Quantity',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (text) => {
        const number = Number(text);
        if (isNaN(number)) return '₱0.00'; // Fallback if the value is invalid
        return `₱${number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
  ];

  return (
    <div>
      <div className="p-7 bg-white">
        <h1 className="text-6xl text-center mt-2 font-bold">Transaction History</h1>
        <h3 className="text-lg md:text-base text-center md:mt-8 font-semibold bg-main-green text-white rounded-lg">PLEASE MAKE SURE TO DOUBLE CHECK</h3>
        <div className="mt-8">
          <div className="flex justify-between">
            <div className="relative w-full mr-2">
              <FaSearch className="absolute left-3 top-1/3 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search history by Order# and Staff name"
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="appearance-none block w-full bg-white text-gray-700 border shadow-md border-gray-200 rounded-lg py-3 px-10 leading-tight focus:outline-none focus:bg-white focus:border-honey"
              />
            </div>
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="appearance-none bg-main-green text-white text-center font-bold border border-gray-200 rounded-lg py-3 px-2 leading-tight focus:outline-none focus:bg-white focus:text-main-green focus:border-gray-500 mb-4"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center my-4 font-extrabold mt-2">
            <div className="w-1/3">
              <Card
                bordered={false}
                className="shadow-lg text-white bg-main-green rounded-lg"
                title={<span style={{ color: 'white' }}>Total Quantity</span>} 
              >
                <p className="text-xl">
                  {totalQuantity.toLocaleString()}
                </p>
              </Card>
            </div>

            <div className="w-1/3">
              <Card
                bordered={false}
                className="shadow-lg text-white bg-main-green rounded-lg"
                title={<span style={{ color: 'white' }}>Total Amount</span>} 
              >
                <p className="text-xl">
                  ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </Card>
            </div>

            <div className="w-1/5">
              <Card
                bordered={false}
                className="shadow-lg text-white bg-main-green rounded-lg"
                title={<span style={{ color: 'white' }}>Export</span>}
              >
                <Button
                  className="text-white bg-main-honey hover:bg-dark-honey rounded-lg font-bold"
                  onClick={handleExportToExcel}
                  style={{ width: '100%' }}
                >
                  Export to Excel
                </Button>
              </Card>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={filteredHistoryData}
            style={{
              borderColor: '#203B36', // main honey color for the border
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '8px',
              margin: 0,
          }}
            rowKey="id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            }}
            components={{
              header: {
              cell: ({ children, ...restProps }) => (
                  <th
                  {...restProps}
                  style={{
                      backgroundColor: '#203B36', // main honey color
                      color: '#ffffff',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      padding: '8px',
                      borderBottom: '1px solid #ffffff',
                  }}
                  >
                  {children}
                  </th>
              ),
              },
          }}
          />
        </div>

        {selectedHistory && (
        <Modal
          visible={!!selectedHistory}
          onCancel={closeModal}
          footer={null}
          width={800}
          title={
            <div className="text-center text-3xl font-bold text-main-green">
              Order Slip
            </div>
          }
        >
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
        </Modal>
      )}
      </div>
    </div>
  );
};

export default History;
