import React, { useState, useCallback, useEffect } from 'react';
import 'react-image-crop/dist/ReactCrop.css';
import { ref, set, get } from 'firebase/database';
import { BsCartPlus } from "react-icons/bs";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app, db } from '../../firebaseConfig'
import Cropper from 'react-easy-crop';

const firebaseConfig = {
  apiKey: "AIzaSyB8xVDaDEehGAqTAKtmqdD97pkBSIQJHyI",
  authDomain: "wenzinpossystem.firebaseapp.com",
  databaseURL: "https://wenzinpossystem-default-rtdb.firebaseio.com",
  projectId: "wenzinpossystem",
  storageBucket: "wenzinpossystem.appspot.com",
  messagingSenderId: "910317765447",
  appId: "1:910317765447:web:16a7a67c68b7216d0d4262"
};

const storage = getStorage();

const AddProducts = () => {
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
        Variations: {
          temperature: {} 
        },
        imageURL: '', 
        stockStatus: stockStatus
      };

      variations.forEach(({ temperature, sizes }) => {
        product.Variations.temperature[temperature] = {}; 
        sizes.forEach(({ size, price }) => {
          product.Variations.temperature[temperature][size] = price;
        });
      });

      const newProductCount = productCount + 1;
      const productId = `Product${newProductCount}`;
      setProductCount(newProductCount);

      const croppedImageBlob = await getCroppedImageBlob();
      const photoRef = storageRef(storage, `OM/${productId}.jpg`);
      await uploadBytes(photoRef, croppedImageBlob);
      const photoUrl = await getDownloadURL(photoRef);
      product.imageURL = photoUrl;

      await Promise.all([
        set(ref(db, `products/${productId}`), product),
        set(ref(db, 'productCount'), newProductCount)
      ]);
      console.log('Product added successfully');

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
  }, [croppedAreaPixels, selectedCategory, productName, description, variations, stockStatus, categories, productCount]);

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
      showConfirmationMessage("Maximum 2 variations allowed");
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
        <h3 className="text-lg md:text-base bg-main-green text-center text-white mt-4 md:mt-8 font-semibold">ADD NEW PRODUCT</h3>
        <div className="flex justify-center items-center mt-4 rounded-lg">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setSrc(null);
              setSelectedCategory(categories[0]); // Reset selected category to the first category
              setProductName('');
              setDescription('');
              setVariations([]);
              onSelectFile(e);
            }}
            className="py-2 px-4 bg-main-honey rounded-lg text-white text-center items-center"
          />
        </div>
        <div className="flex justify-center mt-4 w-full rounded-lg p-2">
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
                />
              ) : (
                <div className="flex justify-center items-center h-full">
                  <p className="text-gray-500">No image selected. Please upload an image.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center mt-4">
          <div className="flex flex-col items-start mt-2 bg-gray-100 overflow-hidden shadow-md p-6 rounded-xl w-4/5">
            
            <div className="flex flex-col w-full">
              <label className={`input-label ${productName ? 'active' : ''} font-semibold mb-2 text-main-green`}>Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
              />
            </div>
            <div className="flex flex-col w-full">
              <label className={`input-label ${description ? 'active' : ''} font-semibold mb-2 text-main-green`}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                rows={4}
              />
            </div>
            <div className="flex flex-col w-1/3">
              <label className={`input-label font-semibold mb-2 text-main-green`}>Category</label>
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
            <div className="flex flex-col w-1/3">
              <label className={`input-label ${stockStatus ? 'active' : ''} font-semibold mb-2 text-main-green`}>Stock Status</label>
              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
              >
                <option value="In Stock">In Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
            <div className="flex justify-center items-center mt-10">
              {variations.map((variation, index) => (
                <div key={index} className="mb-6">
                  {/* Temperature input */}
                  <div className="flex flex-col w-1/2">
                    <label className={`input-label ${variation.temperature ? 'active' : ''} font-semibold mb-2 text-main-green`}>Temperature (hot/iced)</label>
                    <input
                      type="text"
                      value={variation.temperature}
                      onChange={(e) => handleVariationChange(index, 'temperature', e.target.value)}
                      className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                    />
                  </div>
                  {/* Size and price inputs */}
                  {variation.sizes.map((sizePrice, sizeIndex) => (
                    <div key={sizeIndex} className="flex mb-2 m-4 w-full items-center self-center">
                      {/* Size input */}
                      <div className="flex flex-col w-1/3">
                        <label className={`input-label ${sizePrice.size ? 'active' : ''} font-semibold mb-2 text-main-green`}>Size</label>
                        <input
                          type="text"
                          value={sizePrice.size}
                          onChange={(e) => handleSizePriceChange(index, sizeIndex, 'size', e.target.value)}
                          className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300 mr-4"
                        />
                      </div>
                      {/* Price input */}
                      <div className="flex flex-col w-1/3">
                        <label className={`input-label ${sizePrice.price ? 'active' : ''} font-semibold mb-2 text-main-green`}>Price</label>
                        <input
                          type="number"
                          value={sizePrice.price}
                          onChange={(e) => handleSizePriceChange(index, sizeIndex, 'price', parseInt(e.target.value))}
                          className="py-2 px-4 rounded-md mb-2 shadow-md bg-white shadow-gray-300"
                        />
                      </div>
                    </div>
                  ))}
                  {/* Add Size & Price button */}
                  <div className="flex justify-center">
                    <button onClick={() => handleAddSizePrice(index)} className="text-white shadow-md shadow-gray-300 bg-main-honey px-3 py-2 rounded-lg mt-6">Add Size & Price</button>
                  </div>
                </div>
              ))}
            </div>
            
            <button onClick={handleAddVariation} className="text-white bg-blue-400 px-3 py-2 shadow-gray-400 shadow-md rounded-lg self-center">Add Variation</button>
            
            <div className="flex justify-center items-center self-center mt-4">
              <button onClick={handleCrop} className="bg-emerald-400 text-white py-2 px-4 shadow-gray-400 rounded-lg shadow-md">Add Product</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProducts;