# ♻️ ReciclaCerto

> A web application that simplifies daily recycling by providing AI-powered waste disposal guidance via **Google Gemini 2.0 Flash** and interactive mapping of recycling drop-off points using **Leaflet.js** and **OpenStreetMap**.

![Python](https://img.shields.io/badge/Python-000000?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-000000?style=for-the-badge&logo=googlegemini&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-000000?style=for-the-badge&logo=leaflet&logoColor=white)
![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-000000?style=for-the-badge&logo=openstreetmap&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-000000?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-000000?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-000000?style=for-the-badge&logo=javascript&logoColor=white)

## Demonstration

![System Demonstration](results/display.gif)

## Key Features

- 🔍 **AI-Powered Item Verification**: Search any item (e.g., _PET bottle, battery, styrofoam, toothbrush_) to instantly receive recyclability status and tailored preparation instructions powered by **Google Gemini 2.0 Flash**.
- 📍 **Interactive Drop-off Points Map**: Locate nearby recycling centers and eco-points in São Paulo directly on an embedded **Leaflet.js** map with custom markers, accepted material details, and distance calculation.
- 🗺️ **Geolocation & Address Lookup**: Find drop-off centers near you using browser GPS geolocation or by entering any neighborhood/address via the OpenStreetMap Nominatim geocoding API.
- 🏢 **Cooperative Registration (Prototype)**: Interactive registration form designed for recycling cooperatives and drop-off points to expand the partner network.

## Tech Stack

### **Backend & AI**

- **Python 3.x**: Primary programming language.
- **Flask**: Lightweight WSGI web application framework and REST API server.
- **Google Generative AI SDK (`google-generativeai`)**: Integration with **Gemini 2.0 Flash** configured for structured JSON output (`application/json`).
- **python-dotenv**: Secure environment variable management.

### **Frontend & Mapping**

- **HTML5 & CSS3**: Responsive UI styled with custom CSS variables, eco-themed color palette, and Google Fonts (_Outfit_ and _Inter_).
- **JavaScript (ES6+)**: Asynchronous API requests (`fetch`), DOM manipulation, and dynamic Leaflet integration.
- **Leaflet.js**: Open-source JavaScript library for interactive maps.
- **OpenStreetMap & Nominatim**: Open map tile provider and location geocoding service.

## Getting Started

### Prerequisites

- Python 3.8 or higher installed.
- A **Google Gemini API Key** ([Obtain an API Key from Google AI Studio](https://aistudio.google.com/)).

### Installation & Execution

1. **Clone the repository**:

   ```bash
   git clone https://github.com/vitoriapguimaraes/reciclaCerto.git
   cd reciclaCerto
   ```

2. **Create and activate a virtual environment**:
   - **Windows**:

     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```

   - **Linux / macOS**:

     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   Create a `.env` file in the project root directory with your Gemini API key:

   ```env
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
   ```

5. **Run the application**:

   ```bash
   python scripts/app.py
   ```

6. **Access in browser**:
   Open [http://127.0.0.1:5000/](http://127.0.0.1:5000/) in your web browser.

## How to Use

1. In the **Check Item** section, type the name of an item (e.g., `"fluorescent bulb"`, `"milk carton"`, `"battery"`) and click **Check** (or press _Enter_).
2. Review the recyclability badge and specific preparation instructions.
3. In the **Interactive Collection Points** section, click **Use My Location** or type a São Paulo neighborhood/address and click **Search by Address**.
4. Explore the interactive map, click markers to inspect center details, and view driving directions on OpenStreetMap.

## Directory Structure

```bash
reciclaCerto/
├── .env                            # Environment variables (API Keys)
├── .gitignore                      # Git ignore rules
├── LICENSE                         # License file
├── Procfile                        # Deployment configuration (Heroku / Render)
├── requirements.txt                # Python project dependencies
├── readme.md                       # Main documentation file
├── data/
│   └── pontos_reciclagem_sp.json   # Mock database of eco-points and recycling cooperatives in SP
├── results/
│   └── display.gif                 # System demonstration GIF
├── scripts/
│   └── app.py                      # Flask backend and Gemini API integration
├── static/
│   ├── background.png              # Background image
│   ├── script.js                   # Frontend scripts and Leaflet.js map logic
│   └── style.css                   # Responsive CSS styles and design system
└── templates/
    └── index.html                  # Main web application template
```

## Project Status

✅ **Completed and Optimized**

> Check [GitHub Issues](https://github.com/vitoriapguimaraes/reciclaCerto/issues) to suggest enhancements or report issues.

## License

This project is licensed under the terms of the **MIT License**. See the [LICENSE](LICENSE) file for details.

## Author

Developed by **Vitória Pistori**.

- GitHub: [@vitoriapguimaraes](https://github.com/vitoriapguimaraes)
- Qualifications and certifications available in the [Documents Folder](https://github.com/vitoriapguimaraes/vitoriapguimaraes/tree/main/DOCUMENTOS).
