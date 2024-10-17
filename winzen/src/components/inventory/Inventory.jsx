import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Table, Button } from 'antd';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getDatabase, ref, get } from 'firebase/database';
import moment from 'moment';
import * as XLSX from 'xlsx';

const Inventory = () => {
  const [stockHistory, setStockHistory] = useState([]);
  const [stockSummary, setStockSummary] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStockItems: 0,
    outOfStockItems: 0, 
  });
  const [stockTrendData, setStockTrendData] = useState([]);
  const [stockActionsSummary, setStockActionsSummary] = useState({
    decreased: 0,
    added: 0,
    restocked: 0,
    ordered: 0,
    removed: 0,
  });

  const db = getDatabase();

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

    if (stock === 0) return { status: 'Out of Stock', color: 'text-red-500' };
    if (stock > 0 && stock <= 10) return { status: 'Low Stock', color: 'text-yellow-500' };
    return { status: 'In Stock', color: 'text-green-500' };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const historyRef = ref(db, 'stocksHistory');
        const historySnapshot = await get(historyRef);
        let historyArray = [];
        let decreased = 0, added = 0, restocked = 0, ordered = 0, removed = 0;

        if (historySnapshot.exists()) {
          const historyData = historySnapshot.val();
          historyArray = Object.entries(historyData).map(([id, item]) => {
            const action = item.Actions.toLowerCase();
            const quantity = item.Quantity;

            if (quantity < 0) decreased += Math.abs(quantity);
            if (action.includes('add')) added += quantity;
            if (action.includes('restock')) restocked += quantity;
            if (action.includes('order')) ordered += quantity;
            if (action.includes('removed')) removed += quantity;

            return {
              id,
              date: item.Date,
              name: item.ItemName,
              action: item.Actions,
              quantity: item.Quantity,
            };
          });

          historyArray.sort((a, b) => new Date(b.date) - new Date(a.date));
          setStockHistory(historyArray);
          setStockActionsSummary({ decreased, added, restocked, ordered, removed });
        }

        const ingredientsRef = ref(db, 'stocks/Ingredients');
        const ingredientsSnapshot = await get(ingredientsRef);
        let totalIngredients = 0;
        let totalStock = 0;
        let lowStockItems = 0;
        let outOfStockItems = 0;

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

                  totalStock += wholeStock * 8;
                  if (status === 'Low Stock') lowStockItems++;
                  if (wholeStock === 0) outOfStockItems++;
                } else {
                  totalStock += parseInt(item.stocks, 10) || 0;
                  const { status } = getStockStatus(parseInt(item.stocks, 10), 'Ingredients');

                  if (status === 'Low Stock') lowStockItems++;
                  if (parseInt(item.stocks, 10) === 0) outOfStockItems++;
                }
              });
            }
          });
        }

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

              if (status === 'Low Stock') lowStockItems++;
              if (stock === 0) outOfStockItems++;
            }
          });
        }

        setStockSummary({
          totalProducts: totalIngredients + totalUtensils,
          totalStock: totalStock,
          lowStockItems: lowStockItems,
          outOfStockItems: outOfStockItems,
        });

        const groupedTrendData = {};
        historyArray.forEach(item => {
          const day = moment(item.date).format('YYYY-MM-DD');
          if (!groupedTrendData[day]) groupedTrendData[day] = 0;
          groupedTrendData[day] += item.quantity;
        });

        const trendData = Object.entries(groupedTrendData).map(([date, stock]) => ({ date, stock }));
        setStockTrendData(trendData);
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };

    fetchData();
  }, [db]);

  const handleExportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(stockHistory);
    const wb = XLSX.utils.book_new();
    
    // Overall Stock History
    XLSX.utils.book_append_sheet(wb, ws, "StockHistory");
  
    // Summary for Overall
    const summaryData = [
      ["Action", "Quantity"],
      ["Decreased", stockActionsSummary.decreased],
      ["Added", stockActionsSummary.added],
      ["Restocked", stockActionsSummary.restocked],
      ["Ordered", stockActionsSummary.ordered],
      ["Removed", stockActionsSummary.removed],
    ];
  
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
  
    // Grouping stock history by month
    const monthlyData = {};
    stockHistory.forEach(item => {
      const monthYear = moment(item.date).format('YYYY-MM'); // Group by year and month
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = [];
      }
      monthlyData[monthYear].push(item);
    });
  
    // Create a sheet for each month
    Object.entries(monthlyData).forEach(([month, data]) => {
      const monthlyWs = XLSX.utils.json_to_sheet(data); // Create sheet for the month
      const monthlySummaryData = [
        ["Action", "Quantity"],
        ["Decreased", data.reduce((acc, item) => item.quantity < 0 ? acc + Math.abs(item.quantity) : acc, 0)],
        ["Added", data.reduce((acc, item) => item.action.includes('Added') ? acc + item.quantity : acc, 0)],
        ["Restocked", data.reduce((acc, item) => item.action.includes('Restocked') ? acc + item.quantity : acc, 0)],
        ["Ordered", data.reduce((acc, item) => item.action.includes('Ordered') ? acc + item.quantity : acc, 0)],
        ["Removed", data.reduce((acc, item) => item.action.includes('Removed') ? acc + item.quantity : acc, 0)],
      ];
      
      const monthlySummarySheet = XLSX.utils.aoa_to_sheet(monthlySummaryData);
      
      XLSX.utils.book_append_sheet(wb, monthlyWs, month); // Append the monthly sheet
      XLSX.utils.book_append_sheet(wb, monthlySummarySheet, `${month} Summary`); // Append the monthly summary sheet
    });
  
    // Finally, write the file
    XLSX.writeFile(wb, `StockHistory_${moment().format('YYYYMMDD')}.xlsx`);
  };
  
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

      <Row gutter={16}>
        <Col span={6}>
          <Card title="Total Items" bordered={false} className="shadow-lg bg-emerald-400 rounded-lg">
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
      <div style={{ marginTop: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', borderRadius: '8px', overflow: 'hidden' }}>
        <div className='flex justify-between bg-main-green items-center p-2'>
          <h3 className="text-xl font-semibold p-2  text-white">Stock History</h3>
          <Button type="primary" className="rounded-lg font-bold bg-main-honey" onClick={handleExportToExcel}>Export to Excel</Button>
        </div>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <Table
            columns={columns}
            dataSource={stockHistory}
            rowKey={(record) => record.id}
            pagination={false}
          />
        </div>
          <div className='p-2 bg-main-green text-white'>
            <div className='items-center justify-between flex'>
              <p className='text-xs'>Decreased: {stockActionsSummary.decreased}</p>
              <p className='text-xs'>Added: {stockActionsSummary.added}</p>
              <p className='text-xs'>Restocked: {stockActionsSummary.restocked}</p>
              <p className='text-xs'>Ordered: {stockActionsSummary.ordered}</p>
              <p className='text-xs'>Removed: {stockActionsSummary.removed}</p>
            </div>
          </div>
      </div>

      {/* Stock Trend Graph */}
      <div className='shadow-lg rounded-lg shadow-slate-200 overflow-hidden mt-6'>
        <h3 className="text-xl font-semibold p-2 bg-main-green text-white">Stock Trend</h3>
        <ResponsiveContainer width="100%" height={300} className="mt-4 p-2">
          <BarChart data={stockTrendData}>
            <Bar type="monotone" dataKey="stock" fill="#DDB04B" />
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