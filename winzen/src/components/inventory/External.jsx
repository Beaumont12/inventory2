import React, { useState, useEffect } from 'react';
import { FaPencilAlt, FaTrash, FaSearch } from 'react-icons/fa';
import { ref, onValue, remove, set, update, get, push } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const External = () => {
    const [ingredients, setIngredients] = useState({
        Cakes: [],
        Cookies: [],
        Bread: []
      });
    const [filteredIngredients, setFilteredIngredients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteMode, setDeleteMode] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [itemsToDelete, setItemsToDelete] = useState([]);
    const [newIngredient, setNewIngredient] = useState({category: ''});
    const [newIngredientName, setNewIngredientName] = useState('');
    const [newIngredientStocks, setNewIngredientStocks] = useState('');
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateIngredient, setUpdateIngredient] = useState({ name: '', stocks: 0 });
    const [sortOption, setSortOption] = useState('id-asc');

    useEffect(() => {
        const ingredientsRef = ref(db, 'stocks/Ingredients');
        
        const unsubscribe = onValue(ingredientsRef, (snapshot) => {
          const data = snapshot.val();
          
          if (data) {
            const filteredData = Object.entries(data)
              .filter(([key]) => !['Curve', 'curveCount', 'breadCount', 'cookiesCount', 'cakesCount'].includes(key))
              .reduce((result, [category, ingredients]) => {
                result[category] = ingredients;
                return result;
              }, {});
            
            setIngredients(filteredData);
            const firstCategory = Object.keys(filteredData)[0] || null;
            setActiveCategory(firstCategory);
      
            checkStockLevels(filteredData);
          }
        });
      
        return () => unsubscribe(); 
    }, []);

    const sortIngredients = (ingredientsArray, sortOption) => {
        return ingredientsArray.sort(([keyA, ingredientA], [keyB, ingredientB]) => {
          switch (sortOption) {
            case 'id-asc':
              return keyA.localeCompare(keyB);
            case 'id-desc':
              return keyB.localeCompare(keyA);
            case 'name-asc':
              return ingredientA.name.localeCompare(ingredientB.name);
            case 'name-desc':
              return ingredientB.name.localeCompare(ingredientA.name);
            default:
              return 0;
          }
        });
      };
      

      useEffect(() => {
        if (activeCategory) {
          const items = Object.entries(ingredients[activeCategory] || {}).filter(([key, ingredient]) => {
            return (
              ingredient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              key?.toLowerCase().includes(searchQuery.toLowerCase())
            );
          });
      
          // Apply sorting to the filtered items
          const sortedItems = sortIngredients(items, sortOption);
          setFilteredIngredients(sortedItems);
        }
      }, [activeCategory, searchQuery, ingredients, sortOption]);
      
    const openAddModal = () => {
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setNewIngredientName('');
        setNewIngredientStocks();
        setNewIngredient({ category: '' });
    };

    const closeUpdateModal = () => {
        setShowUpdateModal(false);
        setUpdateIngredient({ name: '', stocks: 0 });
    };

    const openUpdateModal = (ingredient) => {
        console.log("Opening update modal for ingredient:", ingredient);
        setUpdateIngredient({
            id: ingredient.id, 
            name: ingredient.name,
            category: ingredient.category,
            currentWholeStock: ingredient.category === 'Cakes' ? ingredient.stocks.whole : null,
            currentSliceStock: ingredient.category === 'Cakes' ? ingredient.stocks.slice : null,
            currentStocks: ingredient.category !== 'Cakes' ? ingredient.stocks : null,
            stocks: 0
        });
        setShowUpdateModal(true);
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
    
    const handleUpdateIngredient = async () => {
        try {
            const { id, category, stocks, currentWholeStock, currentSliceStock, currentStocks } = updateIngredient;
            const ingredientName = ingredients[category][id].name; // Get the ingredient name
            console.log("Updating stock for Category:", category, "ID:", id, "Name:", ingredientName);
    
            if (!category || !id) {
                console.error("Category or ID is undefined:", category, id);
                return; 
            }
    
            const stocksToUpdate = Number(stocks) || 0;
            let updatedStocks;
    
            if (category === 'Cakes') {
                const newWholeStock = (currentWholeStock || 0) + stocksToUpdate;
                const sliceStockFromWhole = newWholeStock * 8;
    
                updatedStocks = {
                    whole: newWholeStock,
                    slice: sliceStockFromWhole 
                };
            } else {
                updatedStocks = (currentStocks || 0) + stocksToUpdate;
            }
    
            const ingredientRef = ref(db, `stocks/Ingredients/${category}/${id}`);
            console.log('Updating stock at:', ingredientRef.toString());
            console.log('Updated Stocks:', updatedStocks);
    
            await update(ingredientRef, {
                stocks: updatedStocks
            });
    
            // Log the update action in stocks history with the ingredient name
            await logStockHistory(ingredientName, 'Restocked', stocksToUpdate); 
            console.log(`Stock for ${ingredientName} in ${category} restocked by ${stocksToUpdate}.`);
    
            closeUpdateModal();
        } catch (error) {
            console.error("Error updating ingredient:", error);
        }
    };           

    const handleToggleDeleteMode = () => {
        setDeleteMode(!deleteMode);
        setItemsToDelete([]);
    };

    const handleDeleteIngredient = async (key) => {
        const isConfirmed = window.confirm(`Are you sure you want to delete ${key}?`);
    
        if (isConfirmed) {
            let categoryToDeleteFrom;
            let ingredientName; // Variable to store the ingredient name
    
            for (const category in ingredients) {
                if (ingredients[category][key]) {
                    categoryToDeleteFrom = category;
                    ingredientName = ingredients[category][key].name; // Get the ingredient name
                    break;
                }
            }
    
            if (categoryToDeleteFrom) {
                const ingredientRef = ref(db, `stocks/Ingredients/${categoryToDeleteFrom}/${key}`);
    
                try {
                    // First, retrieve the ingredient to get its current stock
                    const snapshot = await get(ingredientRef);
                    if (snapshot.exists()) {
                        const ingredient = snapshot.val();
                        const currentStock = ingredient.stocks; // Get the current stock for logging
    
                        await remove(ingredientRef);
                        console.log(`Ingredient ${ingredientName} deleted from ${categoryToDeleteFrom}.`); 
    
                        setIngredients((prevIngredients) => {
                            const updatedIngredients = { ...prevIngredients };
                            delete updatedIngredients[categoryToDeleteFrom][key];
    
                            if (Object.keys(updatedIngredients[categoryToDeleteFrom]).length === 0) {
                                delete updatedIngredients[categoryToDeleteFrom]; 
                            }
                            
                            return updatedIngredients; 
                        });
    
                        // Log the deletion action with the ingredient name
                        await logStockHistory(ingredientName, 'Removed', -currentStock);
                    } else {
                        console.error(`Ingredient ${key} not found for deletion.`);
                    }
                } catch (error) {
                    console.error("Error processing ingredient for deletion: ", error);
                }
            } else {
                console.error(`Ingredient ${key} not found in any category.`);
            }
        }
    };   

    const handleCategoryChange = (category) => {
        setActiveCategory(category);
    };

    const handleAddNewIngredient = async () => {
        let countKey; let prefix;
        switch (newIngredient.category) {
            case 'Cookies':
                countKey = 'cookiesCount'; prefix = 'CO'; break;
            case 'Cakes':
                countKey = 'cakesCount'; prefix = 'CA'; break;
            case 'Bread':
                countKey = 'breadCount'; prefix = 'B'; break;
            default:
                countKey = null;
        }
    
        if (countKey) {
            const countRef = ref(db, `stocks/Ingredients/${countKey}`);
            
            // Using get to fetch the current count
            const snapshot = await get(countRef);
            let currentCount = snapshot.val() || 0; 
            const newIngredientID = currentCount + 1;
            const dynamicID = `${prefix}${newIngredientID}`;
    
            const newIngredientData = {
                name: newIngredientName,
                stocks: newIngredient.category === 'Cakes' ? { whole: newIngredientStocks, slice: newIngredientStocks * 8 } : newIngredientStocks,
            };
    
            const newIngredientRef = ref(db, `stocks/Ingredients/${newIngredient.category}/${dynamicID}`);
    
            try {
                await set(newIngredientRef, newIngredientData);
                await set(countRef, newIngredientID);
    
                // Log the addition action with the ingredient name
                await logStockHistory(newIngredientName, 'Added', newIngredientData.stocks);
                closeAddModal();
            } catch (error) {
                console.error('Error adding new ingredient or updating count:', error);
            }
        }
    };    
  
    const getStockStatus = (stock, category = '') => {
        if (category === 'Cakes' && typeof stock === 'object' && stock.whole !== undefined) {
        const wholeStock = stock.whole;
        if (wholeStock === 0) { return { status: 'Out of Stock', color: 'text-red-500' };
        } else if (wholeStock > 0 && wholeStock <= 2) { return { status: 'Low Stock', color: 'text-yellow-500' };
        } else { return { status: 'In Stock', color: 'text-green-500' }; }
        }

        if (stock === 0) { return { status: 'Out of Stock', color: 'text-red-500' };
        } else if (stock > 0 && stock <= 10) { return { status: 'Low Stock', color: 'text-yellow-500' };
        } else { return { status: 'In Stock', color: 'text-green-500' }; }
    };

    const [alert, setAlert] = useState({ message: '', type: '', isVisible: false });

    const checkStockLevels = (allIngredients) => {
        if (!allIngredients || typeof allIngredients !== 'object') return;
      
        let outOfStockCount = 0;
        let lowStockCount = 0;
      
        // Iterate over all categories and their ingredients
        Object.entries(allIngredients).forEach(([category, ingredients]) => {
          const ingredientArray = Object.values(ingredients);
      
          ingredientArray.forEach((ingredient) => {
            const { status } = getStockStatus(ingredient.stocks, category);
      
            if (status === 'Out of Stock') {
              outOfStockCount++;
            } else if (status === 'Low Stock') {
              lowStockCount++;
            }
          });
        });
      
        let alertMessage = '';
        if (outOfStockCount > 0) {
          alertMessage += `${outOfStockCount} ingredient${outOfStockCount > 1 ? 's are' : ' is'} out of stock! `;
        }
        if (lowStockCount > 0) {
          alertMessage += `${lowStockCount} ingredient${lowStockCount > 1 ? 's are' : ' is'} low on stock!`;
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
        <div className="m-7">
        {renderAlert()}
            <h1 className="text-6xl text-center mt-2 font-bold text-black">External Inventory</h1>
            <h3 className="text-lg md:text-base bg-main-green rounded-lg text-white mb-4 text-center mt-4 md:mt-8 font-semibold">ENJOY BROWSING</h3>
            {/* Search Input */}
            <div className="flex justify-between items-center mb-4">
            {/* Search Input */}
            <div className="relative w-4/5">
                <input
                type="text"
                placeholder="Search by ID or Name..."
                className="border rounded-lg p-2 pl-10 w-full focus:outline-none focus:ring-1 focus:ring-main-honey shadow-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-3 top-3 text-gray-400">
                <FaSearch />
                </div>
            </div>
            
            {/* Sorting Dropdown */}
            <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="border rounded-lg p-2 shadow-md focus:outline-none focus:ring-1 focus:ring-main-honey w-56"
            >
                <option value="id-asc">Sort by ID (Ascending)</option>
                <option value="id-desc">Sort by ID (Descending)</option>
                <option value="name-asc">Sort by Name (Ascending)</option>
                <option value="name-desc">Sort by Name (Descending)</option>
            </select>
            </div>
            {/* Category Toggle Buttons */}
            <div className="flex justify-center space-x-4 mb-4">
            {Object.keys(ingredients).map(category => (
                <button key={category} onClick={() => handleCategoryChange(category)} className={`py-2 px-4 rounded-md ${activeCategory === category ? 'bg-main-honey text-white' : 'bg-gray-200'}`} >{category} </button>
            ))}
            </div>
            <table className="min-w-full bg-main-honey border border-gray-200 shadow-md mt-8 rounded-lg overflow-hidden">
            <thead>
                <tr className="w-full">
                <td colSpan="3" className="text-white text-left p-4">
                    <span className="text-xl font-bold">External Items</span>
                </td>
                <td colSpan="3" className="text-end p-4">
                    <button onClick={openAddModal} className="bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors mr-2">+ Add New Item</button>
                    <button onClick={handleToggleDeleteMode} className={`bg-${deleteMode ? 'red-700' : 'red-700'} hover:bg-${deleteMode ? 'red-600' : '[#ff4d4f]'} text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors`}>
                    {deleteMode ? 'Cancel' : 'Delete'}
                    </button>
                </td>
                </tr>
                <tr className="bg-[#DDB04B] text-white">
                <th className="py-3 px-6 text-center">Item ID</th>
                <th className="py-3 px-6 text-center">Name</th>
                {activeCategory === 'Cakes' && filteredIngredients.length > 0 && (
                    <>
                    <th className="py-3 px-6 text-center">Slice</th>
                    <th className="py-3 px-6 text-center">Whole</th>
                    </>
                )}
                {activeCategory !== 'Cakes' && (
                    <th className="py-3 px-6 text-center">Stocks</th>
                )}
                <th className="py-3 px-6 text-center">Stock Status</th>
                <th className="py-3 px-6 text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                {filteredIngredients.length > 0 ? (
                filteredIngredients.map(([key, ingredient], index) => {
                    const category = activeCategory;
                    const { status, color } = getStockStatus(ingredient.stocks || { slice: 0, whole: 0 });
                    const sliceStock = ingredient.stocks?.slice ?? 0;
                    const wholeStock = ingredient.stocks?.whole ?? 0;
                    const genStock = typeof ingredient.stocks === 'number' ? ingredient.stocks : 0;

                    return (
                    <tr key={key} className={`${index % 2 === 0 ? 'bg-[#f9f9f9]' : 'bg-white'} hover:bg-gray-200 hover:text-pink-500 transition-colors`}>
                        <td className="py-3 px-6 border-b text-center whitespace-nowrap">{key}</td>
                        <td className="py-3 px-6 border-b text-center whitespace-nowrap">{ingredient.name}</td>
                        {activeCategory === 'Cakes' && (
                        <>
                            <td className="py-3 px-6 border-b text-center whitespace-nowrap">{sliceStock}</td>
                            <td className="py-3 px-6 border-b text-center whitespace-nowrap">{wholeStock}</td>
                        </>
                        )}
                        {activeCategory !== 'Cakes' && (
                        <td className="py-3 px-6 border-b text-center whitespace-nowrap">{genStock}</td>
                        )}
                        <td className={`py-3 px-6 border-b text-center ${color}`}>{status}</td>
                        <td className="py-3 px-6 border-b text-center space-x-2">
                        <button onClick={() => openUpdateModal({ id: key, category, ...ingredient })} className="text-blue-600">
                            <FaPencilAlt />
                        </button>
                        {deleteMode && (
                            <button onClick={() => handleDeleteIngredient(key)} className="text-red-600">
                            <FaTrash />
                            </button>
                        )}
                        </td>
                    </tr>
                    );
                })
                ) : (
                <tr>
                    <td colSpan={activeCategory === 'Cakes' ? (deleteMode ? '6' : '5') : (deleteMode ? '5' : '4')} className="text-center text-red-500 py-8">
                    No external items available.
                    </td>
                </tr>
                )}
            </tbody>
            </table>

        </div>
        {showUpdateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                    <h2 className="text-lg font-bold mb-4 text-center text-main-honey">Update Item</h2>
                    <div className="mb-4">
                        <label className="block mb-1">Name</label>
                        <input disabled type="text" value={updateIngredient.name} onChange={(e) => setUpdateIngredient({ ...updateIngredient, name: e.target.value })}  className="border rounded-lg p-2 w-full mb-2 shadow-lg" />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1"> {updateIngredient.category === 'Cakes' ? 'Current Whole Stock' : 'Current Stocks'} </label>
                        <p className="mb-2 text-gray-600">
                            {updateIngredient.category === 'Cakes' ? 
                                `Whole: ${updateIngredient.currentWholeStock || 0}, Slice: ${updateIngredient.currentSliceStock || 0}` : 
                                `Current: ${updateIngredient.currentStocks || 0}`
                            }
                        </p>
                        <label className="block mb-1"> {updateIngredient.category === 'Cakes' ? 'Add Whole Stock' : 'Add Stocks'} </label>
                        <input type="number" value={updateIngredient.stocks} onChange={(e) => setUpdateIngredient({ ...updateIngredient, stocks: e.target.value })}  className="border rounded-lg p-2 w-full mb-2 shadow-lg" />
                    </div>
                    <div className="flex justify-end">
                        <button onClick={closeUpdateModal} className="bg-gray-300 text-black font-bold py-2 px-4 rounded-md mr-2">Cancel</button>
                        <button onClick={handleUpdateIngredient} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md">Update</button>
                    </div>
                </div>
            </div>
        )}

        {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                    <h2 className="text-lg font-bold mb-4 text-center text-main-honey">Add New Item</h2>
                    <div className="mb-4">
                        <label className="block mb-1">Name</label>
                        <input type="text" value={newIngredientName} onChange={(e) => setNewIngredientName(e.target.value)} className="border rounded-lg p-2 w-full shadow-lg"/>
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1">Category</label>
                        <select value={newIngredient.category} onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 shadow-lg">
                            <option value="">Select a category</option>
                            {Object.keys(ingredients).map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1">
                            {newIngredient.category === 'Cakes' ? 'Whole Stock' : 'Stocks'}
                        </label>
                        <input type="number" value={newIngredientStocks} onChange={(e) => setNewIngredientStocks(Number(e.target.value))} className="border rounded-lg p-2 w-full shadow-lg mb-4"/>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={closeAddModal} className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md shadow-md transition-colors mr-2" > Cancel</button>
                        <button onClick={handleAddNewIngredient} className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md shadow-md transition-colors" >Add Ingredient</button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
};

export default External;