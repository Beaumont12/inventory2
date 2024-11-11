import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, Input, Tag, Row, Col, Select, message } from 'antd';
import { getDatabase, ref, onValue, set, remove } from 'firebase/database';
import { app } from '../../firebaseConfig';
import { getIndexedDB, setIndexedDB, deleteIndexedDB } from '../utils/indexedDB';
import { CloseOutlined, SearchOutlined, DeleteOutlined, PlusOutlined  } from '@ant-design/icons';
import AddProducts from './Addproducts';

const { Option } = Select;

const ManageProducts = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newTemperature, setNewTemperature] = useState('');
  const [selectedTemperature, setSelectedTemperature] = useState('');
  const [addNewSize, setAddNewSize] = useState('');
  const [addNewTemperature, setAddNewTemperature] = useState('');
  const [availableNewTemperature, setAvailableNewTemperature] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const fetchData = async () => {
    const db = getDatabase(app);
    const storedProducts = await getIndexedDB('products', 'allProducts');
    const storedCategories = await getIndexedDB('categories', 'allCategories');

    if (storedProducts) {
      setProducts(storedProducts);
      setFilteredProducts(storedProducts);
    }
    if (storedCategories) {
      setCategories(storedCategories);
    }

    const categoriesRef = ref(db, 'categories');
    onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      const categoryList = Object.values(data);
      setCategories(categoryList);
      setIndexedDB('categories', 'allCategories', categoryList);
    });

    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const productList = Object.keys(data).map((key) => ({
        ...data[key],
        id: key,
      }));
      setProducts(productList);
      setFilteredProducts(productList);
      setIndexedDB('products', 'allProducts', productList);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = products.filter(product => {
        const matchesCategory = selectedCategory === 'All' || product.Category === selectedCategory;
        const matchesSearchTerm = product.Name.toLowerCase().includes(lowerCaseSearchTerm) ||
            (product.Variations.temperature && Object.keys(product.Variations.temperature).some(temp =>
                Object.keys(product.Variations.temperature[temp]).some(size => {
                    const price = product.Variations.temperature[temp][size];
                    return size.toLowerCase().includes(lowerCaseSearchTerm) ||
                        price.toString().includes(lowerCaseSearchTerm); 
                })
            )) ||
            (product.Variations.price && product.Variations.price.toString().includes(lowerCaseSearchTerm));
        return matchesCategory && matchesSearchTerm;
    });
    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, products]);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setFilteredProducts(category === 'All' ? products : products.filter(product => product.Category === category));
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handleRemoveProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const db = getDatabase(app);
        const productRef = ref(db, `products/${productId}`);
        await remove(productRef);
        await deleteIndexedDB('products', productId);
        setProducts(prev => prev.filter(product => product.id !== productId));
        setFilteredProducts(prev => prev.filter(product => product.id !== productId));
      } catch (error) {
        console.error('Error removing product:', error);
      }
    }
  };

  const handleUpdateProduct = () => {
    Modal.confirm({
      title: 'Confirm Update',
      content: `Are you sure you want to update ${selectedProduct.Name}?`,
      onOk: async () => {
        if (selectedProduct) {
          const updatedProduct = { ...selectedProduct };

        console.log("Initial selectedProduct:", selectedProduct);
        console.log("Cloned updatedProduct:", updatedProduct);
        console.log("New Temperature:", newTemperature);
        console.log("New Size:", newSize);
        console.log("New Price:", newPrice);
 
        if (updatedProduct.Category === 'Pastry') {
          if (newPrice) {
            const priceNumber = parseFloat(newPrice);
            if (isNaN(priceNumber)) {
              message.error('Please enter a valid number for the price.');
              return;
            }
            updatedProduct.Variations.price = priceNumber;
            console.log("Updated pastry price:", updatedProduct.Variations.price);
          }
        } else { 
          if (!updatedProduct.Variations) {
            updatedProduct.Variations = { temperature: {} };
          }
 
          if (newTemperature && newSize && newPrice) {
            const priceNumber = parseFloat(newPrice);
            if (isNaN(priceNumber)) {
              message.error('Please enter a valid number for the price.');
              return;
            }
 
            if (!updatedProduct.Variations.temperature[newTemperature]) {
              updatedProduct.Variations.temperature[newTemperature] = {
                [newSize]: priceNumber,
              };
              console.log(`Added new temperature "${newTemperature}" with size and price:`, updatedProduct.Variations.temperature[newTemperature]);
            } else {
              console.log(`Temperature "${newTemperature}" already exists. Skipping creation.`);
            }
          } else {
            console.log("Conditions for adding a new temperature not met.");
          }
 
          if (selectedTemperature && newSize && newPrice) {
            const priceNumber = parseFloat(newPrice);
            if (isNaN(priceNumber)) {
              message.error('Please enter a valid number for the price.');
              return;
            }

            if (!updatedProduct.Variations.temperature[selectedTemperature]) {
              updatedProduct.Variations.temperature[selectedTemperature] = {};
            }
 
            updatedProduct.Variations.temperature[selectedTemperature][newSize] = priceNumber;
            console.log(`Added new size and price to existing temperature "${selectedTemperature}":`, updatedProduct.Variations.temperature[selectedTemperature]);
          }
 
          const temperaturesToRemoveSizes = Object.keys(updatedProduct.Variations.temperature);
          temperaturesToRemoveSizes.forEach(temp => { 
            const sizesToRemove = Object.keys(selectedProduct.Variations.temperature[temp]).filter(size => {
              return !(size in updatedProduct.Variations.temperature[temp]);
            });
            sizesToRemove.forEach(size => {
              delete updatedProduct.Variations.temperature[temp][size];
            });
          });
 
          const allSizes = Object.entries(updatedProduct.Variations.temperature).flatMap(([_, sizes]) => Object.keys(sizes));
          if (allSizes.length === 0) {
            alert('Cannot remove all sizes. At least one size must remain.'); 
            Object.keys(selectedProduct.Variations.temperature).forEach(temp => {
              updatedProduct.Variations.temperature[temp] = { ...selectedProduct.Variations.temperature[temp] };
            });
          }
 
          Object.keys(updatedProduct.Variations.temperature).forEach(temp => {
            Object.keys(updatedProduct.Variations.temperature[temp]).forEach(size => {
              const priceInput = parseFloat(updatedProduct.Variations.temperature[temp][size]) || '';
              if (!isNaN(priceInput)) {
                updatedProduct.Variations.temperature[temp][size] = priceInput;
              }
            });
          });
          console.log("Final updated variations:", updatedProduct.Variations);
        }
 
        console.log("Final updatedProduct before database update:", updatedProduct);
 
        const db = getDatabase(app);
        const productRef = ref(db, `products/${selectedProduct.id}`);
        
        try {
          await set(productRef, updatedProduct); // Ensure this is awaited
          await setIndexedDB('products', selectedProduct.id, updatedProduct);
 
          setNewSize('');
          setNewTemperature('');
          setNewPrice('');

          message.success(`${updatedProduct.Name} has been successfully updated.`);
          setShowModal(false); 

          // Call fetchData to reload the products
          await fetchData();  
        } catch (error) {
          console.error("Error updating product:", error);
          message.error('Failed to update product. Please try again.');
        }
      }
    },
      onCancel: () => {
        message.info('Update canceled.');
      },
    });
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedProduct((prev) => ({ ...prev, [name]: value }));
  };

  const availableTemperatures = ['hot', 'iced'];
  const existingTemperatures = selectedProduct?.Variations.temperature ? Object.keys(selectedProduct.Variations.temperature) : [];
  const addableTemperatures = availableTemperatures.filter(temp => !existingTemperatures.includes(temp));

  return (
    <div className='m-7 bg-white'>
      <h1 className="text-6xl font-bold text-center text-black mb-4 mt-2">Manage Products</h1>
      <h3 className="text-lg md:text-base text-center mt-4 md:mt-8 font-semibold rounded-lg bg-main-green text-white">EDIT, DELETE or ADD NEW PRODUCT</h3>
      
      <div className="my-4">
        <Input className='rounded-lg shadow-lg p-2' prefix={<SearchOutlined className='mr-2' />} placeholder="Search by product name, size, or price..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%' }} />
      </div>

      <div className="flex flex-wrap gap-10 mb-4">
          <Button className='rounded-lg shadow-lg w-24' type="default"
              style={{
                  backgroundColor: selectedCategory === 'All' ? '#DDB04B' : 'transparent',
                  color: selectedCategory === 'All' ? '#fff' : '#000',
                  border: selectedCategory === 'All' ? 'none' : undefined,
              }}
              onClick={() => handleCategoryClick('All')} > All
          </Button>

          {categories.map((category, index) => (
              <Button className='rounded-lg shadow-lg w-24' key={index} type="default"
                  style={{
                      backgroundColor: selectedCategory === category.Name ? '#DDB04B' : 'transparent',
                      color: selectedCategory === category.Name ? '#fff' : '#000',
                      border: selectedCategory === category.Name ? 'none' : undefined, 
                  }}
                  onClick={() => handleCategoryClick(category.Name)} > {category.Name}
              </Button>
          ))}
      </div>

      <Row gutter={[24, 32]}>
        {filteredProducts.sort((a, b) => a.Name.localeCompare(b.Name)).map((product, index) => (
          <Col span={8} key={index}>
            <Card className='rounded-lg shadow-lg bg-gray-50 border-gray-200' hoverable
              title={<span className="text-main-green font-bold">{product.Name}</span>}
              extra={
                <CloseOutlined
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveProduct(product.id);
                  }}
                  style={{ color: 'red' }} />
              }
              onClick={() => handleProductClick(product)}
              cover={<img src={product.imageURL} alt={product.Name} className="object-cover h-60" style={{ borderRadius: '0px' }} />} >
              <p className="text-gray-600 text-xs mb-2 h-8">{product.Description}</p>
              <div className="text-sm font-semibold text-center">
                {product.stockStatus === 'In Stock' ? (
                  <Tag color="green">In Stock</Tag> ) : ( <Tag color="red">Out of Stock</Tag> )}
              </div>
              
              {product.Variations.temperature && (
                <div className="mt-4">
                  {['hot', 'iced'].map((temp) =>
                    product.Variations.temperature[temp] ? (
                      <div key={temp} className="mb-2">
                        <div className="flex justify-between items-center bg-main-green text-white px-2 py-1 rounded-t-md">
                          <span className="font-semibold capitalize">{temp}</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 border-2 border-gray-300 p-2 rounded-b-md">
                          {Object.entries(product.Variations.temperature[temp]).map(([size, price]) => (
                            <Tag key={size} color="blue" className="mt-1 w-20 justify-center text-center"> {size}: ₱{price} </Tag>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {product.Variations.price && (
                <div className="mt-4 text-center">
                  <div className="flex justify-between items-center bg-main-green text-white px-2 py-1 rounded-t-md">
                      <span className="font-semibold capitalize">Standard</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 border-2 border-gray-300 p-2 rounded-b-md">
                    <Tag color="blue" className="mt-1 w-20 justify-center text-center">₱{product.Variations.price}</Tag>
                  </div>
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {selectedProduct && (
        <Modal open={showModal} onCancel={() => setShowModal(false)} title={`Edit ${selectedProduct.Name}`}
          footer={[
            <Button key="cancel" onClick={() => setShowModal(false)}>Cancel</Button>,
            <Button key="submit" type="primary" onClick={handleUpdateProduct}>Save Changes</Button>,
          ]} >
          <Input addonBefore="Name" value={selectedProduct?.Name || ''} disabled style={{ marginBottom: '1rem' }} />
          <Input addonBefore="Category" value={selectedProduct?.Category || ''} disabled style={{ marginBottom: '1rem' }} />

          {selectedProduct?.Category === 'Pastry' ? (
            <Input addonBefore="Price" value={selectedProduct?.Variations?.price || ''}
              onChange={(e) => {
                const updatedPrice = parseFloat(e.target.value);
                setSelectedProduct((prev) => ({
                  ...prev,
                  Variations: {
                    ...prev.Variations,
                    price: isNaN(updatedPrice) ? '' : updatedPrice,
                  },
                }));
              }}
              style={{ marginBottom: '1rem' }} />
          ) : (
            <>
              <Input addonBefore="Description" value={selectedProduct?.Description || ''}
                onChange={(e) =>
                  handleInputChange({ target: { name: 'Description', value: e.target.value } })
                }
                style={{ marginBottom: '1rem' }} />

              {selectedProduct?.Variations.temperature &&
                Object.keys(selectedProduct.Variations.temperature).map((temp) => (
                  <div key={temp} className="mb-2">
                    <div className="flex justify-between items-center bg-main-green text-white px-2 py-1 rounded-t-md">
                      <span className="font-semibold capitalize">{temp} Sizes</span>
                    </div>
                    <div className="border-2 border-gray-300 p-2 rounded-b-md">
                      {Object.entries(selectedProduct.Variations.temperature[temp]).map(
                        ([size, price]) => (
                          <div className="flex items-center" key={size} style={{ marginBottom: '1rem' }}>
                            <Input addonBefore={size} value={price}
                              onChange={(e) => {
                                const updatedTemperature = { ...selectedProduct.Variations.temperature };
                                updatedTemperature[temp][size] = parseFloat(e.target.value) || '';
                                setSelectedProduct((prev) => ({
                                  ...prev,
                                  Variations: {
                                    ...prev.Variations,
                                    temperature: updatedTemperature,
                                  },
                                }));
                              }}
                              style={{ flex: 1, marginRight: '8px' }} />
                            <DeleteOutlined 
                              onClick={() => {
                                const updatedTemperature = { ...selectedProduct.Variations.temperature };
                                delete updatedTemperature[temp][size];
                                 
                                const remainingSizes = Object.keys(updatedTemperature).flatMap(t => Object.keys(updatedTemperature[t]));
                                if (remainingSizes.length === 0) {
                                  message.error('Cannot delete the last size. At least one size must remain.'); 
                                  updatedTemperature[temp][size] = price;  
                                  return;
                                }

                                setSelectedProduct((prev) => ({
                                  ...prev,
                                  Variations: {
                                    ...prev.Variations,
                                    temperature: updatedTemperature,
                                  },
                                }));
                              }} 
                              style={{ cursor: 'pointer', color: 'red' }} />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}

              {/* Button to add new size/price to existing temperature */}
              <Button type="dashed" 
                onClick={() => {
                  setAddNewSize(true);
                  setAddNewTemperature(false);
                }}
                style={{ width: '100%', marginBottom: '1rem' }} > Add New Size & Price to Existing Temperature
              </Button>

              {/* Conditional button to add a new temperature if one is missing */}
              {!addNewTemperature && ['hot', 'iced'].some(temp => !(temp in selectedProduct.Variations.temperature)) && (
                <Button type="dashed" 
                  onClick={() => {
                    const availableTemp = ['hot', 'iced'].find(temp => !(temp in selectedProduct.Variations.temperature));
                    if (availableTemp) {
                      setAvailableNewTemperature(availableTemp);
                      setNewTemperature(availableTemp); 
                      setAddNewTemperature(true); 
                      setAddNewSize(false); 
                    }
                  }}
                  style={{ width: '100%', marginBottom: '1rem' }} > Add New Temperature with Size & Price
                </Button>
              )}

              {/* Conditional rendering for adding a new size and price to existing temperature */}
              {addNewSize && (
                <>
                  <Select placeholder="Select Temperature" value={selectedTemperature} onChange={(value) => setSelectedTemperature(value)} style={{ width: '100%', marginBottom: '1rem' }} >
                    {Object.keys(selectedProduct.Variations.temperature || {}).map((temp) => (
                      <Option key={temp} value={temp}>
                        {temp.charAt(0).toUpperCase() + temp.slice(1)}
                      </Option>
                    ))}
                  </Select>
                  <Row gutter={16} style={{ marginBottom: '1rem' }}>
                    <Col span={12}>
                      <Input addonBefore="New Size" value={newSize} onChange={(e) => setNewSize(e.target.value)} />
                    </Col>
                    <Col span={12}>
                      <Input addonBefore="New Price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                    </Col>
                  </Row>
                </>
              )}

              {/* Conditional rendering for adding a new temperature with initial size and price */}
              {addNewTemperature && availableNewTemperature && (
                <>
                  <Select placeholder="New Temperature" value={availableNewTemperature} disabled style={{ width: '100%', marginBottom: '1rem' }} >
                    <Option value={availableNewTemperature}>
                      {availableNewTemperature.charAt(0).toUpperCase() + availableNewTemperature.slice(1)}
                    </Option>
                  </Select>
                  <Row gutter={16} style={{ marginBottom: '1rem' }}>
                    <Col span={12}>
                      <Input addonBefore="Initial Size" value={newSize} onChange={(e) => setNewSize(e.target.value)} />
                    </Col>
                    <Col span={12}>
                      <Input  addonBefore="Initial Price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                    </Col>
                  </Row>
                </>
              )}
            </>
          )}
        </Modal>
      )}

      {/* Floating Add Button */}
      <Button 
        type="primary" 
        shape="circle" 
        icon={<PlusOutlined style={{ fontSize: '32px' }} />} // Adjust icon size if necessary
        size="large" 
        className="fixed bottom-10 right-10 flex items-center justify-center text-lg bg-main-green border-0 shadow-lg" // Removed width and height
        style={{ width: '60px', height: '60px', borderColor: 'transparent', backgroundColor: '#203B36', boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.3)', }}
        onClick={() => setShowAddProductModal(true)} 
      />

      <Row gutter={[24, 32]}>
        {filteredProducts.map((product, index) => (
          <Col span={8} key={index}>
            <Card title={product.Name}>
              {/* Product details */}
            </Card>
          </Col>
        ))}
      </Row>

      {/* Add Product Modal */}
      <AddProducts 
        open={showAddProductModal} 
        onClose={() => setShowAddProductModal(false)} 
      />
    </div>
  );
};

export default ManageProducts;