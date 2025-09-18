/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slack: {
          purple: '#4A154B',
          purpleDark: '#350735',
          purpleLight: '#611f69',
          green: '#007A5A',
          red: '#E01E5A',
          yellow: '#ECB22E',
          blue: '#2EB67D',
          sidebar: '#3F0E40',
          hover: '#350D36',
          border: '#522653',
          text: '#D1D2D3',
          bg: '#1A1D21',
          message: '#222529',
          messagehover: '#2A2D31'
        }
      },
      fontFamily: {
        'slack': ['Slack-Lato', 'Lato', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

