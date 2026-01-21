/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Configure the content for all your files
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: '#00C2FF', // Vibrant Cyan (Pop Theme)
                secondary: '#FF4785', // Pop Pink (Pop Theme)
                accent: '#FFE600', // Bright Yellow (Pop Theme)
                background: '#F0F4F8',
            },
            boxShadow: {
                'pop': '4px 4px 0px 0px rgba(0,0,0,1)',
            },
        },
    },
    plugins: [],
}
