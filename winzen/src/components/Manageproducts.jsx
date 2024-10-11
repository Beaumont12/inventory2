import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, update, set, remove } from 'firebase/database'; 
import { app } from '../../firebaseConfig'; 
import { FaSearch, FaTimesCircle } from 'react-icons/fa';
import { getIndexedDB, setIndexedDB, deleteIndexedDB } from '../utils/indexedDB'; 

const Manageproducts = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const [showModal, setShowModal] = useState(false);
  const [newHotSize, setNewHotSize] = useState('');
  const [newHotPrice, setNewHotPrice] = useState('');
  const [newIcedSize, setNewIcedSize] = useState('');
  const [newIcedPrice, setNewIcedPrice] = useState('');
  const [searchTerm, setSearchTerm] = useState('')
  const addHotVariation = () => {
    if (!newHotSize || !newHotPrice) return;
    const updatedProduct = { ...selectedProduct, Variations: { ...selectedProduct.Variations, temperature: { ...selectedProduct.Variations.temperature, hot: { ...(selectedProduct.Variations.temperature?.hot || {}),
            [newHotSize]: Number(newHotPrice),
          },
        },
      },
    };
    console.log('Updated Hot Variation:', updatedProduct);
    setSelectedProduct(updatedProduct);
    setNewHotSize(''); 
    setNewHotPrice('');
  };
  
  const addIcedVariation = () => {
    if (!newIcedSize || !newIcedPrice) return;
    const updatedProduct = { ...selectedProduct, Variations: { ...selectedProduct.Variations, temperature: { ...selectedProduct.Variations.temperature, iced: { ...(selectedProduct.Variations.temperature?.iced || {}),
            [newIcedSize]: Number(newIcedPrice),
          },
        },
      },
    };
    console.log('Updated Iced Variation:', updatedProduct);
    setSelectedProduct(updatedProduct);
    setNewIcedSize('');
    setNewIcedPrice(''); 
  };
  
  const initializeHotVariation = () => {
    setSelectedProduct(prev => ({ ...prev, Variations: { ...prev.Variations, temperature: { ...prev.Variations.temperature,
          hot: {},
        },
      },
    }));
  };
  
  const initializeIcedVariation = () => {
    setSelectedProduct(prev => ({ ...prev, Variations: { ...prev.Variations, temperature: { ...prev.Variations.temperature,
          iced: {}, 
        },
      },
    }));
  };   

  useEffect(() => {
    const fetchData = async () => {
      const db = getDatabase(app);
  
      // Check if products and categories are already in IndexedDB
      const storedProducts = await getIndexedDB('products', 'allProducts');
      const storedCategories = await getIndexedDB('categories', 'allCategories');
  
      if (storedProducts) {
        setProducts(storedProducts);
        setFilteredProducts(storedProducts);
      }
  
      if (storedCategories) {
        setCategories(storedCategories);
      }
  
      // Fetch categories from Firebase if not in IndexedDB
      const categoriesRef = ref(db, 'categories');
      onValue(categoriesRef, (snapshot) => {
        const data = snapshot.val();
        const categoryList = Object.values(data);
  
        // Update state and IndexedDB
        setCategories(categoryList);
        setIndexedDB('categories', 'allCategories', categoryList);
      });
  
      // Fetch products from Firebase if not in IndexedDB
      const productsRef = ref(db, 'products');
      onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        const productList = Object.keys(data).map((key) => ({
          ...data[key],
          id: key,
        }));
  
        // Update state and IndexedDB
        setProducts(productList);
        setFilteredProducts(productList);
        setIndexedDB('products', 'allProducts', productList);
      });
    };
  
    fetchData();
  }, []);  

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    if (category === 'All') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => product.Category === category);
      setFilteredProducts(filtered);
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product); 
    setShowModal(true); 
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
  
    if (name === "price") {
      setSelectedProduct((prevProduct) => ({ ...prevProduct, Variations: { ...prevProduct.Variations, price: Number(value), },
      }));
    } else {
      const [type, size] = name.split('_');
  
      setSelectedProduct((prevProduct) => {
        const updatedVariations = { ...prevProduct.Variations };

        if (type === 'hot') {
          updatedVariations.temperature.hot = { ...updatedVariations.temperature.hot, [size]: Number(value), };
        } else if (type === 'iced') {
          updatedVariations.temperature.iced = { ...updatedVariations.temperature.iced, [size]: Number(value), };
        }
  
        return { ...prevProduct, Variations: updatedVariations, };
      });
    }
  };

  const handleUpdateProduct = () => {
    const db = getDatabase(app);
    const productRef = ref(db, `products/${selectedProduct.id}`);
  
    console.log('Selected Product:', selectedProduct);
    console.log('Product ID:', selectedProduct.id);
    
    set(productRef, {
      Name: selectedProduct.Name,
      Category: selectedProduct.Category,
      Description: selectedProduct.Description,
      imageURL: selectedProduct.imageURL,
      stockStatus: selectedProduct.stockStatus,
      Variations: selectedProduct.Variations,  
    })
      .then(() => {
        setShowModal(false); 
        alert('Product updated successfully');
      })
      .catch((error) => {
        console.error("Error updating product: ", error);
      });
  };  

  const handleRemoveProduct = async (productId) => {
    const isConfirmed = window.confirm("Are you sure you want to delete this product?");
  
    if (!isConfirmed) {
      return; 
    }
  
    try {
      const db = getDatabase(app);
      const productRef = ref(db, `products/${productId}`);
      await remove(productRef);
  
      await deleteIndexedDB('products', productId);
  
      setProducts((prevProducts) => prevProducts.filter((product) => product.id !== productId));
      setFilteredProducts((prevFilteredProducts) => prevFilteredProducts.filter((product) => product.id !== productId));
  
      console.log(`Product ${productId} removed successfully`);
    } catch (error) {
      console.error('Error removing product:', error);
    }
  };  

  return (
    <div className='p-7'>
      <h1 className="text-6xl text-center text-black font-bold mt-2">Manage Category</h1>
      <h3 className="text-lg md:text-base text-center rounded-lg text-white mt-4 md:mt-8 font-semibold bg-main-green">EDIT ONLY WHEN NECESSARY</h3>
      {/* Search Bar */}
      <div className="mt-4 relative">
        <input type="text" placeholder="Search by product name, size, or price..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="p-2 pl-10 border border-gray-300 rounded-lg shadow-lg w-full focus:outline-none focus:ring-1 focus:ring-main-honey"/>
        <div className="absolute left-3 top-3 text-gray-400 items-end">
            <FaSearch />
        </div>
      </div>
     <div className="container mx-auto py-4">
        <div className="flex gap-4 mb-4">
          <button 
            className={`px-4 py-2 rounded ${selectedCategory === 'All' ? 'bg-yellow-500' : 'bg-gray-300'}`} 
            onClick={() => handleCategoryClick('All')}>All</button>
          {categories.map((category, index) => (
            <button 
              key={index} 
              className={`px-4 py-2 rounded ${selectedCategory === category.Name ? 'bg-main-honey' : 'bg-gray-300'}`} 
              onClick={() => handleCategoryClick(category.Name)}>{category.Name}</button>
          ))}
        </div>
        {/* Product Cards */}
        <div className="grid grid-cols-3 gap-6">
        {filteredProducts.filter((product) => {
            const searchLower = searchTerm.toLowerCase();
            return (
              product.Name.toLowerCase().includes(searchLower) ||
              Object.entries(product.Variations?.temperature?.hot || {}).some(([size, price]) =>
                size.toLowerCase().includes(searchLower) || price.toString().includes(searchLower)
              ) ||
              Object.entries(product.Variations?.temperature?.iced || {}).some(([size, price]) =>
                size.toLowerCase().includes(searchLower) || price.toString().includes(searchLower)
              ) ||
              (product.Variations?.price && product.Variations.price.toString().includes(searchLower))
            );
          }).sort((a, b) => a.Name.localeCompare(b.Name)).map((product, index) => (
            <div key={index} className="border relative rounded-lg p-4 shadow-lg bg-white cursor-pointer" onClick={() => handleProductClick(product)}>
              {/* Remove Button at the top-right */}
              <button onClick={(e) => {e.stopPropagation();handleRemoveProduct(product.id);}} className="absolute top-2 right-2 bg-red-600 p-2 rounded-full">
                <FaTimesCircle className="text-white text-xl" />
              </button>
              <img src={product.imageURL} alt={product.Name} className="w-full h-40 object-cover rounded-md mb-4"/>
              <div className='flex justify-between'>
                <h2 className="text-xl text-main-green font-bold">{product.Name}</h2>
                <h2 className='text-xs text-main-honey font-semibold'>{product.id}</h2>
              </div>
              <h3 className='text-mb mb-2 text-main-honey'>{product.Category}</h3>
              <p className="text-gray-600 mb-2 h-10 text-sm">{product.Description}</p>
              {/* Display Prices for Sizes */}
              {product.Variations.temperature && (
              <div className="mb-2 flex justify-center">
              {product.Variations.temperature.hot && (
                <div className="mb-2">
                  <span className="block text-md font-bold text-main-honey mb-2 text-center">Hot</span>
                  {Object.entries(product.Variations.temperature.hot).map(([size, price]) => (
                    <div key={size} className="bg-main-green p-2 rounded-lg mb-2 m-2 w-20">
                      <div className="font-bold text-center text-main-honey">
                        <p className='text-sm text-center'>₱{price}</p>
                      </div>
                      <p className="text-xs text-center text-main-honey">{size}</p>
                    </div>
                  ))}
                </div>
              )}
              {product.Variations.temperature.iced && (
                <div className="mb-2">
                  <span className="block text-md font-bold text-main-honey mb-2 text-center">Iced</span>
                  {Object.entries(product.Variations.temperature.iced).map(([size, price]) => (
                    <div key={size} className="bg-main-green p-2 rounded-lg mb-2 w-20">
                      <div className="font-bold text-center text-main-honey">
                        <p className='text-sm text-center'>₱{price}</p>
                      </div>
                      <p className="text-xs text-center text-main-honey">{size}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>  
            )}
            {product.Variations.price && (
              <div className="text-lg font-semibold text-yellow-500 mb-2 text-center bg-main-green rounded-lg">Price: ₱{product.Variations.price || 'N/A'}</div>
            )}
              {/* Stock Status at the End of the Card */}
              <div className={`text-sm text-center font-extrabold ${product.stockStatus === 'In Stock' ? 'text-green-500' : 'text-red-500'}`}>
                {product.stockStatus}
              </div>
            </div>
          ))}
        </div>
      </div> 
      {/* Modal for Editing Product */}
      {showModal && (
        <div className='fixed inset-0 flex items-center justify-center z-50'>
          {/* Dark Background Overlay */}
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => {}}></div>
          <div className="fixed items-center justify-center w-1/2 h-full bg-white shadow-lg p-6 overflow-auto rounded-lg">
          <div className="flex justify-between items-center mb-4">
            {/* Cancel Button with Icon */}
            <button className="flex items-center bg-red-500 text-white px-4 py-2 rounded-lg" onClick={() => setShowModal(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" iewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 mr-2" >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
              </svg>Cancel</button>
            {/* Edit Product Title */}
            <h2 className="text-3xl font-bold text-main-green -ml-20">EDIT PRODUCT</h2>
            <h2></h2>
          </div>
          {/* Product Name Field */}
          <div className="mb-4">
            <label className="block text-sm font-semibold">Product Name</label>
            <input disabled type="text" name="Name" value={selectedProduct?.Name || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg mb-2 shadow-lg"/>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold">Category</label>
            <input disabled type="text" name="Category" value={selectedProduct?.Category || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg mb-2 shadow-lg"/>
          </div>
          {/* Description Field */}
          <div className="mb-4">
            <label className="block text-sm font-semibold">Description</label>
            <textarea name="Description" value={selectedProduct?.Description || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg mb-2 shadow-lg"/>
          </div>
          {/* Image URL Field */}
          <div className="mb-4">
            <label className="block text-sm font-semibold">Image URL</label>
            <input type="text" name="imageURL" value={selectedProduct?.imageURL || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg mb-2 shadow-lg"/>
          </div>
          {/* Hot Prices Section */}
          {selectedProduct?.Variations?.temperature?.hot ? (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-main-honey">Hot Prices</label>
              {Object.entries(selectedProduct.Variations.temperature.hot).map(([size, price]) => (
                <div key={size} className="flex mb-2">
                  <input type="text" name={`hot_${size}`} value={price || ''} onChange={(e) => handleInputChange(e, size, 'hot')} className="w-full p-2 border rounded-lg shadow-lg"/>
                  <span className="ml-2">{size}</span>
                </div>
              ))} 
              {/* Add New Size and Price for Hot */}
              <div className="flex mb-2">
                <input type="text" placeholder="New Size" name="new_hot_size" value={newHotSize} onChange={(e) => setNewHotSize(e.target.value)} className="w-1/2 p-2 border rounded-lg shadow-lg" />
                <input type="text" placeholder="New Price" name="new_hot_price" value={newHotPrice} onChange={(e) => setNewHotPrice(e.target.value)} className="w-1/2 p-2 border rounded-lg shadow-lg ml-2" />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg ml-2 shadow-lg" onClick={addHotVariation} >Add</button>
              </div>
            </div>
          ) : (
            !selectedProduct?.Variations?.price && (
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg mb-4 shadow-lg" onClick={initializeHotVariation}>Add Hot Variation</button>
            )
          )}
          {/* Iced Prices Section */}
          {selectedProduct?.Variations?.temperature?.iced ? (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-main-honey">Iced Prices</label>
              {Object.entries(selectedProduct.Variations.temperature.iced).map(([size, price]) => (
                <div key={size} className="flex mb-2">
                  <input type="text" name={`iced_${size}`} value={price || ''} onChange={(e) => handleInputChange(e, size, 'iced')} className="w-full p-2 border rounded-lg shadow-lg" />
                  <span className="ml-2">{size}</span>
                </div>
              ))}

              {/* Add New Size and Price for Iced */}
              <div className="flex mb-2">
                <input type="text" placeholder="New Size" name="new_iced_size" value={newIcedSize} onChange={(e) => setNewIcedSize(e.target.value)} className="w-1/2 p-2 border rounded-lg shadow-lg" />
                <input type="text" placeholder="New Price" name="new_iced_price" value={newIcedPrice} onChange={(e) => setNewIcedPrice(e.target.value)} className="w-1/2 p-2 border rounded-lg shadow-lg ml-2" />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg ml-2 shadow-lg" onClick={addIcedVariation} >Add </button>
              </div>
            </div>
          ) : ( 
            !selectedProduct?.Variations?.price && (
              <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg mb-4 shadow-lg" onClick={initializeIcedVariation}>  Add Iced Variation </button>
            )
          )}
          {/* Single Price Section for Products without Temperature Variations */}
          {!selectedProduct?.Variations?.temperature && selectedProduct?.Variations?.price !== undefined && (
          <div className="mb-4">
            <label className="block text-sm font-semibold">Price</label>
            <input type="text" name="price" value={selectedProduct?.Variations?.price || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg shadow-lg" />
          </div>
        )}
          {/* Save Changes Button */}
          <div className="flex justify-end">
            <button className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg" onClick={handleUpdateProduct}>Save Changes</button>
          </div>
        </div>
        </div>
        
      )}
    </div>
  );
};

export default Manageproducts;