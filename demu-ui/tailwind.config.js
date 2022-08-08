/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,jsx}"],
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: "#FFCC00",

          secondary: "#99D5C9",

          accent: "#D81159",

          neutral: "#001489",

          "base-100": "#003399",

          info: "#76AAE5",

          success: "#1B6A5E",

          warning: "#F6D465",

          error: "#EC6F98",
        },
      },
    ],
  },
};
