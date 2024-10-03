import React, { useState, useEffect } from 'react';
import { getDatabase, ref, update, get, remove } from 'firebase/database';
import { db } from '../../firebaseConfig';
import { MdEdit, MdDelete } from 'react-icons/md';
import { BiCategoryAlt } from 'react-icons/bi';

const Managecategory = () => {
  const [categories, setCategories] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editedCategory, setEditedCategory] = useState({ id: '', name: '', newId: '' });
  const [deletedCategoryId, setDeletedCategoryId] = useState(null);
  const [confirmChanges, setConfirmChanges] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
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

    fetchCategories();
  }, []);

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

  const deleteCategory = async (categoryId) => {
    setDeletedCategoryId(categoryId);
    setDeleteModalOpen(true);
  };

  const confirmDeleteCategory = async () => {
    const categoryRef = ref(db, `categories/${deletedCategoryId}`);

    try {
      await remove(categoryRef);
      setCategories(prevCategories => prevCategories.filter(category => category.id !== deletedCategoryId));
      console.log("Category deleted successfully");
      setConfirmDelete(true);
    } catch (error) {
      console.error("Error deleting category:", error);
    }
    setDeleteModalOpen(false);
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
    setEditModalOpen(false); // Close the edit modal

    // Show confirmation modal for saving changes
    setConfirmChanges(true);
  };

  const saveChanges = async () => {
    const categoryRef = ref(db, `categories/${editedCategory.id}`);

    try {
      await update(categoryRef, {});

      const newCategoryRef = ref(db, `categories/${editedCategory.newId}`);
      await update(newCategoryRef, {
        Name: editedCategory.name
      });

      setCategories(prevCategories =>
        prevCategories.map(category =>
          category.id === editedCategory.id ? { ...category, id: editedCategory.newId, name: editedCategory.name } : category
        )
      );

      setConfirmChanges(false); // Close the confirmation modal
      console.log("Changes saved successfully");
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };

  return (
    <div className="flex-1 bg-main-bg bg-cover bg-center bg-no-repeat h-screen">
      <div className="p-4">
        <h1 className="text-6xl text-center text-black font-bold mt-2">
          <BiCategoryAlt className="inline-block mr-2" /> Manage Category</h1>
        <h3 className="text-lg md:text-base text-center text-white mt-4 md:mt-8 font-semibold bg-main-green">EDIT ONLY WHEN NECESSARY</h3>
        <hr className="my-4 border-gray-500 border-2" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-8">
          {categories.map(category => (
            <div key={category.id} className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col justify-center items-center text-center shadow-lg">
              <div className="text-main-green font-bold text-2xl mb-1 mt-2">{category.name}</div>
              <div className="text-white font-semibold text-xs bg-main-honey rounded-xl p-1">{category.id}</div>
              <div className="text-gray-700 font-bold text-sm mt-1">{category.productCount} Products</div>
              <div className="mt-4">
                <button className="text-white bg-emerald-400 hover:bg-emerald-200 py-1 px-2 rounded-lg mr-2" onClick={() => openEditModal(category)}>
                    <MdEdit className="h-5 w-5" />  
                </button>
                <button className="text-white bg-red-700 hover:bg-red-500 py-1 px-2 rounded-lg" onClick={() => deleteCategory(category.id)}>
                    <MdDelete className="h-5 w-5" /> 
                </button>
              </div>
            </div>
          ))}
        </div>
        {editModalOpen && (
          <div className="fixed top-0 left-0 w-full h-full bg-gray-600 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-4 rounded-md">
              <h2 className="text-xl font-semibold mb-4 text-main-green">Edit Category</h2>
              <div className="mb-4">
                <label className="block mb-2">Category ID</label>
                <input type="text" name="newId" value={editedCategory.newId} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg" disabled />
              </div>
              <div className="mb-4">
                <label className="block mb-2">Category Name</label>
                <input type="text" name="name" value={editedCategory.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg mb-4" />
              </div>
              <div className="flex justify-end">
                <button className="text-white bg-emerald-400 py-1 px-4 rounded-md mr-2 hover:bg-emerald-100 shadow-lg mb-4 h-12" onClick={confirmChangesAndSave}>Save Changes</button>
                <button className="text-white bg-gray-500 hover:bg-gray-400 py-1 px-4 rounded-md shadow-lg mb-4" onClick={closeEditModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {confirmChanges && (
          <div className="fixed top-0 left-0 w-full h-full bg-gray-600 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-4 rounded-md">
              <h2 className="text-xl font-semibold mb-4">Confirm Changes</h2>
              <p>Are you sure you want to save these changes?</p>
              <div className="flex justify-end mt-4">
                <button className="text-white bg-emerald-400 py-1 px-4 rounded-md mr-2 hover:bg-emerald-200" onClick={saveChanges}>Yes</button>
                <button className="text-white bg-red-700 hover:bg-red-500 py-1 px-4 rounded-md" onClick={() => setConfirmChanges(false)}>No</button>
              </div>
            </div>
          </div>
        )}
        {deleteModalOpen && (
          <div className="fixed top-0 left-0 w-full h-full bg-gray-600 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-4 rounded-md">
              <h2 className="text-xl font-semibold mb-4 text-main-green">Confirm Deletion</h2>
              <p>Are you sure you want to delete this category?</p>
              <div className="flex justify-end mt-4">
                <button className="text-white bg-red-700 hover:bg-red-500 py-1 px-4 rounded-md mr-2" onClick={confirmDeleteCategory}>Yes</button>
                <button className="text-white bg-gray-500 hover:bg-gray-400 py-1 px-4 rounded-md" onClick={() => setDeleteModalOpen(false)}>No</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Managecategory;