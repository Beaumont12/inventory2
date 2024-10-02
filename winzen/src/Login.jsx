import React, { useState } from 'react';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import bgImage from '../src/assets/images/bgblack.png';
import { db, ref, get, child } from "../firebaseConfig";
import Sidebar from './Sidebar';
import ReCAPTCHA from 'react-google-recaptcha'; 

const Login = () => {
    const [staffId, setStaffId] = useState("");
    const [password, setPassword] = useState(""); 
    const [error, setError] = useState(""); 
    const [isLoggedIn, setIsLoggedIn] = useState(false); 
    const [captchaValue, setCaptchaValue] = useState(null);
  
    const handleLogin = async (e) => {
      e.preventDefault();
      setError("");
  
      if (!captchaValue) {
        setError("Please complete the CAPTCHA.");
        return;
      }
  
      try {
        const dbRef = ref(db); 
        const snapshot = await get(child(dbRef, "staffs")); 
  
        if (snapshot.exists()) {
          const staffs = snapshot.val();
          const staff = staffs[staffId]; 
  
          if (staff) {
            if (staff.Password === password) {
              alert(`Welcome back, ${staff.Name}!`);
              setIsLoggedIn(true); 
              
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
          className={`relative h-screen flex justify-start items-center bg-cover bg-center ${isLoggedIn ? 'hidden' : 'block'} w-full pl-60`}
          style={{ backgroundImage: `url(${bgImage})` }}
        >
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className="relative z-10 bg-[#ECEAEB] bg-opacity-90 p-8 rounded-xl shadow-lg max-w-md w-full text-center">
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
              <div className="mb-4 text-right">
                <a href="#" className="text-main-green hover:underline text-sm">
                  Forgot Password?
                </a>
              </div>
              <div className="mb-4 flex justify-center">
                <ReCAPTCHA
                  sitekey="6LeryFUqAAAAAM0hUPAVVL7Uy4vtgA-kbKVXkdJB"
                  onChange={(value) => setCaptchaValue(value)}
                  theme="dark"
                />
              </div>
              {error && <div className="text-red-500 mb-4">{error}</div>}
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

export default Login;