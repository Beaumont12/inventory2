import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Select, DatePicker } from 'antd';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import * as XLSX from 'xlsx';
import moment from 'moment';

const { RangePicker } = DatePicker;

const StockHistory = () => {
  const [stockHistory, setStockHistory] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({
    action: 'All',
    product: '',
    dateRange: null,
  });
  const [actions, setActions] = useState([]);

  const db = getDatabase();

  useEffect(() => {
    const historyRef = ref(db, 'stocksHistory');

    const fetchData = () => {
      onValue(historyRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const historyArray = Object.entries(data).map(([id, item]) => ({
            id,
            date: item.Date, // Keep date as string (YYYY-MM-DD)
            product: item.ItemName,
            action: item.Actions,
            quantity: item.Quantity,
          }));

          const uniqueActions = [...new Set(historyArray.map((item) => item.action))];
          console.log('Fetched unique actions:', uniqueActions);

          // Sort by date (latest first)
          const sortedHistory = historyArray.sort((a, b) => b.date.localeCompare(a.date));

          console.log('Fetched and sorted stock history:', sortedHistory);

          setActions(['All', ...uniqueActions]);

          setStockHistory(sortedHistory);
          setFilteredData(sortedHistory);
        }
      });
    };

    fetchData();

    // Cleanup listener on unmount
    return () => {
      off(historyRef);
    };
  }, [db]);

  const handleDynamicFilter = (updatedFilters) => {
    console.log('Applying filters:', updatedFilters);

    let filtered = [...stockHistory];

    // Filter by product
    if (updatedFilters.product) {
      filtered = filtered.filter((item) =>
        item.product.toLowerCase().includes(updatedFilters.product.toLowerCase())
      );
      console.log('Filtered by product:', filtered);
    }

    // Filter by action
    if (updatedFilters.action !== 'All') {
      filtered = filtered.filter((item) => item.action === updatedFilters.action);
      console.log('Filtered by action:', filtered);
    }

    // Filter by date range (string comparison)
    if (updatedFilters.dateRange) {
      const [startDate, endDate] = updatedFilters.dateRange;

      filtered = filtered.filter((item) => {
        const itemDate = item.date; // Use the string date directly
        const isInRange = itemDate >= startDate.format('YYYY-MM-DD') && itemDate <= endDate.format('YYYY-MM-DD');
        console.log('Checking date range:', itemDate, isInRange);
        return isInRange;
      });
      console.log('Filtered by date range:', filtered);
    }

    setFilteredData(filtered);
  };

  const handleExportToExcel = () => {
    console.log('Exporting to Excel with filtered data:', filteredData);
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'StockHistory');
    XLSX.writeFile(wb, `StockHistory_${moment().format('YYYYMMDD')}.xlsx`);
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => date, // Display date as a string (YYYY-MM-DD)
    },
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
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
          {quantity < 0 ? quantity : `+${quantity}`}
        </span>
      ),
    },
  ];

  return (
    <div className="p-7 flex-1 bg-white overflow-auto h-full">
      <h1 className="text-6xl text-center font-bold text-black">Stock History</h1>
      <h3 className="text-lg md:text-base bg-main-green rounded-lg text-white mb-6 text-center mt-4 md:mt-8 font-semibold">
        ENJOY BROWSING
      </h3>

      {/* Filters */}
      <div className="flex justify-between gap-4 mb-6">
        <Input
          placeholder="Search Product"
          onChange={(e) => {
            const newFilters = { ...filters, product: e.target.value };
            setFilters(newFilters);
            handleDynamicFilter(newFilters); // Dynamic filter applied here
          }}
          style={{ width: '800px', borderRadius:'8px' }}
          className="shadow-lg"
        />
        <Select
          placeholder="Select Action"
          value={filters.action}
          onChange={(value) => {
            const newFilters = { ...filters, action: value };
            setFilters(newFilters);
            handleDynamicFilter(newFilters); // Dynamic filter applied here
          }}
          allowClear
          style={{ width: '200px' }}
          className="custom-select shadow-lg"
        >
          {actions.map((action) => (
            <Select.Option key={action} value={action}>
              {action}
            </Select.Option>
          ))}
        </Select>
        <RangePicker
          onChange={(dates) => {
            const newFilters = { ...filters, dateRange: dates };
            setFilters(newFilters);
            handleDynamicFilter(newFilters); // Dynamic filter applied here
          }}
          className="shadow-lg"
          style={{ borderRadius:'8px'}}
        />
        <Button
          type="primary"
          className="bg-main-honey shadow-lg rounded-lg"
          onClick={handleExportToExcel}
        >Export to Excel
        </Button>
      </div>

      {/* Stock History Table */}
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey={(record) => record.id}
        pagination={{ pageSize: 10 }}
        bordered
        style={{
            borderColor: '#DDB04B', // main honey color for the border
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: '8px',
            margin: 0,
        }}
        components={{
            header: {
            cell: ({ children, ...restProps }) => (
                <th
                {...restProps}
                style={{
                    backgroundColor: '#DDB04B', // main honey color
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
  );
};

export default StockHistory;
