import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, set } from 'firebase/database';
import { BiCategoryAlt } from 'react-icons/bi';
import { MdErrorOutline } from 'react-icons/md';
import { db, app } from '../../firebaseConfig';

const AddCategory = () => {
  const [categoryName, setCategoryName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState({});
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    const db = getDatabase(app);
    const categoriesRef = ref(db, 'categories');
    get(categoriesRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          setCategories(snapshot.val());
        }
      })
      .catch((error) => {
        console.error('Error loading categories:', error);
      });
  };

  const handleAddCategory = () => {
    if (!categoryName || !categoryId) {
      showAlertMessage('Please enter both category name and ID');
      return;
    }

    if (categories && categories[categoryId]) {
      showAlertMessage('Category ID already exists. Please choose a unique ID.');
      return;
    }

    const db = getDatabase(app);
    const categoriesRef = ref(db, 'categories/' + categoryId);

    const newCategoryData = {
      Name: categoryName
    };

    set(categoriesRef, newCategoryData)
      .then(() => {
        showConfirmationMessage('Category added successfully');
        setCategoryName('');
        setCategoryId('');
        loadCategories();
      })
      .catch((error) => {
        console.error('Error adding category:', error);
        showAlertMessage('Failed to add category');
      });
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
    <div className="flex-1 bg-white h-screen">
      <div className="p-7">
        <h1 className="text-6xl text-black text-center mt-2 font-bold">Add Category
        </h1>
        <h3 className="text-lg md:text-base text-white text-center mt-4 md:mt-8 font-semibold rounded-lg bg-main-green">
          MAKE SURE CATEGORY ID IS UNIQUE
        </h3>

        <div className="mt-8 mx-auto max-w-md">
          <div className="bg-white shadow-lg shadow-gray-300 border border-gray-100 rounded-lg px-8 pt-6 pb-8 mb-4">
            <p className="text-base font-semibold mb-2 text-main-green">Category ID:</p>
            <input
              type="text"
              placeholder="Enter category ID (ex: category_1)"
              className="block w-full px-4 py-2 text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-emerald-500 mb-4"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            />
            <p className="text-main-green text-base font-semibold mb-2">Category Name:</p>
            <input
              type="text"
              placeholder="Enter category name"
              className="block w-full px-4 py-2 text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-emerald-500 mb-4"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
            <button
              className="block w-full py-2 px-4 bg-main-honey text-white font-semibold rounded-md hover:bg-light-honey focus:outline-none focus:bg-emerald-600"
              onClick={handleAddCategory}
            >
              Add Category
            </button>
          </div>
        </div>
      </div>
      {showAlert && (
        <div className="fixed top-0 right-0 w-full h-full bg-gray-600 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded-md">
            <p className="text-xl font-semibold mb-4"><MdErrorOutline className="inline-block mr-2" /> {alertMessage}</p>
            <button className="text-white bg-emerald-400 py-1 px-4 rounded-md" onClick={hideAlertMessage}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddCategory;
