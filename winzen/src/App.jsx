import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import bgImage from '../src/assets/images/winzenbg.png';
import { db, ref, get, child } from "../firebaseConfig";
import Sidebar from './Sidebar';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for routing
import Home from './components/Home';

const App = () => {
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState(""); 
  const [error, setError] = useState(""); 
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const loggedInUser = localStorage.getItem("isLoggedIn");
    return loggedInUser === "true"; // Initialize state based on local storage
  }); 
  const [captchaValue, setCaptchaValue] = useState(null);
  const navigate = useNavigate(); // Initialize the navigate function

  useEffect(() => {
    // Use the useEffect hook to listen for changes to the local storage.
    const handleStorageChange = () => {
      const loggedInUser = localStorage.getItem("isLoggedIn");
      setIsLoggedIn(loggedInUser === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []); // Removed isLoggedIn from dependency array

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const dbRef = ref(db); 
      const snapshot = await get(child(dbRef, "staffs")); 

      if (snapshot.exists()) {
        const staffs = snapshot.val();
        const staff = staffs[staffId]; 

        if (staff) {
          if (staff.Password === password) {
            // Check if the role is Admin or Super Admin
            if (staff.Role === "Admin" || staff.Role === "Super Admin") {
              alert(`Welcome back, ${staff.Name}!`);
              setIsLoggedIn(true); // Update the state

              // Save user data to local storage
              const userData = {
                staffId: staffId,
                role: staff.Role,
                email: staff.Email,
                name: staff.Name,
                phone: staff.Phone,
                age: staff.Age,
                imageUrl: staff.ImageUrl,
                password: staff.Password,
              };
              localStorage.setItem("userData", JSON.stringify(userData));
              localStorage.setItem("isLoggedIn", "true"); // Save logged-in state to local storage

              // Navigate to home page
              navigate("/home"); // Ensure this is set up correctly in your routing
            } else {
              setError("Access restricted to Admin and Super Admin only.");
            }
          } else {
            setError("Invalid Password. Please try again.");
          }
        } else {
          setError("Invalid Staff ID. Please try again.");
        }
      } else {
        setError("No staff data found. Please contact the administrator.");
      }
    } catch (error) {
      setError("Error fetching staff data. Please try again later.");
    }
  };

  return (
    <div className="flex">
      {isLoggedIn && <Sidebar />} 
      <div
        className={`relative h-screen flex justify-start items-center bg-cover bg-center ${isLoggedIn ? 'hidden' : 'block'} w-full pl-32`}
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative z-10 bg-[#ECEAEB] bg-opacity-90 p-8 rounded-xl shadow-lg shadow-gray-600 max-w-md w-full text-center">
          <div className="mb-4">
            <img
              src="../src/assets/images/resizedlogo.png"
              alt="Winzen's Cafe"
              className="mx-auto w-20 mb-4"
            />
            <h1 className="text-2xl font-semibold text-main-green mb-4">Winzen's Cafe</h1>
            <h2 className='text-1xl font-thin text-gray-600'>Log in to Stay Brewed and Connected</h2>
          </div>
          <form onSubmit={handleLogin}>
            <div className="mb-6 text-left relative">
              <label className="block text-dark-green font-medium mb-2">Staff ID</label>
              <div className="flex items-center border border-gray-100 rounded-md px-3 py-2">
                <FaEnvelope className="text-main-green mr-3" />
                <input
                  type="text"
                  className="w-full border-none focus:ring-0 focus:outline-none bg-transparent"
                  placeholder="Enter your Staff ID"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="mb-6 text-left relative">
              <label className="block text-dark-green font-medium mb-2">Password</label>
              <div className="flex items-center border border-gray-100 rounded-md px-3 py-2">
                <FaLock className="text-main-green mr-3" />
                <input
                  type="password"
                  className="w-full border-none focus:ring-0 focus:outline-none bg-transparent"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            {error && <div className="text-red-500 mb-4 mt-2">{error}</div>}
            <button
              type="submit"
              className="w-full bg-main-green text-main-honey py-2 px-4 rounded-md hover:bg-dark-green transition-all"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;
