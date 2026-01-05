# Twitch Top Clips 🎬 -> 📱

An automated tool to discover top Twitch clips, convert them into viral vertical formats (9:16), and publish them directly to TikTok.

## 🚀 Features

*   **Discovery**: Browse top clips by Game or Streamer.
*   **Smart Formatting**:
    *   **Blur Background**: Fills empty space with a blurred version of the video.
    *   **Split Screen (Facecam)**: Manually select the facecam area to stack it above the gameplay.
*   **Customization**: Add customizable titles with emoji support.
*   **Direct Publishing**: Authenticate with TikTok to upload and publish videos directly from the app.
*   **Local Processing**: All video editing is done locally on your machine using Python & MoviePy.

## 🛠 Prerequisites

*   **Node.js** (v18+)
*   **Python** (v3.10+)
*   **FFmpeg** (Required for video processing)
*   **ImageMagick** (Required for text rendering in MoviePy)

## 📦 Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-username/twitch-top-clips.git
cd twitch-top-clips
```

### 2. Backend Setup
The backend handles the API, database (if any), and runs the AI video processing engine.

```bash
cd api
npm install
```

**Python Environment:**
Create a virtual environment and install dependencies:

```bash
cd ai_engine
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

**Environment Variables:**
Create a `.env` file in the `api` directory:

```bash
cp .env.example .env
```

Fill in your API keys in `api/.env`:
*   `TWITCH_CLIENT_ID` & `TWITCH_CLIENT_SECRET`: From [Twitch Developers](https://dev.twitch.tv/console).
*   `TIKTOK_CLIENT_KEY` & `TIKTOK_CLIENT_SECRET`: From [TikTok Developers](https://developers.tiktok.com/) (Required for publishing).

### 3. Frontend Setup
The frontend is a React application built with Vite.

```bash
cd ../frontend
npm install
```

## ▶️ Usage

1.  **Start the Backend:**
    ```bash
    cd api
    npm run dev
    ```
    To ensure python scripts run correctly, make sure you are in the virtual env or the backend can find the python executable.

2.  **Start the Frontend:**
    ```bash
    cd frontend
    npm run dev
    ```

3.  **Open the App:**
    Go to `http://localhost:5173` in your browser.

## 📝 License

This project is licensed under the **CC BY-NC 4.0** (Creative Commons Attribution-NonCommercial 4.0).
You are free to use and modify this code for personal use. **Commercial use is strictly prohibited** without prior consent.
See [LICENSE](LICENSE) (if created) or [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md) for details.

## 🛡 Privacy

This tool runs locally. No personal data is sent to our servers.
See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for more information.
