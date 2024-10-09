import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { IoAnalytics } from "react-icons/io5";
import { Bar } from 'react-chartjs-2';
import { ref, get } from 'firebase/database';
import logo from '../assets/images/logo.png';
import Calendar from 'react-calendar'; 
import 'react-calendar/dist/Calendar.css'; 
import { db, app } from '../../firebaseConfig'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const months = ['Overall', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Overallsale = () => {
  const [chartData, setChartData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(months[0]);
  const [selectedWeek, setSelectedWeek] = useState('Overall');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [error, setError] = useState(null);
  const [calendarActive, setCalendarActive] = useState(false);
  const [totalSalesForWeek, setTotalSalesForWeek] = useState(0); 
  const [totalQuantitySold, setTotalQuantitySold] = useState(0); 
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(null);
  const [lastDayOfWeek, setLastDayOfWeek] = useState(null);
  const [totalWeeksInMonth, setTotalWeeksInMonth] = useState(0); 

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedWeek, selectedDate, calendarActive]);

  useEffect(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const weeksInMonth = calculateWeeksInMonth(year, month);
    setTotalWeeksInMonth(weeksInMonth);
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      const historyRef = ref(db, 'history');
      const snapshot = await get(historyRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        let filteredData = Object.values(data);
  
        if (!calendarActive) {
          if (selectedMonth !== 'Overall') {
            filteredData = filteredData.filter(item => {
              const orderDate = new Date(item.orderDateTime);
              return months[orderDate.getMonth() + 1] === selectedMonth;
            });
          }
          if (selectedWeek !== 'Overall') {
            const selectedYear = selectedDate.getFullYear();
            const monthIndex = months.indexOf(selectedMonth) - 1;
            const selectedWeekNumber = parseInt(selectedWeek) - 1;
            
            const firstDayOfMonth = new Date(selectedYear, monthIndex, 1);
            
            let firstDayOfWeek = new Date(firstDayOfMonth);
            firstDayOfWeek.setDate(firstDayOfMonth.getDate() + (selectedWeekNumber * 7)); 
            firstDayOfWeek.setHours(0, 0, 0, 0); 
            setFirstDayOfWeek(firstDayOfWeek)
            let lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
            lastDayOfWeek.setHours(23, 59, 59, 999);
            setLastDayOfWeek(lastDayOfWeek)
            if (lastDayOfWeek.getMonth() !== monthIndex) {
                lastDayOfWeek = new Date(selectedYear, monthIndex + 1, 0);
                setLastDayOfWeek(lastDayOfWeek)
            }

            console.log('Start date of week:', firstDayOfWeek);
            console.log('End date of week:', lastDayOfWeek);
        
            console.log("Filtered data before filtering:", filteredData);
        
            filteredData = filteredData.filter(item => {
                const orderDate = new Date(item.orderDateTime);
                const isInWeekRange = orderDate >= firstDayOfWeek && orderDate <= lastDayOfWeek;
                console.log("Order date:", orderDate.toDateString());
                console.log("Is in week range?", isInWeekRange);
                return isInWeekRange;
            });
        
            console.log("Filtered data after filtering:", filteredData);
        }
             
        } else {
          const selectedYear = selectedDate.getFullYear();
          const selectedMonth = selectedDate.getMonth();
          const selectedDay = selectedDate.getDate();
          filteredData = filteredData.filter(item => {
            const orderDate = new Date(item.orderDateTime);
            return (
              orderDate.getFullYear() === selectedYear &&
              orderDate.getMonth() === selectedMonth &&
              orderDate.getDate() === selectedDay
            );
          });          
        }
        
        console.log('Filtered data:', filteredData);
  
        const staffData = {};
  
        filteredData.forEach((item) => {
          const { staffName, orderItems, total, customerName, orderDateTime } = item;
          if (!staffData[staffName]) {
            staffData[staffName] = { totalSales: 0, totalQuantity: 0, totalCustomers: 0, customers: [] };
          }
          staffData[staffName].totalSales += parseFloat(total);
          Object.values(orderItems).forEach((order) => {
            staffData[staffName].totalQuantity += order.quantity;
          });
          if (customerName && !staffData[staffName].customers.includes(customerName)) {
            staffData[staffName].totalCustomers++;
            staffData[staffName].customers.push(customerName);
          }
        });
        const overallTotalSales = Object.values(staffData).reduce((acc, curr) => acc + curr.totalSales, 0);
        const overallTotalQuantity = Object.values(staffData).reduce((acc, curr) => acc + curr.totalQuantity, 0);
        const overallTotalCustomers = Object.values(staffData).reduce((acc, curr) => acc + curr.totalCustomers, 0);

        setTotalSalesForWeek(overallTotalSales);
        setTotalQuantitySold(overallTotalQuantity);
        setTotalCustomers(overallTotalCustomers);
  
        const labels = Object.keys(staffData);
        const dataset1Data = labels.map(date => staffData[date].totalSales);
        const dataset2Data = labels.map(date => staffData[date].totalQuantity);
        const dataset3Data = labels.map(date => staffData[date].totalCustomers);
  
        setChartData({
          labels: labels,
          datasets: [
            {
              label: 'Total Sales',
              data: dataset1Data,
              backgroundColor: 'rgba(255, 99, 132, 0.5)',
            },
            {
              label: 'Quantity Sold',
              data: dataset2Data,
              backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
            {
              label: 'Number of Customers',
              data: dataset3Data,
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
            },
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

  const calculateWeeksInMonth = (year, month) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayOfWeek = firstDayOfMonth.getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysLeftInFirstWeek = 7 - (firstDayOfWeek === 0 ? 7 : firstDayOfWeek); 
    const remainingDays = daysInMonth - daysLeftInFirstWeek; 
    const fullWeeks = Math.ceil(remainingDays / 7); 
    return fullWeeks + 1; 
};


  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setSelectedWeek('Overall');
    setCalendarActive(false); 
  };

  const handleWeekChange = (e) => {
    setSelectedWeek(e.target.value);
    setCalendarActive(false); 
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setCalendarActive(true); 
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Sales Overview' },
    },
  };

  return (
    <div className="flex-1 bg-white">
      <div className="p-7">
        <h1 className="text-6xl text-center mt-2 font-bold text-black">Sales Report</h1>
        <h3 className="text-lg md:text-base bg-main-green text-white mb-6 text-center mt-4 md:mt-8 font-semibold">
          ENJOY BROWSING
        </h3>
        <div className="flex justify-center mb-4 bg-main-green p-2 w-fit mx-auto rounded-lg">
          <label htmlFor="months" className="mr-2 mt-2 text-white font-bold">Select a month:</label>
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="p-2 border border-gray-100 shadow-md rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map((month, index) => (
              <option key={index} value={month}>{month}</option>
            ))}
          </select>
          {/* Add second dropdown for selecting week */}
          <select
            value={selectedWeek}
            onChange={handleWeekChange}
            className="ml-2 p-2 border border-gray-100 shadow-md rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Overall">Overall</option>
            {/* Dynamically generate week options */}
            {selectedMonth !== 'Overall' && [...Array(totalWeeksInMonth)].map((_, index) => (
              <option key={index} value={index + 1}>{`Week ${index + 1}`}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-center mb-4">
          <Calendar
            onChange={handleDateChange}
            value={selectedDate}
          />
        </div>
        {error ? (
          <p>Error: {error}</p>
        ) : (
          <div className="relative border border-gray-100 rounded-lg shadow-lg">
            <img src={logo} alt="Background" className="absolute inset-0 mx-auto my-auto w-40% h-40% object-cover" />
            <div className="relative bg-white bg-opacity-85 p-4 rounded-lg shadow">
              {chartData && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Total Sales</h2>

                  <h3 className="text-lg mb-2">Start Date: {firstDayOfWeek ? firstDayOfWeek.toString() : null}</h3>
                  <h3 className="text-lg mb-4">End Date: {lastDayOfWeek ? lastDayOfWeek.toString() : null}</h3>
                  <Bar options={options} data={{ ...chartData, datasets: [chartData.datasets[0]] }} />
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    {chartData.labels.map((label, index) => (
                      <div key={index} className="bg-light-green p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2 text-white">{label}</h3>
                        <p className='text-sm text-white'>Total Sales: &#8369;{chartData.datasets[0].data[index].toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="bg-red-200 p-4 rounded-lg shadow">
                      <p className="text-lg font-semibold">Total Sales for {selectedMonth} - {selectedWeek}</p>
                      <p className="text-sm">&#8369;{totalSalesForWeek.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
              {chartData && (
                <div className="mt-8">
                  <h2 className="text-2xl font-semibold mb-4">Quantity Sold and Number of Customers</h2>
                  <Bar options={options} data={{ ...chartData, datasets: [chartData.datasets[1], chartData.datasets[2]] }} />
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    {chartData.labels.map((label, index) => (
                      <div key={index} className="bg-light-green p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2 text-white">{label}</h3>
                        <p className='text-sm text-white'>Quantity Sold: {chartData.datasets[1].data[index]}</p>
                        <p className='text-sm text-white'>Number of Customers: {chartData.datasets[2].data[index]}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="bg-light-honey p-4 rounded-lg shadow">
                      <p className="text-lg font-thin">Total Quantity Sold for {selectedMonth} - {selectedWeek}</p>
                      <p className="text-sm font-black">{totalQuantitySold}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="bg-purple-200 p-4 rounded-lg shadow">
                      <p className="text-lg font-thin">Total Customers for {selectedMonth} - {selectedWeek}</p>
                      <p className="text-sm font-black">{totalCustomers}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Overallsale;