import React, { useContext } from 'react'
import { assets } from '../assets/assets'
import { Link, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'   // no need for .jsx

const Navbar = () => {
  const { user, setShowLogin, logout, credit } = useContext(AppContext);
  const navigate = useNavigate();

  return (
    <div className='flex items-center justify-between py-4 w-full'>
      <Link to='/'>
        <img src={assets.newlogo2} alt="logo" className='w-28 sm:w-32 lg:w-40' />
      </Link>

      <div>
        {user ? (
          <div className='flex items-center gap-2 sm:gap-3'> 
            {/* Buy credits button */}
            <button 
              onClick={() => navigate('/buy')} 
              className='flex items-center gap-2 bg-blue-100 px-4 sm:px-6 py-1.5 sm:py-3 rounded-full hover:scale-105 transition-all duration-700'
            >
              <img src={assets.credit_star} alt="" className='w-5' /> 
              <p className='text-xs sm:text-sm font-medium text-gray-600'>
                Credits left : {credit}
              </p>
            </button>

            {/* User greeting */}
            <p className='text-gray-600 max-sm:hidden pl-4'>Hi, {user.name}</p>

            {/* Profile dropdown */}
            <div className='relative group'>
              <img src={assets.profile_icon} alt="" className='w-10 drop-shadow' />
              <div className='absolute hidden group-hover:block bg-white text-black rounded top-0 right-0 z-10 pt-12'>
                <ul className='list-none m-0 p-2 bg-white rounded-md border text-sm'>
                  <li 
                    onClick={logout} 
                    className='py-1 px-2 cursor-pointer pr-10 hover:bg-gray-100 rounded'
                  >
                    Logout
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className='flex items-center gap-2 sm:gap-5'> 
            <p onClick={() => navigate('/buy')} className='cursor-pointer'>Pricing</p>
            <button 
              onClick={() => setShowLogin(true)} 
              className='bg-zinc-800 text-white px-7 py-2 sm:px-10 text-sm rounded-full'
            >
              Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Navbar
