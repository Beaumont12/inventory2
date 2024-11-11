import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Table, Button, Select, DatePicker, Input } from 'antd';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import moment from 'moment';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;

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
  const [filters, setFilters] = useState({
    action: '',
    product: '',
    dateRange: null,
    stockStatus: '',
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
    const fetchData = () => {
      try {
        console.log("Fetching stock history and stock summary...");
        
        const historyRef = ref(db, 'stocksHistory');
        const ingredientsRef = ref(db, 'stocks/Ingredients');
        const utensilsRef = ref(db, 'stocks/Utensils');
    
        // Fetch history and filter based on the current filters
        onValue(historyRef, (snapshot) => {
          let historyArray = [];
          let decreased = 0, added = 0, restocked = 0, ordered = 0, removed = 0;
          let groupedTrendData = {};
        
          if (snapshot.exists()) {
            const historyData = snapshot.val();
            console.log("History data fetched: ", historyData);
            
            historyArray = Object.entries(historyData).map(([id, item]) => {
              const action = item.Actions.toLowerCase();
              const quantity = item.Quantity;
              const date = item.Date; // Keep date as a string (YYYY-MM-DD)
        
              console.log(`Processing item: ${item.ItemName}, Action: ${action}, Quantity: ${quantity}, Date: ${date}`);
        
              // Filtering based on the selected filter values
              let matchFilters = true;
        
              // Action filter
              if (filters.action && !action.includes(filters.action)) {
                matchFilters = false;
                console.log(`Filter mismatch on action: ${filters.action}`);
              }
        
              // Product filter
              if (filters.product && !item.ItemName.toLowerCase().includes(filters.product.toLowerCase().trim())) {
                matchFilters = false;
                console.log(`Filter mismatch on product: ${filters.product}`);
              }
        
              // Stock status filter
              if (filters.stockStatus && getStockStatus(item.Quantity).status !== filters.stockStatus) {
                matchFilters = false;
                console.log(`Filter mismatch on stock status: ${filters.stockStatus}`);
              }
        
              // Date filter (ensure date is in correct format for comparison)
              if (filters.dateRange) {
                const [startDate, endDate] = filters.dateRange;
                const itemDate = date; // Use string date directly
                const isInRange = itemDate >= startDate.format('YYYY-MM-DD') && itemDate <= endDate.format('YYYY-MM-DD');
                if (!isInRange) {
                  matchFilters = false;
                }
              } else {
                console.log("No valid date range selected");
              }
        
              if (!matchFilters) {
                return null; // Skip this item if it doesn't match the filters
              }
        
              // Track stock actions
              if (quantity < 0) decreased += Math.abs(quantity);
              if (action.includes('added')) added += quantity;
              if (action.includes('restocked')) restocked += quantity;
              if (action.includes('ordered')) ordered += quantity;
              if (action.includes('removed')) removed += quantity;
        
              // Group stock changes by date for trend calculation
              if (!groupedTrendData[date]) groupedTrendData[date] = 0;
              groupedTrendData[date] += item.Quantity;
        
              return {
                id,
                date, // Keep the date as a string
                name: item.ItemName,
                action: item.Actions,
                quantity: item.Quantity,
              };
            }).filter(item => item !== null); // Filter out null items
        
            console.log("Filtered stock history: ", historyArray);
            setStockHistory(historyArray.reverse());
            setStockActionsSummary({ decreased, added, restocked, ordered, removed });
        
            // Prepare stock trend data for the chart (now grouped by date)
            const trendData = Object.entries(groupedTrendData).map(([date, stock]) => ({
              date,
              stock,
            }));
            console.log("Stock trend data: ", trendData);
            setStockTrendData(trendData);
          } else {
            console.log("No stock history data found.");
          }
        });
        
        // Fetch stock summary (Ingredients + Utensils)
        onValue(ingredientsRef, (snapshot) => {
          let totalIngredients = 0;
          let totalStock = 0;
          let lowStockItems = 0;
          let outOfStockItems = 0;
  
          if (snapshot.exists()) {
            const ingredientsData = snapshot.val();
            console.log("Ingredients data fetched: ", ingredientsData);
  
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
  
          onValue(utensilsRef, (snapshot) => {
            let totalUtensils = 0;
  
            if (snapshot.exists()) {
              const utensilsData = snapshot.val();
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
  
            console.log("Updating stock summary...");
            setStockSummary({
              totalProducts: totalIngredients + totalUtensils,
              totalStock: totalStock,
              lowStockItems: lowStockItems,
              outOfStockItems: outOfStockItems,
            });
          });
        });
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };
  
    fetchData();
  
    return () => {
      const historyRef = ref(db, 'stocksHistory');
      const ingredientsRef = ref(db, 'stocks/Ingredients');
      const utensilsRef = ref(db, 'stocks/Utensils');
      off(historyRef);
      off(ingredientsRef);
      off(utensilsRef);
    };
  }, [filters]);  // Dependency array includes filters to ensure the data updates whenever the filters change

  const handleFilterChange = (value, filterType) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterType]: value
    }));
  };
  
  const handleExportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(stockHistory);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "StockHistory");

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
    },
  ];

  return (
    <div className="flex-1 bg-white p-7">
      <h2 className="text-2xl font-bold mb-5 text-main-green">Stocks Dashboard</h2>

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

      {/* Filters Section */}
      <div className="mt-4 flex gap-x-4">
        <Select
          placeholder="Action"
          onChange={(value) => setFilters({ ...filters, action: value })}
          value={filters.action}
          className="w-1/4 shadow-lg custom-select"
        >
          <Option value="">All Actions</Option>
          <Option value="added">Added</Option>
          <Option value="removed">Removed</Option>
          <Option value="restocked">Restocked</Option>
          <Option value="decreased">Decreased</Option>
          <Option value="ordered">Ordered</Option>
        </Select>

        <Input
          placeholder="Search by Product"
          onChange={(e) => setFilters({ ...filters, product: e.target.value })}
          value={filters.product}
          className="w-1/4 rounded-lg shadow-lg"
        />

        <DatePicker.RangePicker
          format="YYYY-MM-DD"
          onChange={(dates) => handleFilterChange(dates, 'dateRange')}
          className="shadow-lg w-1/4" // Add shadow and width to the component
          style={{ borderRadius: '8px' }} // Add rounded corners style
        />
        
        <Button type="primary" onClick={handleExportToExcel} className="font-bold bg-main-honey rounded-lg shadow-lg border-none">
          Export to Excel
        </Button>
      </div>

      {/* Stock Trend Graph */}
      <div className="shadow-lg rounded-lg shadow-slate-200 overflow-hidden mt-6">
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

      {/* Export Button */}
      <div className="mt-4">
        
      </div>
    </div>
  );
};

export default Inventory;
