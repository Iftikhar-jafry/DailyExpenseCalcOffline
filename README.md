# Daily Expense Tracker

A personal expense tracker built with HTML, CSS, vanilla JavaScript, Flask, and a JSON file for persistent storage.

## Features

- Daily expenses grouped by date
- Separate monthly expenses (for example, haircuts and clothing)
- Monthly budget, total spent, remaining balance, and daily allowance
- Automatically loads existing data when the app starts
- Automatically saves budget and saved expenses to `expense-data.json`
- Responsive layout with a right-side vertical list of daily and monthly items

## Run locally

**Python and a running Flask server are required for automatic saving.** Opening `dailyExpences.html` directly in the browser will not connect to the backend.

1. Install Python 3.10 or newer.
2. Open a terminal in this repository folder.
3. Install the dependency:

   ```bash
   python -m pip install -r requirements.txt
   ```

4. Start the server:

   ```bash
   python app.py
   ```

5. Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

The app reads and writes `expense-data.json` in the project folder through the `/api/data` endpoint. Keep the terminal/server running while using the app. Changes to the budget, saved daily expenses, and monthly expenses are saved automatically.

## JSON structure

```json
{
  "_settings": {
    "totalMoney": 30000
  },
  "_monthlyExpenses": {
    "item": ["Haircut", "Pent shirt"],
    "price": [500, 1800]
  },
  "2026-10-12": {
    "item": ["Food", "Transport"],
    "price": [100, 120]
  }
}
```

Daily records use date keys in `YYYY-MM-DD` format. Monthly expenses are stored separately and count toward total spending and remaining balance, but are not included in a particular day's total.

## Important

- Back up `expense-data.json` before making major changes.
- This local Flask server listens on `127.0.0.1` only by default.
- GitHub Pages serves static files only; it cannot run this Flask backend. Deploy the Flask app to a Python-capable host if you need remote access.
