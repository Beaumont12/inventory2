import React, { useState, useCallback, useEffect } from 'react';
import 'react-image-crop/dist/ReactCrop.css';
import { ref, set, get } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app, db } from '../../firebaseConfig';
import Cropper from 'react-easy-crop';

const AddProducts = () => {
  const [productType, setProductType] = useState(''); // For selecting Drinks or Pastry
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [categories, setCategories] = useState([]); 
  const [selectedCategory, setSelectedCategory] = useState(''); 
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState(''); 
  const [variations, setVariations] = useState([]);
  const [stockStatus, setStockStatus] = useState('In Stock'); 
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [productCount, setProductCount] = useState(0); 

  useEffect(() => {
    const categoriesRef = ref(db, 'categories');
    get(categoriesRef).then((snapshot) => {
      if (snapshot.exists()) {
        const categoriesData = snapshot.val();
        setCategories(Object.values(categoriesData).map(category => category.Name)); 
        setSelectedCategory(categoriesData.category_1.Name); 
      }
    }).catch((error) => {
      console.error('Error fetching categories:', error);
    });

    const productCountRef = ref(db, 'productCount');
    get(productCountRef).then((snapshot) => {
      if (snapshot.exists()) {
        setProductCount(snapshot.val());
      }
    }).catch((error) => {
      console.error('Error fetching product count:', error);
    });
  }, []);

  const handleTypeSelection = (type) => {
    setProductType(type);
    // Reset form fields when switching between Drinks and Pastry
    setSrc(null);
    setProductName('');
    setDescription('');
    setVariations([]);
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => setSrc(reader.result));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCrop = useCallback(async () => {
    try {
      if (!selectedCategory.trim() || !productName.trim() || variations.length === 0) {
        showAlertMessage('Please fill in all fields and add at least one variation.');
        return;
      }

      const product = {
        Category: selectedCategory, 
        Name: productName,
        Description: description, 
        Variations: {},  // Initialize variations empty for both drinks and pastries
        imageURL: '', 
        stockStatus: stockStatus
      };

      if (productType === 'Drinks') {
        product.Variations.temperature = {}; 
        variations.forEach(({ temperature, sizes }) => {
          product.Variations.temperature[temperature] = {};
          sizes.forEach(({ size, price }) => {
            product.Variations.temperature[temperature][size] = price;
          });
        });
      } else if (productType === 'Pastry') {
        // For Pastry, only add a single price without sizes or temperature
        const priceString = variations[0]?.price || '0'; // Default to '0' if price is not available
        product.Variations.price = parseFloat(priceString); // Convert to number
      }      

      const newProductCount = productCount + 1;
      const productId = `Product${newProductCount}`;
      setProductCount(newProductCount);

      const croppedImageBlob = await getCroppedImageBlob();
      const storage = getStorage(app);
      const photoRef = storageRef(storage, `OM/${productId}.jpg`);
      await uploadBytes(photoRef, croppedImageBlob);
      const photoUrl = await getDownloadURL(photoRef);
      product.imageURL = photoUrl;

      await Promise.all([
        set(ref(db, `products/${productId}`), product),
        set(ref(db, 'productCount'), newProductCount)
      ]);
      console.log('Product added successfully');

      // Reset form
      setSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setSelectedCategory(categories[0]);
      setProductName('');
      setDescription('');
      setVariations([]);

      showConfirmationMessage('Product added successfully!');
    } catch (error) {
      console.error('Error cropping image or adding product:', error);
      showAlertMessage('Error cropping image or adding product.');
    }
  }, [croppedAreaPixels, selectedCategory, productName, description, variations, stockStatus, categories, productCount, productType]);

  const getCroppedImageBlob = async () => {
    if (!croppedAreaPixels) return;
    const image = new Image();
    image.src = src;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = croppedAreaPixels.width * scaleX;
    canvas.height = croppedAreaPixels.height * scaleY;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      croppedAreaPixels.x * scaleX,
      croppedAreaPixels.y * scaleY,
      croppedAreaPixels.width * scaleX,
      croppedAreaPixels.height * scaleY,
      0,
      0,
      croppedAreaPixels.width * scaleX,
      croppedAreaPixels.height * scaleY
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  const handleAddVariation = () => {
    if (variations.length < 2) {
      setVariations([...variations, { temperature: '', sizes: [{ size: '', price: '' }] }]);
    } else {
      showAlertMessage("Maximum 2 variations allowed");
    }
  };

  const handleVariationChange = (index, key, value) => {
    const newVariations = [...variations];
    newVariations[index][key] = value;

    if (key === "temperature" && ["hot", "iced"].includes(value.toLowerCase())) {
      const oppositeTemp = value.toLowerCase() === "hot" ? "iced" : "hot";
      if (!newVariations[index].hasOwnProperty(oppositeTemp)) {
        newVariations[index][oppositeTemp] = {};
      }
    }

    setVariations(newVariations);
  };

  const handleAddSizePrice = (index) => {
    const newVariations = [...variations];
    newVariations[index].sizes.push({ size: '', price: '' });
    setVariations(newVariations);
  };

  const handleSizePriceChange = (variationIndex, sizeIndex, key, value) => {
    const newVariations = [...variations];
    newVariations[variationIndex].sizes[sizeIndex][key] = value;
    setVariations(newVariations);
  };

  const showAlertMessage = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const hideAlertMessage = () => {
    setShowAlert(false);
  };

  const showConfirmationMessage = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  return (
    <div className="flex-1 bg-white">
      {showAlert && (
        <div className="fixed top-0 right-0 w-full h-full bg-gray-600 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded-md">
            <p className="text-xl font-semibold mb-4">{alertMessage}</p>
            <button className="text-white bg-emerald-400 py-1 px-4 rounded-md" onClick={hideAlertMessage}>OK</button>
          </div>
        </div>
      )}
      <div className="p-7">
        <h1 className="text-6xl font-bold text-center text-black mb-4 mt-2">Add Products</h1>
        <h3 className="text-lg md:text-base rounded-lg bg-main-green text-center text-white mt-4 md:mt-8 font-semibold">ADD NEW DRINK OR PASTRY</h3>

        {/* Drinks and Pastry Selection */}
        <div className="flex justify-center mt-4">
          <button
            className={`mr-4 py-2 px-6 rounded-lg ${productType === 'Drinks' ? 'bg-main-honey text-black font-bold' : 'bg-main-green text-white'}`}
            onClick={() => handleTypeSelection('Drinks')}
          >
            Drinks
          </button>
          <button
            className={`py-2 px-6 rounded-lg ${productType === 'Pastry' ? 'bg-main-honey text-black font-bold' : 'bg-main-green text-white'}`}
            onClick={() => handleTypeSelection('Pastry')}
          >
            Pastry
          </button>
        </div>

        

        {/* Drinks Form */}
        {productType === 'Drinks' && (
          <>
            <div className="flex flex-col justify-center items-center mt-8">
            <div className="flex-col justify-center mt-4 w-full rounded-lg p-2">
              <div className='flex justify-center items-center h-auto rounded-lg border-gray-100'>
                <div style={{ position: 'relative', width: '1090px', height: '300px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                  {src ? (
                    <Cropper
                      image={src}
                      crop={crop}
                      zoom={zoom}
                      aspect={325 / 150}
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                      style={{
                        containerStyle: {
                          backgroundColor: '#F3F4F6',
                          borderRadius: '12px',
                        },
                        cropAreaStyle: {
                          border: '2px dashed #F3F4F6',
                        },
                      }}
                    />
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-gray-500">No image selected. Please upload an image.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-center items-center mt-4 rounded-lg">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setSrc(null);
                    onSelectFile(e);
                  }}
                  className="py-2 px-4 bg-main-honey rounded-lg text-white text-center items-center"
                />
              </div>
            </div>
              <div className="flex flex-col place-self-center mt-2 bg-gray-100 overflow-hidden shadow-md p-6 rounded-xl w-[90%] max-w-[1090px]">
                <div className="flex flex-col w-full">
                  <label className="font-semibold mb-2 text-main-green">Product Name</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                  />
                </div>

                <div className="flex flex-col w-full">
                  <label className="font-semibold mb-2 text-main-green">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                    rows={4}
                  />
                </div>

                <div className="flex flex-col w-1/3">
                  <label className="font-semibold mb-2 text-main-green">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-start items-center">
                  <button
                    onClick={handleAddVariation}
                    className="py-2 px-4 rounded-md shadow-md bg-main-honey text-white shadow-gray-300 mt-6"
                  >
                    Add Variation
                  </button>
                </div>

                {variations.map((variation, variationIndex) => (
                  <div key={variationIndex} className="flex flex-col mt-4">
                    <div className="flex flex-col w-1/3">
                      <label className="font-semibold mb-2 text-main-green">Temperature</label>
                      <select
                      value={variation.temperature}
                      onChange={(e) => handleVariationChange(variationIndex, 'temperature', e.target.value)}
                      className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                    >
                      <option value="">Select Temperature</option>
                      <option value="hot">Hot</option>
                      <option value="iced">Iced</option>
                    </select>
                    </div>

                    {variation.sizes.map((sizePrice, sizeIndex) => (
                      <div key={sizeIndex} className="flex flex-col w-full">
                        <label className="font-semibold mb-2 text-main-green">Size</label>
                        <input
                          type="text"
                          value={sizePrice.size}
                          onChange={(e) => handleSizePriceChange(variationIndex, sizeIndex, 'size', e.target.value)}
                          className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                        />
                        <label className="font-semibold mb-2 text-main-green">Price</label>
                        <input
                          type="text"
                          value={sizePrice.price}
                          onChange={(e) => handleSizePriceChange(variationIndex, sizeIndex, 'price', e.target.value)}
                          className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                        />
                      </div>
                    ))}

                    <button
                      onClick={() => handleAddSizePrice(variationIndex)}
                      className="py-2 px-4 rounded-md shadow-md bg-main-honey text-white shadow-gray-300 mt-6"
                    >
                      Add Size and Price
                    </button>
                  </div>
                ))}

                <div className="flex justify-end items-center mt-6">
                  <button
                    onClick={handleCrop}
                    className="py-2 px-6 rounded-md shadow-md bg-main-green text-white shadow-gray-300"
                  >
                    Save Product
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {productType === 'Pastry' && (
          <>
            <div className="flex flex-col justify-center items-center mt-8">
              <div className="flex-col justify-center mt-4 w-full rounded-lg p-2">
                <div className='flex justify-center items-center h-auto rounded-lg border-gray-100'>
                  <div style={{ position: 'relative', width: '1090px', height: '300px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                    {src ? (
                      <Cropper
                        image={src}
                        crop={crop}
                        zoom={zoom}
                        aspect={325 / 150}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        style={{
                          containerStyle: {
                            backgroundColor: '#F3F4F6',
                            borderRadius: '12px',
                          },
                          cropAreaStyle: {
                            border: '2px dashed #F3F4F6',
                          },
                        }}
                      />
                    ) : (
                      <div className="flex justify-center items-center h-full">
                        <p className="text-gray-500">No image selected. Please upload an image.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-center items-center mt-4 rounded-lg">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setSrc(null);
                      onSelectFile(e);
                    }}
                    className="py-2 px-4 bg-main-honey rounded-lg text-white text-center items-center"
                  />
                </div>
              </div>
              <div className="flex flex-col place-self-centerr mt-2 bg-gray-100 overflow-hidden shadow-md p-6 rounded-xl w-[90%] max-w-[1090px]">
                <div className="flex flex-col w-full">
                  <label className="font-semibold mb-2 text-main-green">Product Name</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                  />
                </div>

                <div className="flex flex-col w-full">
                  <label className="font-semibold mb-2 text-main-green">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                    rows={4}
                  />
                </div>

                <div className="flex flex-col w-1/3">
                  <label className="font-semibold mb-2 text-main-green">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Single Price for Pastry */}
                <div className="flex flex-col w-1/3">
                  <label className="font-semibold mb-2 text-main-green">Price</label>
                  <input
                    type="text"
                    value={variations[0]?.price || ''}
                    onChange={(e) => setVariations([{ price: e.target.value }])}
                    className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                  />
                </div>

                <div className="flex justify-end items-center mt-6">
                  <button
                    onClick={handleCrop}
                    className="py-2 px-6 rounded-md shadow-md bg-main-green text-white shadow-gray-300"
                  >
                    Save Product
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default AddProducts;
