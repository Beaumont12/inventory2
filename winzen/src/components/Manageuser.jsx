import React, { useState, useEffect } from 'react';
import { MdEdit, MdDelete } from 'react-icons/md';
import { getDatabase, ref, get, onValue, update, remove } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { PiUsersThree } from "react-icons/pi";
import { FaSearch, FaIdBadge, FaUserShield, FaPhone, FaUserAlt, FaBirthdayCake } from 'react-icons/fa';

const firebaseConfig = {
  apiKey: "AIzaSyB8xVDaDEehGAqTAKtmqdD97pkBSIQJHyI",
  authDomain: "wenzinpossystem.firebaseapp.com",
  databaseURL: "https://wenzinpossystem-default-rtdb.firebaseio.com",
  projectId: "wenzinpossystem",
  storageBucket: "wenzinpossystem.appspot.com",
  messagingSenderId: "910317765447",
  appId: "1:910317765447:web:16a7a67c68b7216d0d4262"
};

const app = initializeApp(firebaseConfig);

const Manageuser = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [updatedUserData, setUpdatedUserData] = useState({
    Name: '',
    Email: '',
    Age: '',
    Phone: '',
    Birthday: {
      Date: '',
      Month: '',
      Year: ''
    },
    Password: '', // New field for password
    Role: '' // New field for role
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const roleOptions = ['Super Admin', 'Admin', 'Cashier'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = getDatabase();
        const usersRef = ref(db, 'staffs');
        onValue(usersRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const usersArray = Object.entries(data).map(([id, user]) => ({
              id,
              ...user,
            }));
            setUsers(usersArray);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error fetching staffs:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Filter users based on search query
    const filteredResults = users.filter(user =>
      user.Name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filteredResults);
  }, [searchQuery, users]);

  const handleEditClick = (user) => {
    setEditingUser(user);
    setUpdatedUserData({
      ...user,
      Birthday: {
        ...user.Birthday
      }
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setUpdatedUserData({
      Name: '',
      Email: '',
      Age: '',
      Phone: '',
      Birthday: {
        Date: '',
        Month: '',
        Year: ''
      },
      Password: '', // Reset password field
      Role: '' // Reset role field
    });
    setModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("Birthday")) {
      const birthdayField = name.split(".")[1];
      setUpdatedUserData(prevState => ({
        ...prevState,
        Birthday: {
          ...prevState.Birthday,
          [birthdayField]: parseInt(value, 10)
        }
      }));
    } else {
      setUpdatedUserData({ ...updatedUserData, [name]: value });
    }
  };

  const handleDeleteClick = (userId) => {
    setDeleteUserId(userId);
  };

  const confirmDeleteUser = () => {
    const db = getDatabase();
    const userRef = ref(db, `staffs/${deleteUserId}`);
    remove(userRef)
      .then(() => {
        setUsers(users.filter(user => user.id !== deleteUserId));
        setDeleteUserId(null);
      })
      .catch((error) => {
        console.error('Error deleting staff:', error);
      });
  };

  const handleSaveChanges = () => {
    if (
      !updatedUserData.Name ||
      !updatedUserData.Email ||
      !updatedUserData.Age ||
      !updatedUserData.Phone ||
      !updatedUserData.Birthday.Date ||
      !updatedUserData.Birthday.Month ||
      !updatedUserData.Birthday.Year ||
      !updatedUserData.Password ||
      !updatedUserData.Role
    ) {
        alert('Please fill out all fields before saving.');
        return;
    }

    console.log('Updated staff data:', updatedUserData);
    const db = getDatabase();
    const userRef = ref(db, `staffs/${editingUser.id}`);
    update(userRef, {
      Name: updatedUserData.Name,
      Email: updatedUserData.Email,
      Age: updatedUserData.Age,
      Phone: updatedUserData.Phone,
      Password: updatedUserData.Password, // Add password field
      Role: updatedUserData.Role, // Add role field
      Birthday: {
        Date: updatedUserData.Birthday.Date,
        Month: updatedUserData.Birthday.Month,
        Year: updatedUserData.Birthday.Year
      }
    }).then(() => {
      setUsers(users.map(user => {
        if (user.id === editingUser.id) {
          return { ...user, ...updatedUserData };
        }
        return user;
      }));
      handleCloseModal();
    }).catch((error) => {
      console.error('Error updating staff:', error);
    });
  };

  return (
    <div>
      <div className="flex-1 bg-main-bg">
        <div className="p-7">
          <h1 className="text-6xl text-center mt-2 font-bold">
            <PiUsersThree className="inline-block mr-2" />Manage Users</h1>
          <h3 className="text-lg md:text-base text-center text-white mt-4 md:mt-8 font-semibold bg-main-green">EDIT ONLY WHEN NECESSARY</h3>
          {/* Search bar */}
          <hr className="my-4 border-gray-500 border-2" />
          <div className="relative mb-4">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search products by name"
            value={searchQuery}
            onChange={(e)=> setSearchQuery(e.target.value)}
            className="appearance-none block w-full bg-white text-gray-700 border border-gray-200 rounded py-3 px-10 leading-tight focus:outline-none focus:bg-white focus:border-honey"
          />
        </div>
          <hr className="my-4 border-gray-500 border-2" />
          <div className="grid grid-cols-1 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-4 border border-gray-100 rounded-md shadow-md bg-main-green">
            {loading ? (
              <p>Loading...</p>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="bg-white rounded-md shadow-md overflow-hidden shadow-honey">
                  <div className="p-2">
                    <div className="flex items-center mb-2">
                      <div className="w-[56px] h-[56px] mr-2 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-center bg-cover" style={{ backgroundImage: `url(${user.ImageUrl})` }} />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">{user.Name}</h2>
                        <p className="text-xs text-gray-800 opacity-60">{user.Email}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-800 opacity-80 ps-1 mt-4 flex items-center">
                      <FaIdBadge className="mr-2" />
                      <strong></strong> {user.id}
                    </p>
                    <p className="text-xs text-gray-800 opacity-80 ps-1 flex items-center">
                      <FaUserShield className="mr-2" />
                      <strong></strong> {user.Role}
                    </p>
                    <p className="text-xs text-gray-800 opacity-80 ps-1 flex items-center">
                      <FaUserAlt className="mr-2" />
                      <strong> </strong> {user.Age}
                    </p>
                    <p className="text-xs text-gray-800 opacity-80 ps-1 flex items-center">
                      <FaPhone className="mr-2" />
                      <strong></strong> {user.Phone}
                    </p>
                    <p className="text-xs text-gray-800 opacity-80 ps-1 flex items-center">
                      <FaBirthdayCake className="mr-2" />
                      <strong></strong> {user.Birthday.Month}/{user.Birthday.Date}/{user.Birthday.Year}
                    </p>
                    <div className="mt-4 flex justify-end">
                      <button onClick={() => handleEditClick(user)} className="mr-2 bg-main-honey hover:bg-light-honey text-white font-bold py-2 px-4 rounded">
                        <MdEdit className="h-5 w-5 text-white" /> {/* Edit Icon */}
                      </button>
                      <button onClick={() => handleDeleteClick(user.id)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                        <MdDelete className="h-5 w-5 text-white" /> {/* Delete Icon */}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Confirmation dialogue */}
      {deleteUserId && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <div className="relative bg-white rounded-lg overflow-hidden max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
                <p className="text-gray-700">Are you sure you want to delete this Staff?</p>
                <div className="mt-4 flex justify-end">
                  <button onClick={() => setDeleteUserId(null)} className="mr-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">
                    Cancel
                  </button>
                  <button onClick={confirmDeleteUser} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal for editing user */}
      {modalOpen && editingUser && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <div className="relative bg-white rounded-lg overflow-hidden max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Edit Staff</h2>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
                  <input type="text" name="Name" value={updatedUserData.Name} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                  <input type="text" name="Email" value={updatedUserData.Email} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Age</label>
                  <input type="number" name="Age" value={updatedUserData.Age} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Phone</label>
                  <input type="number" name="Phone" value={updatedUserData.Phone} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Birthday</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" name="Birthday.Month" placeholder="Month" value={updatedUserData.Birthday.Month} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                    <input type="number" name="Birthday.Date" placeholder="Date" value={updatedUserData.Birthday.Date} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                    <input type="number" name="Birthday.Year" placeholder="Year" value={updatedUserData.Birthday.Year} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                  <input type="password" name="Password" value={updatedUserData.Password} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Role</label>
                  <select name="Role" value={updatedUserData.Role} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                    <option value="">Select Role</option>
                    {roleOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 flex justify-end">
                  <button onClick={handleCloseModal} className="mr-2 bg-red-700 hover:bg-gray-300 text-white font-bold py-2 px-4 rounded">
                    Cancel
                  </button>
                  <button onClick={handleSaveChanges} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manageuser;