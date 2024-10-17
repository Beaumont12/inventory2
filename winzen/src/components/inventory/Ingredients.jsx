import React, { useState, useEffect } from 'react';
import { FaSearch, FaPencilAlt, FaTrash } from 'react-icons/fa'; 
import { getDatabase, remove, ref, onValue, update, get, push } from "firebase/database";
import { db } from '../../../firebaseConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const Ingredients = () => {
  const [ingredients, setIngredients] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addStock, setAddStock] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientStocks, setNewIngredientStocks] = useState('');
  const [curveCount, setCurveCount] = useState('');

  useEffect(() => {
    const ingredientsRef = ref(db, 'stocks/Ingredients/Curve');
    onValue(ingredientsRef, (snapshot) => {
      const data = snapshot.val();
      setIngredients(data || {});
      checkStockLevels(data || {});
    });

    const curveCountRef = ref(db, 'stocks/Ingredients/curveCount');
    const unsubscribe = onValue(curveCountRef, (snapshot) => {
      const count = snapshot.val();
      setCurveCount(count || 0);
    });

    return () => {
      unsubscribe(); 
    };
  }, []);

  const getStockStatus = (stock) => {
    if (stock === 0) {
      return { status: 'Out of Stock', color: 'text-red-500' };
    } else if (stock > 0 && stock <= 10) {
      return { status: 'Low Stock', color: 'text-yellow-500' };
    } else {
      return { status: 'In Stock', color: 'text-green-500' };
    }
  };

  const logStockHistory = async (itemName, action, quantityChange) => {
    const historyRef = ref(db, 'stocksHistory'); // Use the db instance imported from your config

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
        await push(historyRef, newEntry); // Push the new entry to the stocksHistory node
        console.log(`Logged: ${action} ${quantityChange} of ${itemName} on ${currentDate}`); // Log the action
    } catch (error) {
        console.error("Error logging stock history: ", error); // Log error if pushing fails
    }
  };

  const handleDecrementStock = async (key, currentStock) => { // Added async here
    const newStock = currentStock > 0 ? currentStock - 1 : 0;
    const updates = {};
    updates[`stocks/Ingredients/Curve/${key}/stocks`] = newStock;

    try {
        // Retrieve the ingredient name from the ingredients state or database
        const ingredientName = ingredients[key]?.name; // Assuming ingredients is your state containing the ingredient data

        // Update the stock in the database
        await update(ref(db), updates); 
        
        // Log the stock history using the ingredient's name
        await logStockHistory(ingredientName, 'Decreased', -1); 

        console.log(`Decremented stock of ${ingredientName} to ${newStock}`);
    } catch (error) {
        console.error("Error decrementing stock: ", error);
    }
  };

  const handleToggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
    setItemsToDelete([]); 
  };

  const handleDeleteIngredient = async (key) => { // Added async here
    const isConfirmed = window.confirm("Are you sure you want to delete this ingredient?");

    if (isConfirmed) {
        const ingredientRef = ref(db, `stocks/Ingredients/Curve/${key}`);

        try {
            const snapshot = await get(ingredientRef); // Await here
            if (snapshot.exists()) {
                const ingredient = snapshot.val();
                const currentStock = ingredient.stocks; // Get the current stock for logging

                await remove(ingredientRef); 
                await logStockHistory(ingredient.name, 'Removed', -currentStock);
                console.log(`Logged removal of ${ingredient.name} with quantity ${-currentStock}`); // Log history entry

                setIngredients((prevIngredients) => {
                    const updatedIngredients = { ...prevIngredients };
                    delete updatedIngredients[key];
                    return updatedIngredients;
                });
            } else {
                console.error("Ingredient not found for deletion.");
            }
        } catch (error) {
            console.error("Error fetching ingredient for deletion: ", error);
        }
    }
  };  

  const filteredIngredients = Object.entries(ingredients).filter(([key, ingredient]) =>
    key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openUpdateModal = (ingredient) => {
    setSelectedIngredient({ id: ingredient.id, name: ingredient.name, stocks: ingredient.stocks });
    setAddStock(0); 
    setIsModalOpen(true);
  };

  const handleUpdateIngredient = async () => { // Added async here
    if (!selectedIngredient) return;

    const confirmed = window.confirm(
        `Are you sure you want to add ${addStock} to ${selectedIngredient.name}'s stock?`
    );

    if (!confirmed) return; // If the user cancels, exit the function

    const updates = {
        stocks: selectedIngredient.stocks + parseInt(addStock, 10), // Update the stock with added value
    };

    try {
        await update(ref(db, `stocks/Ingredients/Curve/${selectedIngredient.id}`), updates); // Await here
        await logStockHistory(selectedIngredient.name, 'Restocked', +(parseInt(addStock, 10)));
        console.log(`Logged restock of ${selectedIngredient.name} with quantity ${+parseInt(addStock, 10)}`); // Log history entry

        setIngredients((prevIngredients) => ({
            ...prevIngredients,
            [selectedIngredient.id]: {
                ...prevIngredients[selectedIngredient.id],
                ...updates,
            },
        }));
        setIsModalOpen(false);
        setSelectedIngredient(null);
        setAddStock(0);
    } catch (error) {
        console.error("Error updating ingredient: ", error);
    }
  }; 
  
  const openAddModal = () => setIsAddModalOpen(true);

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setNewIngredientName('');
    setNewIngredientStock('');
  };
  
  const handleAddNewIngredient = async () => { // Added async here
    if (!newIngredientName || !newIngredientStocks) {
        alert("Please fill in both the ingredient name and stock.");
        return;
    }

    const newIngredientId = `Curve_${curveCount + 1}`;

    const newIngredient = {
        name: newIngredientName,
        stocks: parseInt(newIngredientStocks, 10),
    };

    const updates = {};
    updates[`stocks/Ingredients/Curve/${newIngredientId}`] = newIngredient;
    updates[`stocks/Ingredients/curveCount`] = curveCount + 1;

    try {
        await update(ref(db), updates);
        await logStockHistory(newIngredient.name, 'Added', +(newIngredient.stocks));
        console.log(`Logged addition of ${newIngredient.name} with quantity ${+newIngredient.stocks}`); // Log history entry

        setIngredients((prevIngredients) => ({
            ...prevIngredients,
            [newIngredientId]: newIngredient,
        }));

        setIsAddModalOpen(false);
        setNewIngredientName('');
        setNewIngredientStocks(0);
    } catch (error) {
        console.error("Error updating the database: ", error);
    }
  };

  const [alert, setAlert] = useState({ message: '', type: '', isVisible: false });

  const checkStockLevels = (curveIngredients) => {
    if (!curveIngredients || typeof curveIngredients !== 'object') return;
  
    let outOfStockCount = 0;
    let lowStockCount = 0;
  
    // Convert curveIngredients object to an array of ingredient objects
    const ingredientArray = Object.values(curveIngredients);
  
    ingredientArray.forEach((ingredient) => {
      if (ingredient.stocks === 0) {
        outOfStockCount++;
      } else if (ingredient.stocks < 40) {
        lowStockCount++;
      }
    });
  
    let alertMessage = '';
    if (outOfStockCount > 0) {
      alertMessage += `${outOfStockCount} Ingredient${outOfStockCount > 1 ? 's are' : ' is'} out of stock! `;
    }
    if (lowStockCount > 0) {
      alertMessage += `${lowStockCount} Ingredient${lowStockCount > 1 ? 's are' : ' is'} low on stock!`;
    }
  
    // Set alert state based on stock levels
    if (alertMessage) {
      setAlert({
        message: alertMessage.trim(),
        type: outOfStockCount > 0 ? 'error' : 'warning',
        isVisible: true,
      });
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
        <h1 className="text-6xl text-center mt-2 font-bold text-black">Ingredients Inventory</h1>
        <h3 className="text-lg md:text-base bg-main-green rounded-lg text-white mb-4 text-center mt-4 md:mt-8 font-semibold">ENJOY BROWSING</h3>
        <div className="relative mb-4">
          <input type="text" placeholder="Search by ID or Name..." className="border rounded-lg p-2 pl-10 w-full focus:outline-none focus:ring-1 focus:ring-main-honey shadow-md" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <div className="absolute left-3 top-3 text-gray-400"> <FaSearch /> </div>
        </div>
        <table className="min-w-full bg-main-honey border border-gray-200 shadow-md mt-8 rounded-lg overflow-hidden">
          <thead>
            <tr className='w-full'>
              <td colSpan='2' className="text-white text-left p-4">
                <span className="text-xl font-bold">Curve</span>
              </td>
              <td colSpan='3' className="text-end p-4">
                <button onClick={openAddModal} className="bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors mr-2">+ Add New Item
                </button>
                <button onClick={handleToggleDeleteMode} className={`bg-${deleteMode ? 'red-700' : 'red-700'} hover:bg-${deleteMode ? 'red-600' : '[#ff4d4f]'} text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors`}>
                  {deleteMode ? 'Cancel' : 'Delete'}
                </button>
              </td>
            </tr>
            <tr className="bg-[#DDB04B] text-white">
              <th className="py-3 px-6 text-center">Item ID</th>
              <th className="py-3 px-6 text-center">Name</th>
              <th className="py-3 px-6 text-center">Quantity</th>
              <th className="py-3 px-6 text-center">Stock Status</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIngredients.length > 0 ? (
              filteredIngredients.map(([key, ingredient], index) => {
                const { status, color } = getStockStatus(ingredient.stocks);
                return (
                  <tr key={key} className={`${index % 2 === 0 ? 'bg-[#f9f9f9]' : 'bg-white'} hover:bg-gray-200 hover:text-pink-500 transition-colors`}>
                    <td className="py-3 px-6 border-b text-center whitespace-nowrap">{key}</td>
                    <td className="py-3 px-6 border-b text-center whitespace-nowrap">{ingredient.name}</td>
                    <td className="py-3 px-6 border-b text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <span>{ingredient.stocks}</span>
                        <button onClick={() => handleDecrementStock(key, ingredient.stocks)} className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition" aria-label="Decrement stock" > &minus; </button>
                      </div>
                    </td>
                    <td className={`py-3 px-6 border-b text-center whitespace-nowrap ${color}`}>{status}</td>
                    <td className="py-3 px-6 border-b text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button onClick={() => openUpdateModal({ id: key, name: ingredient.name, stocks: ingredient.stocks })} className="text-blue-500"> <FaPencilAlt />
                        </button>
                        {deleteMode && (
                          <button onClick={() => handleDeleteIngredient(key)} className={`text-red-500 ${itemsToDelete.includes(key) ? 'font-bold' : ''}`}><FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="text-center text-red-500 py-8">
                  No ingredients available.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Update Ingredient Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white p-5 rounded-3xl shadow-md">
              <h2 className="text-xl mb-8 text-center font-bold text-main-honey">Update Ingredient Stock</h2>
              <div className="mb-4">
                <span className="font-bold text-lg text-main-green">{selectedIngredient?.name}</span>
              </div>
              <div className="flex mb-4 justify-between">
              <label className='text-sm'>Current Stocks:
                <input type="number" value={selectedIngredient?.stocks} className="border rounded-lg p-2 w-full mb-4 text-main-honey shadow-lg"/>
              </label>
              </div>
              <label className='text-sm'>Add Stock:
                <input type="number" value={addStock} onChange={(e) => setAddStock(e.target.value)} className="border rounded-lg p-2 w-full mb-6 shadow-lg"/>
              </label>
              <div className="flex justify-end">
                <button onClick={handleUpdateIngredient} className="bg-green-500 text-white py-2 px-4 rounded-md mr-2 shadow-lg">Update</button>
                <button onClick={() => setIsModalOpen(false)} className="bg-red-500 text-white py-2 px-4 rounded-md shadow-lg">Cancel</button>
              </div>
            </div>
          </div>
        )}
        {isAddModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-5 rounded-3xl shadow-md w-1/4">
            <h2 className="text-xl mb-8 text-center font-bold text-main-honey">Add New Ingredient</h2>
            <div className="mb-4">
              <label className='text-sm'>Ingredient Name:
                <input type="text" value={newIngredientName} onChange={(e) => setNewIngredientName(e.target.value)} className="border rounded-lg p-2 w-full mb-4 shadow-lg"/>
              </label>
            </div>
            <div className="mb-4">
              <label className='text-sm'>Initial Stock:
                <input type="number" value={newIngredientStocks} onChange={(e) => setNewIngredientStocks(e.target.value)} className="border rounded-lg p-2 w-full shadow-lg mb-4"/>
              </label>
            </div>
            <div className="flex justify-end">
              <button onClick={handleAddNewIngredient} className="bg-green-500 text-white py-2 px-4 rounded-md mr-2 shadow-lg">Add Ingredient</button>
              <button onClick={closeAddModal} className="bg-red-500 text-white py-2 px-4 rounded-md shadow-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Ingredients;