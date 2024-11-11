import React, { useState, useEffect } from 'react';
import { getDatabase, ref, update, get, remove } from 'firebase/database';
import { db } from '../../firebaseConfig';
import { Card, Button, Typography, Modal, Form, Input, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { MdEdit, MdDelete } from 'react-icons/md';

const Managecategory = () => {
  const [categories, setCategories] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editedCategory, setEditedCategory] = useState({ id: '', name: '', newId: '' });
  const [deletedCategoryId, setDeletedCategoryId] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryCount, setCategoryCount] = useState(0);
  const { Title, Text } = Typography;

  useEffect(() => {
    fetchCategories();
    fetchCategoryCount();
  }, []);

  const fetchCategories = async () => {
    const categoriesRef = ref(db, 'categories');
    try {
      const snapshot = await get(categoriesRef);
      if (snapshot.exists()) {
        const categoriesData = snapshot.val();
        const categoriesList = Object.keys(categoriesData).map(categoryId => ({
          id: categoryId,
          name: categoriesData[categoryId].Name,
          productCount: 0
        }));
        setCategories(categoriesList);
        countProducts(categoriesList);
      } else {
        console.log("No categories available");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchCategoryCount = async () => {
    const categoryCountRef = ref(db, 'categoryCount');
    try {
      const snapshot = await get(categoryCountRef);
      if (snapshot.exists()) {
        setCategoryCount(snapshot.val());
      } else {
        console.log("categoryCount not found, initializing to 0");
        setCategoryCount(0);
      }
    } catch (error) {
      console.error("Error fetching category count:", error);
    }
  };

  const countProducts = async (categoriesList) => {
    const productsRef = ref(db, 'products');
    try {
      const snapshot = await get(productsRef);
      if (snapshot.exists()) {
        const productsData = snapshot.val();
        categoriesList.forEach(category => {
          Object.values(productsData).forEach(product => {
            if (product.Category === category.name) {
              category.productCount++;
            }
          });
        });
        setCategories([...categoriesList]);
      }
    } catch (error) {
      console.error("Error counting products:", error);
    }
  };

  const addNewCategory = async () => {
    if (!newCategoryName.trim()) {
      message.error('Category name cannot be empty.');
      return;
    }
  
    // Ensure categoryCount is properly retrieved from its "value" property
    const currentCategoryCount = categoryCount.value || 0;
  
    // Generate new category ID using the currentCategoryCount
    const newCategoryId = `category_${currentCategoryCount + 1}`;
    const newCategoryRef = ref(db, `categories/${newCategoryId}`);
    const categoryCountRef = ref(db, 'categoryCount');
  
    try {
      // Update the category in Firebase
      await update(newCategoryRef, {
        Name: newCategoryName,
      });
  
      // Update the category count in Firebase (within "value" key)
      await update(categoryCountRef, { value: currentCategoryCount + 1 });
  
      // Update the local state
      setCategories([...categories, { id: newCategoryId, name: newCategoryName, productCount: 0 }]);
      setCategoryCount({ value: currentCategoryCount + 1 });  // Update local state correctly
      setAddModalOpen(false);
      setNewCategoryName('');
      message.success('Category added successfully!');
      fetchCategories(); // Reload categories after adding
    } catch (error) {
      console.error("Error adding new category:", error);
      message.error('Failed to add category.');
    }
  };  

  const deleteCategory = (categoryId) => {
    setDeletedCategoryId(categoryId);
    setDeleteModalOpen(true);
  };

  const confirmDeleteCategory = async () => {
    const categoryRef = ref(db, `categories/${deletedCategoryId}`);
    try {
      await remove(categoryRef);
      setCategories(prevCategories => prevCategories.filter(category => category.id !== deletedCategoryId));
      setDeleteModalOpen(false);
      message.success('Category deleted successfully!');
      fetchCategories();  // Reload categories after deletion
    } catch (error) {
      console.error("Error deleting category:", error);
      message.error('Failed to delete category.');
    }
  };

  const openEditModal = (category) => {
    setEditedCategory({
      id: category.id,
      newId: category.id,
      name: category.name
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditedCategory({ id: '', name: '', newId: '' });
    setEditModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedCategory(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const confirmChangesAndSave = async () => {
    const categoryRef = ref(db, `categories/${editedCategory.id}`);
    try {
      await update(categoryRef, { Name: editedCategory.name });
      setCategories(prevCategories =>
        prevCategories.map(category =>
          category.id === editedCategory.id ? { ...category, name: editedCategory.name } : category
        )
      );
      setEditModalOpen(false);
      message.success('Category updated successfully!');
      fetchCategories();  // Reload categories after editing
    } catch (error) {
      console.error("Error saving changes:", error);
      message.error('Failed to update category.');
    }
  };

  return (
    <div className="flex-1 bg-white bg-cover bg-center bg-no-repeat h-screen">
      <div className="m-7">
      <h1 className="text-6xl font-bold text-center text-black mb-4 mt-2">Manage Category</h1>
      <h3 className="text-lg md:text-base rounded-lg bg-main-green text-center text-white mt-4 md:mt-8 font-semibold">EDIT, DELETE or ADD NEW CATEGORY</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-8">
          {categories.map(category => (
            <Card
              key={category.id}
              className="rounded-lg shadow-lg p-4 flex flex-col items-center text-center bg-gray-100">
              <div>
                <Text className="text-main-honey text-2xl font-bold">{category.name}</Text>
              </div>
              <Text className="text-gray-700 font-bold text-sm mt-1">{category.productCount} Products</Text>
              <div className="mt-4 flex justify-center">
                <Button
                  type="primary"
                  icon={<MdEdit className="h-5 w-5" />}
                  onClick={() => openEditModal(category)}
                  className="mr-2 rounded-lg flex items-center justify-center"
                />
                <Button
                  type="danger"
                  icon={<MdDelete className="h-5 w-5" />}
                  onClick={() => deleteCategory(category.id)}
                  className="rounded-lg flex items-center justify-center"
                />
              </div>
            </Card>
          ))}
        </div>
      
        {/* Floating Add Button */}
        <Button 
          type="primary" 
          shape="circle" 
          icon={<PlusOutlined style={{ fontSize: '32px' }} />} // Adjust icon size if necessary
          size="large" 
          className="fixed bottom-10 right-10 flex items-center justify-center text-lg bg-main-green border-0 shadow-lg" // Removed width and height
          style={{ width: '60px', height: '60px', borderColor: 'transparent', backgroundColor: '#203B36', boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.3)', }} // Explicitly set width, height, and remove border
          onClick={() => setAddModalOpen(true)}
        />

        {/* Add Category Modal */}
        <Modal
          title={<div className="text-lg font-bold text-black">Add New Category</div>}
          open={addModalOpen}
          onCancel={() => setAddModalOpen(false)}
          onOk={addNewCategory}
          className="rounded-lg">
          <Form>
            <Form.Item label={<span className="font-semibold text-black">Category Name</span>} required>
              <Input
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="border border-gray-300 rounded-lg p-2"
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Edit Category Modal */}
        <Modal
          title={<div className="text-lg font-bold text-black">Edit Category</div>}
          visible={editModalOpen}
          onCancel={closeEditModal}
          onOk={confirmChangesAndSave}
          className="rounded-lg">
          <Form>
            <Form.Item label={<span className="font-semibold text-black">Category ID</span>}>
              <Input
                value={editedCategory.id}
                disabled
                className="border border-gray-300 rounded-lg p-2"
              />
            </Form.Item>
            <Form.Item label={<span className="font-semibold text-black">Category Name</span>}>
              <Input
                name="name"
                value={editedCategory.name}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-lg p-2" 
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          title={<div className="text-lg font-bold text-black">Confirm Deletion</div>}
          visible={deleteModalOpen}
          onCancel={() => setDeleteModalOpen(false)}
          onOk={confirmDeleteCategory}
          okText={<span className="text-red-600">Yes</span>}
          okType="danger"
          cancelText="No"
          className="rounded-lg">
          <p className="text-gray-800">Are you sure you want to delete this category?</p>
        </Modal>
      </div>
    </div>
  );
};

export default Managecategory;