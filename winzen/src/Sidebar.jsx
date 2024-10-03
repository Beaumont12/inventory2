import React, { useState, useEffect } from 'react';
import { BsArrowLeftShort, BsBox2Fill, BsSearch, BsChevronDown, BsCartCheckFill, BsCartFill, BsCartPlusFill } from "react-icons/bs";
import { GiThreeLeaves } from "react-icons/gi";
import { RiDashboardFill } from "react-icons/ri";
import { BiSolidCategory } from "react-icons/bi";
import { IoMdAnalytics } from "react-icons/io";
import { FaHistory, FaUsers, FaUserPlus } from "react-icons/fa";
import { AiOutlineLogout } from "react-icons/ai";
import { MdAddBox } from "react-icons/md";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Loader from 'react-js-loader';
import Orders from './components/Orders';
import Managecategory from './components/Managecategory';
import Home from './components/Home';
import Addcategory from './components/Addcategory';
import Manageproducts from './components/Manageproducts';
import Addproducts from './components/Addproducts';
import History from './components/History';
import Overallsale from './components/Overallsale';
import Ingredients from './components/inventory/Ingredients';
import Utensils from './components/inventory/Utensils';
import Inventory from './components/inventory/Inventory';
import Manageuser from './components/Manageuser';
import Adduser from './components/Adduser';
import App from './App';

const Sidebar = ({ isLoggedIn, setIsLoggedIn }) => {
    const [open, setOpen] = useState(false);
    const [openSubmenu, setOpenSubmenu] = useState({});
    const location = useLocation(); 
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const userData = JSON.parse(localStorage.getItem("userData"));
    const role = userData ? userData.role : null;

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            navigate("/home");
        }
    }, [isLoggedIn, navigate]);

    const handleLogout = () => {
        localStorage.removeItem("isLoggedIn"); 
        localStorage.removeItem("userData");
        setIsLoggedIn(false); 
        navigate("/logout"); 
    };       

    const Menus = [
        { title: "Dashboard", path: "/home", icon: <RiDashboardFill />, roles: ["Admin", "Super Admin"] },
        { title: "Mange Orders", path: "/orders", icon: <BsCartCheckFill />, roles: ["Admin", "Super Admin"] },
        { title: "Manage Categories", path: "/manage-categories", icon: <BiSolidCategory />, roles: ["Admin", "Super Admin"] },
        { title: "Add Categories", path: "/add-categories", icon: <MdAddBox />, roles: ["Admin", "Super Admin"] },
        { title: "Manage Products", path: "/manage-products", icon: <BsCartFill />, roles: ["Admin", "Super Admin"] },
        { title: "Add Products", path: "/add-products", icon: <BsCartPlusFill />, roles: ["Admin", "Super Admin"] },
        {
            title: "Stocks",
            spacing: true,
            submenu: true,
            path: "/stocks",
            icon: <BsBox2Fill />,
            submenuItems: [
                { title: "Submenu 1", path: "/submenu1", roles: ["Admin", "Super Admin"] }, 
                { title: "Submenu 2", path: "/submenu2", roles: ["Admin", "Super Admin"] }, 
                { title: "Submenu 3", path: "/submenu3", roles: ["Admin", "Super Admin"] },
                { title: "Submenu 4", path: "/submenu4", roles: ["Admin", "Super Admin"] },
            ], roles: ["Admin", "Super Admin"]

        },
        { title: "Transactions", path: "/transactions", spacing: true, icon: <FaHistory />, roles: ["Admin", "Super Admin"] },
        { title: "Sales Report", path: "/sales-report", icon: <IoMdAnalytics />, roles: ["Admin", "Super Admin"] },
        { title: "Manage Users", path: "/manage-users", spacing: true, icon: <FaUsers />, roles: ["Super Admin"] },
        { title: "Add Users", path: "/add-users", icon: <FaUserPlus />, roles: ["Super Admin"] },
        { title: "Logout", path: "/logout", spacing: true, icon: <AiOutlineLogout />, onClick: handleLogout, roles: ["Admin", "Super Admin"], element: <App/> },
    ];

    const filteredMenus = Menus.filter(menu => !menu.roles || menu.roles.includes(role));

    if (loading) {
        return (
            <div className="flex flex-col justify-center text-center items-center h-screen bg-main-green w-full">
                <Loader type="heart" bgColor={"#BF8936"} color={"#BF8936"} size={300} />
                <h2 className="text-darkest-honey text-2xl mt-12 align-middl font-bold">Please Wait a Moment</h2>
            </div>
        );
    }

    return (
        <div className='flex h-screen w-full'>
            <style>
                {`
                /* Add custom scrollbar styles */
                ::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }

                ::-webkit-scrollbar-track {
                    background: transparent;
                }

                ::-webkit-scrollbar-thumb {
                    background: transparent;
                }

                ::-webkit-scrollbar-thumb:hover {
                    background: transparent;
                }
                `}
            </style>
            {/* Sidebar */}
            <div className={`bg-main-green h-full p-5 pt-8 ${open ? 'w-72 min-w-72' : 'w-20 min-w-20'} duration-300 relative overflow-auto`}>
                <div className="absolute top-1 right-1">
                    <BsArrowLeftShort 
                        className={`bg-white text-main-green text-3xl rounded-full border border-main-green cursor-pointer ${!open && 'rotate-180'}`} 
                        onClick={() => setOpen(!open)} 
                    />
                </div>
                <div className='inline-flex'>
                    <GiThreeLeaves className={`bg-main-honey text-4xl rounded-full cursor-pointer block float-left
                    mr-2 flex-shrink-0 ${open && 'rotate-[360deg]'} duration-700 p-1`} />
                    <h1 className={`text-white origin-left font-medium text-2xl ${!open && 'hidden'}`}>Winzen's Cafe</h1>
                </div>
                <div className={`flex items-center rounded-md bg-light-white mt-6 ${!open ? 'px-2.5' : 'px-4'} py-2`}>
                    <BsSearch className={`text-white text-lg block float-left cursor-pointer ${open && 'mr-2'}`} />
                    <input type={"search"}
                        placeholder='Search' className={`text-base bg-transparent w-full text-white focus:outline-none ${!open && 'hidden'}`} />
                </div>

                {/* Menu List */}
                <ul className='pt-2'>
                {filteredMenus.map((menu) => (
                    <React.Fragment key={menu.title}>
                        <li>
                            <NavLink
                                to={menu.path}
                                className={({ isActive }) =>
                                    `text-gray-300 text-sm flex items-center gap-x-4 cursor-pointer
                                    p-2 hover:bg-light-white hover:text-white rounded-md 
                                    ${menu.spacing ? 'mt-9' : 'mt-2'} ${isActive ? 'bg-main-honey text-main-green' : ''}`
                                }
                                onClick={menu.onClick}
                            >
                                <span className='text-2xl block float-left'>{menu.icon ? menu.icon : <RiDashboardFill />}</span>
                                <span className={`text-base font-medium flex-1 duration-200 ${!open && 'hidden'}`}>
                                    {menu.title}
                                </span>
                                {menu.submenu && open && (
                                    <BsChevronDown className={`${openSubmenu[menu.title] && 'rotate-180'}`}
                                        onClick={() => setOpenSubmenu(prev => ({ ...prev, [menu.title]: !prev[menu.title] }))} />
                                )}
                            </NavLink>
                        </li>
                        {/* Submenu Items */}
                        {menu.submenu && openSubmenu[menu.title] && open && (
                            <ul>
                                {menu.submenuItems.map((submenuItem) => (
                                    <li key={submenuItem.title}>
                                        <NavLink 
                                            to={submenuItem.path}
                                            className={({ isActive }) =>
                                                `text-sm flex items-center gap-x-4 cursor-pointer p-2 px-12 rounded-md ${
                                                    isActive ? "text-main-honey" : "text-gray-300 hover:bg-light-white"
                                                }`
                                            }>
                                            <span className='text-2xl block float-left'>{menu.icon ? menu.icon : <RiDashboardFill />}</span>
                                            <span>{submenuItem.title}</span>
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </React.Fragment>
                ))}
            </ul>
        </div>

        {/* Content Area */}
        <div className='flex-grow overflow-auto'>
            <Routes>
                <Route path="/home" element={<Home/>} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/manage-categories" element={<Managecategory/>} />
                <Route path="/add-categories" element={<Addcategory/>} />
                <Route path="/manage-products" element={<Manageproducts/>} />
                <Route path="/add-products" element={<Addproducts/>} />
                <Route path="/stocks" element={<Inventory/>} />
                <Route path="/submenu1" element={<Ingredients/>} />
                <Route path="/submenu2" element={<Utensils/>} />
                <Route path="/submenu3" element={<div>Submenu 3 Page</div>} />
                <Route path="/submenu4" element={<div>Submenu 4 Page</div>} />
                <Route path="/transactions" element={<History/>} />
                <Route path="/sales-report" element={<Overallsale/>} />
                <Route path="/manage-users" element={<Manageuser/>} />
                <Route path="/add-users" element={<Adduser/>} />
            </Routes>
        </div>
    </div>
    );
}

export default Sidebar;