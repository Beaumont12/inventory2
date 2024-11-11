import React, { useEffect, useState } from 'react';
import { getDatabase, ref, get } from 'firebase/database';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyB8xVDaDEehGAqTAKtmqdD97pkBSIQJHyI",
  authDomain: "wenzinpossystem.firebaseapp.com",
  databaseURL: "https://wenzinpossystem-default-rtdb.firebaseio.com",
  projectId: "wenzinpossystem",
  storageBucket: "wenzinpossystem.appspot.com",
  messagingSenderId: "910317765447",
  appId: "1:910317765447:web:16a7a67c68b7216d0d4262"
};

const app = initializeApp(firebaseConfig);

ChartJS.register(ArcElement, Tooltip, Legend);

const Card = ({ icon, bgColor, title, value }) => {
  const backgroundClasses = {
    blue: 'bg-emerald-900',
    purple: 'bg-teal-900',
    yellow: 'bg-cyan-900',
    red: 'bg-sky-900',
  };

  return (
    <div className={`p-4 rounded-lg shadow-md text-center w-64 h-64 flex flex-col justify-center items-center ${backgroundClasses[bgColor]}`}>
      <div className="rounded-full w-20 h-20 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h2 className="text-lg text-white font-semibold mb-2">{title}</h2>
      <p className="text-3xl text-white font-bold">{value}</p>
    </div>
  );
};

const Home = () => {
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalStaff, setTotalStaff] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminRole, setAdminRole] = useState('');
  const [cancelledCount, setCancelledCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [returningCustomers, setReturningCustomers] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [orders, setOrders] = useState({});
  const [selectedMonth, setSelectedMonth] = useState('');

  const months = [
    { value: '', label: 'Overall' },
    { value: 'Jan', label: 'Jan' },
    { value: 'Feb', label: 'Feb' },
    { value: 'Mar', label: 'Mar' },
    { value: 'Apr', label: 'Apr' },
    { value: 'May', label: 'May' },
    { value: 'Jun', label: 'Jun' },
    { value: 'Jul', label: 'Jul' },
    { value: 'Aug', label: 'Aug' },
    { value: 'Sep', label: 'Sep' },
    { value: 'Oct', label: 'Oct' },
    { value: 'Nov', label: 'Nov' },
    { value: 'Dec', label: 'Dec' },
  ];

  useEffect(() => {
    // Fetch orders data from Firebase
    const fetchOrders = async () => {
      const db = getDatabase();
      const ordersRef = ref(db, 'orders');
      try {
        const ordersSnapshot = await get(ordersRef);
        if (ordersSnapshot.exists()) {
          setOrders(ordersSnapshot.val());
        } else {
          console.log('No orders found');
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    // Fetch admin data from local storage
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      const userData = JSON.parse(storedUserData);
      setAdminName(userData.name);
      setAdminEmail(userData.email);
      setAdminUsername(userData.staffId);
      setAdminRole(userData.role);
    }
  }, []); 

  useEffect(() => {
    const fetchData = async () => {
      const db = getDatabase();
      const currentMonth = new Date().toLocaleString('default', { month: 'short' });
      
      // Fetch total products
      const productsRef = ref(db, 'products');
      const productsSnapshot = await get(productsRef);
      setTotalProducts(productsSnapshot.exists() ? Object.keys(productsSnapshot.val()).length : 0);
      
      // Fetch total staff
      const staffRef = ref(db, 'staffs');
      const staffSnapshot = await get(staffRef);
      setTotalStaff(staffSnapshot.exists() ? Object.keys(staffSnapshot.val()).length : 0);
      
      // Fetch total categories
      const categoriesRef = ref(db, 'categories');
      const categoriesSnapshot = await get(categoriesRef);
      setTotalCategories(categoriesSnapshot.exists() ? Object.keys(categoriesSnapshot.val()).length : 0);
      
      // Fetch total sales for the selected month
      const salesRef = ref(db, 'history');
      const salesSnapshot = await get(salesRef);
      if (salesSnapshot.exists()) {
        let total = 0;
        let cancelled = 0;
        let completed = 0;
        let returning = 0;
        let customers = {};
        
        // Calculate total sales, cancelled, and completed orders
        salesSnapshot.forEach((childSnapshot) => {
          const orderDateTime = childSnapshot.val().orderDateTime;
          const orderMonth = new Date(orderDateTime).toLocaleString('default', { month: 'short' });
          if (selectedMonth === '' || orderMonth === selectedMonth) {
            total += parseFloat(childSnapshot.val().total) || 0;
            const orderStatus = childSnapshot.val().status;
            if (orderStatus === 'Cancelled') {
              cancelled++;
            } else {
              completed++;
            }
            const customerName = childSnapshot.val().customerName;
            if (!customers[customerName]) {
              customers[customerName] = true;
            } else {
              returning++;
            }
          }
        });
  
        const cancelledRef = ref(db, 'canceled');
          const cancelledSnapshot = await get(cancelledRef);
          if (cancelledSnapshot.exists()) {
            let cancelled = 0;
            cancelledSnapshot.forEach((childSnapshot) => {
              const orderDateTime = childSnapshot.val().OrderDateTime; // Corrected field name
              const orderMonth = new Date(orderDateTime).toLocaleString('default', { month: 'short' });
              if (selectedMonth === '' || orderMonth === selectedMonth) {
                cancelled++;
              }
            });
            setCancelledCount(cancelled);
          } else {
            setCancelledCount(0);
          }
  
        // Fetch count of completed orders
        setCompletedCount(completed);
  
        setReturningCustomers(returning);
        setTotalCustomers(Object.keys(customers).length);
        
        setTotalSales(total);
      }
    };
  
    fetchData();
  }, [selectedMonth]); // Include selectedMonth in the dependency array  

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  const doughnutChartData1 = {
    labels: ['Cancelled', 'Completed'],
    datasets: [
      {
        label: 'Overview',
        data: [cancelledCount, completedCount],
        backgroundColor: [
          'rgba(38, 166, 154, 0.5)', // Teal
          'rgba(14, 165, 233, 0.5)', // Sky
        ],
        borderColor: [
          'rgba(38, 166, 154, 1)',   // Teal
          'rgba(14, 165, 233, 1)',   // Sky
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const doughnutChartData2 = {
    labels: ['Returning Customers', 'New Customers'],
    datasets: [
      {
        label: 'Overview',
        data: [returningCustomers, totalCustomers],
        backgroundColor: [
          'rgba(94, 234, 212, 0.5)',  // Light Teal
          'rgba(125, 211, 252, 0.5)', // Light Sky
        ],
        borderColor: [
          'rgba(94, 234, 212, 1)',    // Light Teal
          'rgba(125, 211, 252, 1)',   // Light Sky
        ],
        borderWidth: 1,
      },
    ],
  };
  
  return (
    <div className="flex-1 bg-white">
      <div className="m-7">
        <div className='border border-gray-100 p-4 rounded-lg bg-gray-100 flex items-center justify-between shadow-md'>
          <div className='md:mb-4 h-auto'>
            <h2 className="text-xs font-semibold mb-3">Dashboard Panel</h2>
            <p className="text-3xl font-bold">Welcome back, {adminName}!</p>
            <p className="text-lg">Enjoy browsing</p>
          </div>
          <div className="flex flex-row items-center space-x-4 bg-main-green py-4 px-6 rounded-lg shadow-lg">
            <i className="material-icons text-7xl text-white">person</i>
            <div className="flex flex-col">
              <p className="text-xl font-semibold mb-1 text-white">{adminName}</p>
              <p className="text-xs text-white"><strong>Role:</strong> {adminRole}</p>
              <p className="text-xs text-white"><strong>Email:</strong> {adminEmail}</p>
              <p className="text-xs text-white"><strong>Staff ID:</strong> {adminUsername}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-around mt-10">
          <Card
            icon={<i className="material-icons text-white shadow-xl rounded-lg p-1 text-7xl">store</i>}
            bgColor="blue"
            title="Total Products"
            value={<span className="text-md">{totalProducts}</span>}
          />
          <Card
            icon={<i className="material-icons text-white shadow-xl rounded-lg p-1 text-7xl">people</i>}
            bgColor="purple"
            title="Total Staff"
            value={<span className="text-md">{totalStaff}</span>}
          />
          <Card
            icon={<i className="material-icons text-white shadow-xl rounded-lg p-1 text-7xl">category</i>}
            bgColor="yellow"
            title="Total Categories"
            value={<span className="text-md">{totalCategories}</span>}
          />
          <Card
            icon={<i className="material-icons text-white shadow-xl rounded-lg p-1 text-7xl">monetization_on</i>} 
            bgColor="red"
            title="Total Sales"
            value={<span className="text-md">&#8369;{totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
          />
        </div>
        <div className=" flex justify-center bg-gray-100 p-2 mt-10 rounded shadow-md border border-gray-100">
          <label htmlFor="months" className="mr-2 mt-2 font-bold text-black">MONTH:</label>
          <select
            id="months"
            className="p-2 border border-gray-100 rounded-lg shadow-md"
            onChange={handleMonthChange}
            value={selectedMonth}
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col md:flex-row justify-around mt-10 w-full">
          {/* Donut Charts inside bg-gray-100 */}
          <div className="flex justify-around bg-gray-100 border border-gray-100 p-10 rounded-lg shadow-md w-full md:w-2/3 lg:w-3/4 mr-8">
            <div className='w-[400px] h-[400px] items-center text-center'>
              <h2 className='font-extrabold'>ORDERS</h2>
              <Doughnut data={doughnutChartData1} />
            </div>
            <div className='w-[400px] h-[400px] md:w-[400] md:h-[400] text-center items-center'>
              <h2 className='font-extrabold'>CUSTOMERS</h2>
              <Doughnut data={doughnutChartData2} />
            </div>
          </div>

          {/* Ongoing Orders moved outside */}
          <div className="flex flex-col justify-start w-full md:w-1/3 lg:max-w-xs bg-gray-100 p-4 h-[480px] shadow-md border border-gray-100 rounded-lg overflow-y-auto mt-4 md:mt-0">
            <h2 className="text-lg font-semibold mb-1 mt-2 text-center text-black">Ongoing Orders</h2>
            <div className="flex justify-between items-center p-4 my-2 bg-main-green rounded-lg shadow-md font-extrabold text-white">
              <span className="text-sm text-center">Order #</span>
              <span className="text-sm text-center">Staff Name</span>
            </div>
            <ul className="flex-grow">
              {Object.entries(orders).map(([orderNumber, order]) => (
                <li key={orderNumber} className="flex justify-between items-center p-4 my-4 bg-white rounded-lg shadow-md text-center">
                  <span className="text-sm font-semibold text-center">{orderNumber}</span>
                  <span className="text-sm text-center">{order.StaffName}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;