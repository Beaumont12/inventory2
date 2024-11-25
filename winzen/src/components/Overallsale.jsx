import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Card, DatePicker, Select } from 'antd';
import { db } from '../../firebaseConfig'; // Assuming db is already initialized
import { ref, get } from 'firebase/database';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import dayjs from 'dayjs'; // Importing dayjs for date manipulation

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const months = [
  'Overall', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 
  'August', 'September', 'October', 'November', 'December'
];

const Overallsale = () => {
  const [chartData, setChartData] = useState(null); // Start with null
  const [selectedMonth, setSelectedMonth] = useState('Overall');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState('All'); // State for selected staff filter
  const [totalSalesForMonth, setTotalSalesForMonth] = useState(0);
  const [totalQuantitySold, setTotalQuantitySold] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [staffData, setStaffData] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedDate, selectedStaff]); // Add selectedStaff to dependency array

  const fetchData = async () => {
    try {
      const historyRef = ref(db, 'history');
      const snapshot = await get(historyRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        let filteredData = Object.values(data);

        // Log the selected date range for debugging
        console.log('Selected Date:', selectedDate);

        // Filter data based on selectedMonth and selectedDate
        if (selectedMonth !== 'Overall') {
          filteredData = filteredData.filter(item => {
            const orderDate = new Date(item.orderDateTime);
            return orderDate.getMonth() + 1 === months.indexOf(selectedMonth);
          });
        }

        if (selectedDate) {
          const [startDate, endDate] = selectedDate;
          const start = startDate.toDate();
          const end = endDate.toDate();
          console.log('Filtering by Date Range:', start, end);

          filteredData = filteredData.filter(item => {
            const orderDate = new Date(item.orderDateTime);
            return orderDate >= start && orderDate <= end;
          });
        }

        // Filter data based on selected staff
        if (selectedStaff !== 'All') {
          filteredData = filteredData.filter(item => item.staffName === selectedStaff);
        }

        // Log filtered data for debugging
        console.log('Filtered Data:', filteredData);

        let salesForMonth = 0;
        let quantitySold = 0;
        let customersCount = new Set(); // Using a Set to store unique customers
        let staffData = {};

        filteredData.forEach(item => {
          const { staffName, orderItems, total, customerName } = item;

          // Initialize staff data if not already present
          if (!staffData[staffName]) {
            staffData[staffName] = { totalSales: 0, totalQuantity: 0, totalCustomers: 0, customers: [] };
          }

          // Update staff's individual data
          staffData[staffName].totalSales += parseFloat(total);
          Object.values(orderItems).forEach(order => {
            staffData[staffName].totalQuantity += order.quantity;
          });
          if (customerName && !staffData[staffName].customers.includes(customerName)) {
            staffData[staffName].totalCustomers++;
            staffData[staffName].customers.push(customerName);
          }

          // Aggregating the total sales for the month, total quantity sold, and customers count
          salesForMonth += parseFloat(total);
          Object.values(orderItems).forEach(order => {
            quantitySold += order.quantity;
          });
          if (customerName) {
            customersCount.add(customerName); // Add unique customers to the set
          }
        });

        setStaffData(staffData);
        setTotalSalesForMonth(salesForMonth);
        setTotalQuantitySold(quantitySold);
        setTotalCustomers(customersCount.size); // Use the size of the Set for unique customers

        const labels = Object.keys(staffData);
        const dataset1Data = labels.map(staff => staffData[staff].totalSales);
        const dataset2Data = labels.map(staff => staffData[staff].totalQuantity);
        const dataset3Data = labels.map(staff => staffData[staff].totalCustomers);

        setChartData({
          labels: labels,
          datasets: [
            { label: 'Total Sales', data: dataset1Data, backgroundColor: 'rgba(255, 99, 132, 0.5)' },
            { label: 'Quantity Sold', data: dataset2Data, backgroundColor: 'rgba(53, 162, 235, 0.5)' },
            { label: 'Number of Customers', data: dataset3Data, backgroundColor: 'rgba(75, 192, 192, 0.5)' },
          ],
        });

        setError(null);
      } else {
        setError('No data available');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleMonthChange = (value) => {
    setSelectedMonth(value);
  };

  const handleDateChange = (dates) => {
    setSelectedDate(dates);
  };

  const handleStaffChange = (value) => {
    setSelectedStaff(value);
  };

  // Helper function to format numbers with commas
  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  // Fallback check before rendering chart
  if (!chartData) {
    return <div>Loading...</div>; // You can customize the loading indicator
  }

  return (
    <div className="flex-1 bg-white">
      <div className="p-7">
        <h1 className="text-6xl text-center mt-2 font-bold text-black">Sales Report</h1>
        <h3 className="text-lg md:text-base bg-main-green text-white mb-6 text-center mt-4 md:mt-8 font-semibold rounded-lg">
          ENJOY BROWSING
        </h3>

        <div className="flex justify-center mb-4 bg-main-green p-2 w-fit mx-auto rounded-lg shadow-lg">
          <label htmlFor="months" className="mr-2 mt-2 text-white font-bold">MONTH: </label>
          <Select
            value={selectedMonth}
            onChange={handleMonthChange}
            style={{ width: 120, marginRight: 2 }}
            options={months.map(month => ({ label: month, value: month }))}
          />

          <DatePicker.RangePicker
            format="YYYY-MM-DD"
            onChange={handleDateChange}
          />

          <label htmlFor="staff" className="mr-2 ml-2 mt-2 text-white font-bold">STAFF: </label>
          <Select
            value={selectedStaff}
            onChange={handleStaffChange}
            style={{ width: 120 }}
          >
            <Select.Option value="All">All</Select.Option>
            {Object.keys(staffData).map(staff => (
              <Select.Option key={staff} value={staff}>
                {staff}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap justify-between mt-6 gap-8">
          {error ? (
            <p>{error}</p>
          ) : (
            <>
              <div className="flex justify-between gap-4 w-full">
                <Card title="Total Sales" bordered={false} style={{ width: '30%', borderRadius:'8px', backgroundColor:'rgba(255, 99, 132, 0.5)' }} className='shadow-lg'>
                  <p>₱{formatNumber(totalSalesForMonth)}</p>
                </Card>
                <Card title="Quantity Sold" bordered={false} style={{ width: '30%', borderRadius:'8px', backgroundColor:'rgba(53, 162, 235, 0.5)' }} className='shadow-lg'>
                  <p>{formatNumber(totalQuantitySold)}</p>
                </Card>
                <Card title="Customers" bordered={false} style={{ width: '30%', borderRadius:'8px', backgroundColor:'rgba(75, 192, 192, 0.5)' }} className='shadow-lg'>
                  <p>{formatNumber(totalCustomers)}</p>
                </Card>
              </div>

              <div className="w-full mt-2 shadow-lg p-4 rounded-lg">
                <Bar data={chartData} style={{width: '100%'}} />
              </div>

              {/* Display cards for each staff member */}
              <div className="flex flex-wrap gap-4 w-full">
                {Object.keys(staffData).map(staffName => (
                  <Card
                    title={<span className="text-white">{staffName}</span>}  // Make title text white
                    bordered={false}
                    key={staffName}
                    style={{ width: '30%', backgroundColor: '#203B36' }}
                    className="rounded-lg shadow-lg text-white"
                  >
                    <div className="flex flex-col gap-2">
                      <p className="flex justify-between">
                        <span>Total Sales:</span>
                        <span>₱{formatNumber(staffData[staffName].totalSales)}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Quantity Sold:</span>
                        <span>{formatNumber(staffData[staffName].totalQuantity)}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Number of Customers:</span>
                        <span>{formatNumber(staffData[staffName].totalCustomers)}</span>
                      </p>
                    </div>
                  </Card>
                ))}
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overallsale;
