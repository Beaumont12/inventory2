import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Table } from 'antd';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getDatabase, ref, get } from 'firebase/database';
import moment from 'moment';

const Inventory = () => {
  const [stockHistory, setStockHistory] = useState([]);
  const [stockSummary, setStockSummary] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStockItems: 0,
    outOfStockItems: 0, // Added out of stock items
  });
  const [stockTrendData, setStockTrendData] = useState([]); // State for stock trend data

  const db = getDatabase();

  // Unified stock status function
  const getStockStatus = (stock, category = '') => {
    if (category === 'Cakes' && typeof stock === 'object' && stock.whole !== undefined) {
      const wholeStock = stock.whole;
      if (wholeStock === 0) return { status: 'Out of Stock', color: 'text-red-500' };
      if (wholeStock > 0 && wholeStock <= 2) return { status: 'Low Stock', color: 'text-yellow-500' };
      return { status: 'In Stock', color: 'text-green-500' };
    }

    if (category === 'Utensils') {
      if (stock === 0) return { status: 'Out of Stock', color: 'text-red-500' };
      if (stock < 40) return { status: 'Low Stock', color: 'text-yellow-500' };
      return { status: 'In Stock', color: 'text-green-500' };
    }

    // Default for ingredients and others
    if (stock === 0) return { status: 'Out of Stock', color: 'text-red-500' };
    if (stock > 0 && stock <= 10) return { status: 'Low Stock', color: 'text-yellow-500' };
    return { status: 'In Stock', color: 'text-green-500' };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stock history
        const historyRef = ref(db, 'stocksHistory');
        const historySnapshot = await get(historyRef);
        let historyArray = [];

        if (historySnapshot.exists()) {
          const historyData = historySnapshot.val();
          historyArray = Object.entries(historyData).map(([id, item]) => ({
            id,
            date: item.Date,
            name: item.ItemName,
            action: item.Actions,
            quantity: item.Quantity,
          }));

          // Sort stock history by date (latest first)
          historyArray.sort((a, b) => new Date(b.date) - new Date(a.date));

          setStockHistory(historyArray);
        } else {
          console.log("No stock history found.");
        }
        // Fetch ingredients
        const ingredientsRef = ref(db, 'stocks/Ingredients');
        const ingredientsSnapshot = await get(ingredientsRef);
        let totalIngredients = 0;
        let totalStock = 0;
        let lowStockItems = 0; // Reset for low stock items
        let outOfStockItems = 0; // Reset for out of stock items

        if (ingredientsSnapshot.exists()) {
          const ingredientsData = ingredientsSnapshot.val();

          Object.keys(ingredientsData).forEach((category) => {
            if (!category.includes('Count')) {
              const items = ingredientsData[category];
              totalIngredients += Object.keys(items).length;

              Object.values(items).forEach((item) => {
                if (typeof item.stocks === 'object') {
                  const wholeStock = parseInt(item.stocks.whole, 10) || 0;
                  const { status } = getStockStatus({ whole: wholeStock }, 'Cakes');

                  totalStock += wholeStock * 8; // Update this line as necessary
                  if (status === 'Low Stock') lowStockItems++; // Increment low stock count
                  if (wholeStock === 0) outOfStockItems++; // Increment out of stock count
                } else {
                  totalStock += parseInt(item.stocks, 10) || 0;
                  const { status } = getStockStatus(parseInt(item.stocks, 10), 'Ingredients');

                  if (status === 'Low Stock') lowStockItems++; // Increment low stock count
                  if (parseInt(item.stocks, 10) === 0) outOfStockItems++; // Increment out of stock count
                }
              });
            }
          });
        } else {
          console.log("No ingredients found.");
        }

        // Fetch utensils
        const utensilsRef = ref(db, 'stocks/Utensils');
        const utensilsSnapshot = await get(utensilsRef);
        let totalUtensils = 0;

        if (utensilsSnapshot.exists()) {
          const utensilsData = utensilsSnapshot.val();
          totalUtensils += Object.keys(utensilsData).length;

          Object.values(utensilsData).forEach((utensil) => {
            if (utensil.name && !utensil.name.includes('Count')) {
              const stock = parseInt(utensil.stocks, 10) || 0;
              totalStock += stock;

              const { status } = getStockStatus(stock, 'Utensils');

              if (status === 'Low Stock') lowStockItems++; // Increment low stock count
              if (stock === 0) outOfStockItems++; // Increment out of stock count
            } else {
              console.warn('Utensil object is missing a name property:', utensil);
            }
          });
        } else {
          console.log("No utensils found.");
        }

        // Update stock summary
        setStockSummary({
          totalProducts: totalIngredients + totalUtensils,
          totalStock: totalStock,
          lowStockItems: lowStockItems, // Combined low stock items count
          outOfStockItems: outOfStockItems, // Total out of stock items
        });

        // Prepare stock trend data
        const groupedTrendData = {};
        historyArray.forEach(item => {
          const day = moment(item.date).format('YYYY-MM-DD'); // Group by day
          if (!groupedTrendData[day]) {
            groupedTrendData[day] = 0;
          }
          groupedTrendData[day] += item.quantity;
        });

        // Convert grouped data into an array for the chart
        const trendData = Object.entries(groupedTrendData).map(([date, stock]) => ({
          date,
          stock,
        }));

        setStockTrendData(trendData); // Update the state with the new trend data

      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };

    fetchData();
  }, [db]);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity) => (
        <span style={{ color: quantity < 0 ? 'red' : 'green' }}>
          {quantity < 0 ? `${quantity}` : `+${quantity}`}
        </span>
      ),
    },
  ];

  return (
    <div className="flex-1 bg-white p-7">
      <h2 className="text-2xl font-bold mb-5 text-main-green">Stocks Dashboard</h2>

      {/* Summary Cards */}
      <Row gutter={16}>
        <Col span={6}>
          <Card title="Total Products" bordered={false} className="shadow-lg bg-emerald-400 rounded-lg">
            <div className="text-3xl font-semibold">{stockSummary.totalProducts}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Total Stock" bordered={false} className="shadow-lg bg-teal-400 rounded-lg">
            <div className="text-3xl font-semibold">{stockSummary.totalStock}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Low Stock Items" bordered={false} className="shadow-lg bg-cyan-400 rounded-lg">
            <div className="text-3xl font-semibold">{stockSummary.lowStockItems}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Out of Stock Items" bordered={false} className="shadow-lg bg-sky-400 rounded-lg">
            <div className="text-3xl font-semibold">{stockSummary.outOfStockItems}</div>
          </Card>
        </Col>
      </Row>

      {/* Stock History Table */}
      <div style={{ 
          marginTop: '20px', 
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // Adjusted shadow style
          borderRadius: '8px',
          overflow: 'hidden' // Optional: adds rounded corners
      }}>
          <h3 className="text-xl font-semibold p-2 bg-main-green text-white">Stock History</h3>
          <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto'
          }}>
              <Table
                  columns={columns}
                  dataSource={stockHistory}
                  rowKey={(record) => record.id}
                  pagination={false}
              />
          </div>
      </div>


      {/* Stock Trend Graph */}
      <div className='shadow-lg rounded-lg shadow-slate-200 overflow-hidden mt-6'>
        <h3 className="text-xl font-semibold p-2 bg-main-green text-white">Stock Trend</h3>
      <ResponsiveContainer width="100%" height={300} className="mt-4 p-2">
        <BarChart data={stockTrendData}>
          <Bar type="monotone" dataKey="stock" fill="#8884d8" />
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
        </BarChart>
      </ResponsiveContainer>
      </div>
      
    </div>
  );
};

export default Inventory;