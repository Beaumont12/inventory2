import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, set, remove, get, push } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { FaSearch } from 'react-icons/fa';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

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
const db = getDatabase(app);

const Utensils = () => {
  const [utensils, setUtensils] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUtensilName, setNewUtensilName] = useState('');
  const [newUtensilQuantity, setNewUtensilQuantity] = useState(0);
  const [oldUtensilStock, setOldUtensilStock] = useState(0);
  const [deleteMode, setDeleteMode] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState([]);
  const [updateMode, setUpdateMode] = useState(false); // New state for update mode
  const [productType, setProductType] = useState('New Product');

  useEffect(() => {
    const db = getDatabase(app);
    const utensilsRef = ref(db, 'stocks/Utensils');

    onValue(utensilsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const utensilsArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setUtensils(utensilsArray);
        checkStockLevels(utensilsArray)
      }else{
        checkStockLevels([]);
      }
    });
  }, []);

  const getStockStatus = (quantity) => {
    if (quantity === 0) return <span className="text-red-600 font-bold">Out of Stock</span>;
    if (quantity < 40) return <span className="text-yellow-600 font-bold">Low Stock</span>;
    return <span className="text-green-600 font-bold">In Stock</span>;
  };

  const filteredUtensils = utensils.filter((utensil) =>
    utensil.name && utensil.name.toLowerCase().includes(searchQuery.toLowerCase())
  );  

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const logStockHistory = async (itemName, action, quantityChange) => {
    const historyRef = ref(db, 'stocksHistory');

    const currentDate = new Date();
    const localDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000);
    const formattedDate = localDate.toISOString().split('T')[0];

    const newEntry = {
        Date: formattedDate,
        ItemName: itemName,
        Actions: action,
        Quantity: quantityChange,
    };

    try {
        await push(historyRef, newEntry);
        console.log(`Logged: ${action} ${quantityChange} of ${itemName} on ${currentDate}`);
    } catch (error) {
        console.error("Error logging stock history: ", error);
    }
  };

  const handleSaveNewItem = async () => {
    const db = getDatabase(app);

    console.log('handleSaveNewItem called');
    
    if (productType === "New Product" && newUtensilName.trim() === '') {
        console.log('No utensil name provided for new product.');
        window.alert('Please enter a utensil name.');
        return;
    }
  
    if (productType === "New Product") {
        console.log('Adding a new product.');
  
        const utensilCountRef = ref(db, 'stocks/Utensils/utilCount');
        console.log('Fetching current utilCount...');
  
        try {
            const snapshot = await get(utensilCountRef);
            let utilCount = 1; // Default to 1 if no utilCount is found
            console.log('Snapshot exists:', snapshot.exists());
  
            if (snapshot.exists()) {
                utilCount = snapshot.val(); // Get the existing count
                console.log('Current utilCount:', utilCount);
            }
  
            const utensilId = `util${utilCount}`;
            console.log('Generated utensilId:', utensilId);
  
            const newUtensilData = {
                name: newUtensilName,
                stocks: newUtensilQuantity,
            };
  
            console.log('New utensil data:', newUtensilData);
  
            // Save the new utensil data
            await set(ref(db, `stocks/Utensils/${utensilId}`), newUtensilData);
            console.log('New utensil added successfully.');
  
            // Log the addition action
            await logStockHistory(newUtensilName, 'Added', parseInt(newUtensilQuantity));
  
            // Increment the utilCount after adding the new item
            console.log('Incrementing utilCount to:', utilCount + 1);
            await set(utensilCountRef, utilCount + 1);
  
            console.log('utilCount updated successfully.');
            window.alert('New utensil added successfully!');
            resetModal();
        } catch (error) {
            console.error('Error saving new item:', error);
        }
    } else {
        if (productType === "Old Product" && newUtensilName) {
            console.log('Updating stock for an existing product.');
  
            const utensil = utensils.find(u => u.name === newUtensilName);
            console.log('Found utensil:', utensil);
  
            if (utensil) {
                const updatedStock = parseInt(utensil.stocks) + parseInt(newUtensilQuantity);
                console.log('Updated stock:', updatedStock);
  
                await set(ref(db, `stocks/Utensils/${utensil.id}/stocks`), updatedStock);
                console.log('Stock updated successfully.');
  
                // Log the stock update action
                await logStockHistory(utensil.name, 'Restocked', parseInt(newUtensilQuantity));
  
                window.alert('Stock updated successfully!');
                resetModal();
            } else {
                console.log('Utensil not found.');
            }
        }
    }
  };  

  const resetModal = () => {
    setProductType(''); 
    setNewUtensilName(''); 
    setNewUtensilQuantity(0);
    setOldUtensilStock(0); 
    setIsModalOpen(false);
  };

  const handleToggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
    setItemsToDelete([]);
  };

  const handleSelectItem = (itemId) => {
    if (itemsToDelete.includes(itemId)) {
      setItemsToDelete(itemsToDelete.filter(id => id !== itemId));
    } else {
      setItemsToDelete([...itemsToDelete, itemId]);
    }
  };

  const handleConfirmDelete = async () => {
    if (window.confirm("Are you sure you want to delete the selected items?")) {
        const db = getDatabase(app);
        for (const itemId of itemsToDelete) {
            const utensilRef = ref(db, `stocks/Utensils/${itemId}`);
            const snapshot = await get(utensilRef);
            if (snapshot.exists()) {
                const utensil = snapshot.val();
                await remove(utensilRef);
                // Log the deletion action
                await logStockHistory(utensil.name, 'Removed', -parseInt(utensil.stocks));
                console.log(`Deleted utensil: ${utensil.name}`);
            }
        }
        setItemsToDelete([]);
        window.alert("Selected items have been deleted.");
    }
  };

  const [alert, setAlert] = useState({ message: '', type: '', isVisible: false });

  const checkStockLevels = (utensils) => {
    if (!utensils) return;
  
    let outOfStockCount = 0;
    let lowStockCount = 0;
  
    utensils.forEach((utensil) => {
      if (utensil.stocks === 0) {
        outOfStockCount++;
      } else if (utensil.stocks < 40) {
        lowStockCount++;
      }
    });
  
    let alertMessage = '';
    if (outOfStockCount > 0) {
      alertMessage += `${outOfStockCount} Utensil${outOfStockCount > 1 ? 's are' : ' is'} out of stock! `;
    }
    if (lowStockCount > 0) {
      alertMessage += `${lowStockCount} Utensil${lowStockCount > 1 ? 's are' : ' is'} low on stock!`;
    }
  
    if (alertMessage) {
      setAlert({ message: alertMessage.trim(), type: outOfStockCount > 0 ? 'error' : 'warning', isVisible: true });
    } else {
      setAlert({ message: '', type: '', isVisible: false }); 
    }
  };

  const renderAlert = () => {
    if (!alert.isVisible) return null; 
  
    const alertStyles = alert.type === 'error' 
      ? 'bg-red-500 text-white' 
      : 'bg-orange-500 text-white';
    
    const icon = alert.type === 'error' 
      ? <FontAwesomeIcon icon={faTimesCircle} className="mr-2" /> 
      : <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />;
  
    return (
      <div className={`fixed top-4 right-4 p-4 rounded shadow-lg flex items-center ${alertStyles}`}>
        {icon}
        {alert.message}
      </div>
    );
  };  

  return (
    <div className='flex-1 bg-white overflow-auto h-full'>
      <div className="p-7">
        {renderAlert()}
        <h1 className="text-6xl text-center mt-2 font-bold text-black">Utensils Inventory</h1>
        <h3 className="text-lg md:text-base bg-main-green rounded-lg text-white mb-4 text-center mt-4 md:mt-8 font-semibold">
          ENJOY BROWSING
        </h3>
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search by Name..."
            className="border rounded-md p-2 pl-10 w-full focus:outline-none focus:ring-1 focus:ring-main-honey shadow-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-3 top-3 text-gray-400">
            <FaSearch />
          </div>
        </div>
        <table className="min-w-full bg-[#DDB04B] border border-gray-200 shadow-md mt-8 rounded-lg overflow-hidden">
          <thead>
            <tr>
              <td colSpan="2" className="text-white text-left p-4">
                <span className="text-xl font-bold">Utensils</span>
              </td>
              <td colSpan="2" className="text-right p-4">
                <button 
                  onClick={handleOpenModal} 
                  className="bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors mr-2"
                >
                  + Add Utensil Stock
                </button>

                <button 
                  onClick={handleToggleDeleteMode} 
                  className={`bg-${deleteMode ? 'red-500' : 'red-600'} hover:bg-${deleteMode ? 'red-600' : '[#ff4d4f]'} text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors`}
                >
                  {deleteMode ? 'Cancel' : 'Delete'}
                </button>

                {deleteMode && (
                  <button 
                    onClick={handleConfirmDelete} 
                    className="ml-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors"
                  >
                    Confirm Delete
                  </button>
                )}
              </td>
            </tr>
            <tr className="bg-[#DDB04B] text-white">
              <th className="py-3 px-6 text-center">Util ID</th>
              <th className="py-3 px-6 text-center">Name</th>
              <th className="py-3 px-6 text-center">Quantity</th>
              <th className="py-3 px-6 text-center">Stock Status</th>
              {deleteMode && <th className="py-3 px-6 text-center">Select</th>}
            </tr>
          </thead>
          <tbody>
            {filteredUtensils.length > 0 ? (
              filteredUtensils.map((utensil, index) => (
                <tr
                  key={utensil.id}
                  className={`${index % 2 === 0 ? 'bg-[#f9f9f9]' : 'bg-white'} hover:bg-gray-200 hover:text-pink-500 transition-colors`}
                >
                  <td className="py-3 px-6 border-b text-center">{utensil.id}</td>
                  <td className="py-3 px-6 border-b text-center">{utensil.name}</td>
                  <td className="py-3 px-6 border-b text-center">{utensil.stocks}</td>
                  <td className="py-3 px-6 border-b text-center">{getStockStatus(utensil.stocks)}</td>
                  {deleteMode && (
                    <td className="py-3 px-6 border-b text-center">
                      <input
                        type="checkbox"
                        checked={itemsToDelete.includes(utensil.id)}
                        onChange={() => handleSelectItem(utensil.id)}
                      />
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={deleteMode ? "5" : "4"} className="text-center text-red-500 py-8">
                  No utensils available.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white p-5 rounded-3xl shadow-md">
              <h2 className="text-xl font-bold mb-8 text-main-honey text-center">Add or Update Item</h2>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Stock Type</label>
                <select
                  className="border rounded-lg p-2 w-full shadow-md focus:outline-none focus:ring-2 focus:ring-[#DDB04B] transition-shadow"
                  value={productType}
                  onChange={(e) => {
                    const type = e.target.value;
                    setProductType(type);
                    setNewUtensilName(''); 
                    setOldUtensilStock(0);
                  }}
                >
                  <option value="New Product">New Stock</option>
                  <option value="Old Product">Old Stock</option>
                </select>
              </div>

              {productType === "New Product" && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Utensil Name</label>
                  <input
                    type="text"
                    className="border rounded-lg p-2 w-full shadow-md focus:outline-none focus:ring-2 focus:ring-[#DDB04B] transition-shadow"
                    placeholder="Enter utensil name"
                    value={newUtensilName}
                    onChange={(e) => setNewUtensilName(e.target.value)}
                  />
                </div>
              )}

              {productType === "Old Product" && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Select Utensil</label>
                  <select
                    className="border rounded-lg p-2 w-full shadow-md focus:outline-none focus:ring-2 focus:ring-[#DDB04B] transition-shadow"
                    value={newUtensilName}
                    onChange={(e) => {
                      const selectedUtensil = e.target.value;
                      setNewUtensilName(selectedUtensil);
                      setOldUtensilStock(utensils.find(u => u.name === selectedUtensil)?.stocks || 0);
                    }}
                  >
                    <option value="">Select Utensil</option>
                    {utensils.map((utensil) => (
                      <option key={utensil.id} value={utensil.name}>{utensil.name}</option>
                    ))}
                  </select>
                  {newUtensilName && (
                    <div className="mt-2 text-gray-600">
                      Current Stock: {oldUtensilStock}
                    </div>
                  )}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Quantity</label>
                <input
                  type="number"
                  className="border rounded-lg p-2 w-full shadow-md focus:outline-none focus:ring-2 focus:ring-[#DDB04B] transition-shadow"
                  placeholder="Enter quantity"
                  value={newUtensilQuantity}
                  onChange={(e) => setNewUtensilQuantity(e.target.value)}
                />
              </div>
              <div className='flex items-center justify-center mt-6'>
                <button onClick={handleSaveNewItem} className="bg-teal-600 hover:bg-teal-800 text-white py-2 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-[#DDB04B] transition-shadow mr-2">
                {updateMode ? 'Update' : 'Save'}
                </button>
                <button onClick={handleCloseModal} className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-[#DDB04B] transition-shadow">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
    
  );
};

export default Utensils;