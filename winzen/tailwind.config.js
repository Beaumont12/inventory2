/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "black": '#132B2B',
        'dark-green': '#1E3B36',
        'green': '#295148',
        'light-green': '#3D615D',
        'main-green': '#203B36',
        'light-white': 'rgba(255,255,255,0.18)',
        'darkest-honey': '#BF8936',
        'darker-honey': '#CD9E42',
        'dark-honey': '#E0AD50',
        'honey': '#E5BB69',
        'light-honey': '#FFD283',
        'main-honey': '#DDB04B'
      },
    },
  },
  plugins: [],
}

