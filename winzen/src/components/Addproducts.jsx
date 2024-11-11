import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Upload, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getDatabase, ref, set, push, get } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import ReactCropper from 'react-easy-crop';
import { useCallback } from 'react';

const AddProductModal = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [productType, setProductType] = useState('drink');
  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const fetchCategories = async () => {
    const db = getDatabase();
    const categoriesRef = ref(db, 'categories');
    const snapshot = await get(categoriesRef);
    if (snapshot.exists()) {
      const fetchedCategories = Object.values(snapshot.val());
      setCategories(fetchedCategories);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleProductTypeChange = (value) => {
    setProductType(value);
  };

  const handleImageChange = (info) => {
    const file = info.fileList[0];
    const isValidType = ['image/jpeg', 'image/png'].includes(file.type);
    const isValidSize = file.size / 1024 / 1024 < 5; // Max 5MB
  
    if (!isValidType) {
      message.error('Invalid file type! Please upload JPEG or PNG.');
      return;
    }
  
    if (!isValidSize) {
      message.error('File size exceeds 5MB!');
      return;
    }
  
    if (file && file.originFileObj) {
      setImageFile(file.originFileObj); 
      setCropperOpen(true);  // Open the cropper once an image is selected
    }
  };  

  const getCroppedImage = useCallback(() => {
    if (!imageFile) return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const image = new Image();
    image.src = URL.createObjectURL(imageFile);
    image.onload = () => {
      const { width, height } = image;
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(image, crop.x, crop.y, width * zoom, height * zoom);

      // Convert the canvas to a Blob and upload it to Firebase
      canvas.toBlob((blob) => {
        if (blob) {
          setCroppedImageUrl(URL.createObjectURL(blob));
          uploadImageToFirebase(blob);
        }
      }, 'image/jpeg');
    };
  }, [imageFile, crop, zoom]);

  const uploadImageToFirebase = async (blob) => {
    try {
      const storage = getStorage();
      const imageRef = storageRef(storage, `images/${imageFile.name}`);
      await uploadBytes(imageRef, blob); // Upload the blob, not the URL
      const imageUrl = await getDownloadURL(imageRef);
      setCroppedImageUrl(imageUrl);  // Store the URL after successful upload
      setCropperOpen(false);
      message.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      message.error('Image upload failed');
    }
  };

  const handleSubmit = async (values) => {
    const { name, description, category, variations, price } = values;
    const db = getDatabase();
  
    // Get current product count from the database
    const productCountRef = ref(db, 'productCount');
    const snapshot = await get(productCountRef);
  
    // Increment product count
    let productCount = 1;
    if (snapshot.exists()) {
      productCount = snapshot.val() + 1;  // Increment the current product count
    }
  
    // Set the new product count in the database
    await set(productCountRef, productCount); // Save the incremented productCount
  
    const newProductId = `Product${productCount}`; // Generate new product ID based on incremented productCount
  
    if (!croppedImageUrl) {
      message.error('Failed to upload image');
      return;
    }
  
    try {
      // Prepare the base product data structure
      const productData = {
        Name: name,
        Description: description,
        Category: category,
        imageURL: croppedImageUrl,
        stockStatus: 'In Stock', // Set default stock status
      };
  
      if (productType === 'pastry') {
        // For pastries, we only have a single price in variations
        productData.Variations = {
          price: Number(price), // Ensure price is a number
        };
      } else if (productType === 'drink') {
        // For drinks, variations have temperature, size, and price
        const formattedVariations = {
          temperature: {} // Structure to hold variations by temperature
        };
  
        // Process each variation provided by the user
        variations.forEach((variation) => {
          const { temperature, size, price } = variation;
  
          // If this temperature hasn't been added, initialize it
          if (!formattedVariations.temperature[temperature]) {
            formattedVariations.temperature[temperature] = {}; // Create temperature level (hot/iced)
          }
  
          // Assign price for a specific size under the respective temperature
          formattedVariations.temperature[temperature][size] = Number(price); // Ensure price is a number
        });
  
        productData.Variations = formattedVariations;
      }
  
      // Set the product data in Firebase with the correct ID
      await set(ref(db, `products/${newProductId}`), productData);
  
      message.success('Product added successfully');
      form.resetFields();
      setImageFile(null);
      setCroppedImageUrl(null);
      onClose();
    } catch (error) {
      console.error("Error adding product:", error);
      message.error('Failed to add product');
    }
  };  

  const filteredCategories = productType === 'pastry'
    ? categories.filter(category => category.Name === 'Pastry')
    : categories.filter(category => category.Name !== 'Pastry');

  return (
    <Modal
      title="Add Product"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button key="submit" type="primary" onClick={() => form.submit()}>Add Product</Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          productType,
        }}
      >
        <Form.Item label="Product Type" name="productType">
          <Select onChange={handleProductTypeChange} value={productType}>
            <Select.Option value="drink">Drink</Select.Option>
            <Select.Option value="pastry">Pastry</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="Product Name" name="name" rules={[{ required: true, message: 'Please enter product name' }]}>
          <Input placeholder="Enter product name" />
        </Form.Item>

        <Form.Item label="Category" name="category" rules={[{ required: true, message: 'Please select a category' }]}>
          <Select placeholder="Select category">
            {filteredCategories.map((category, index) => (
              <Select.Option key={index} value={category.Name}>
                {category.Name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea rows={4} placeholder="Enter product description" />
        </Form.Item>

        {productType === 'drink' ? (
          <Form.List name="variations">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, fieldKey }) => (
                  <div key={key} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <Form.Item
                      name={[name, 'temperature']}
                      fieldKey={[fieldKey, 'temperature']}
                      rules={[{ required: true, message: 'Select temperature' }]}>
                      <Select placeholder="Temperature">
                        <Select.Option value="hot">Hot</Select.Option>
                        <Select.Option value="iced">Iced</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      name={[name, 'size']}
                      fieldKey={[fieldKey, 'size']}
                      rules={[{ required: true, message: 'Enter size' }]}>
                      <Input placeholder="Size" />
                    </Form.Item>
                    <Form.Item
                      name={[name, 'price']}
                      fieldKey={[fieldKey, 'price']}
                      rules={[{ required: true, message: 'Enter price' }]}>
                      <Input type="number" placeholder="Price" />
                    </Form.Item>
                    <Button onClick={() => remove(name)}>Remove</Button>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block>
                  <PlusOutlined /> Add Variation
                </Button>
              </>
            )}
          </Form.List>
        ) : (
          <Form.Item label="Price" name="price" rules={[{ required: true, message: 'Enter price' }]}>
            <Input type="number" placeholder="Enter price" />
          </Form.Item>
        )}

        <Form.Item label="Product Image" name="image" valuePropName="file">
          <Upload
            onChange={handleImageChange}
            beforeUpload={(file) => false}
            listType="picture-card"
            maxCount={1}
          >
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 8 }}>Upload</div>
            </div>
          </Upload>
        </Form.Item>
      </Form>

      {cropperOpen && (
        <Modal
          title="Crop Image"
          open={cropperOpen}
          onCancel={() => {
            setCropperOpen(false);
            setImageFile(null); 
            setCroppedImageUrl(null); 
            form.setFieldsValue({ image: [] });
          }}
          onOk={getCroppedImage}
          style={{ width: '120%' }}
        >

          <div style={{ width: '100%', height: '400px', position: 'relative' }}>  
            <ReactCropper
              image={imageFile ? URL.createObjectURL(imageFile) : ''}
              crop={crop}
              zoom={zoom}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              style={{ width: '100%', height: '100%' }} 
            />
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default AddProductModal;