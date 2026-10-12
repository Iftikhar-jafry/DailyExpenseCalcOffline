from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from threading import Lock

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "expense-data.json"
WRITE_LOCK = Lock()

app = Flask(__name__, static_folder=None)


def read_data() -> dict:
    if not DATA_FILE.exists():
        return {"_settings": {"totalMoney": 0}, "_monthlyExpenses": {"item": [], "price": []}}
    try:
        with DATA_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)
        if not isinstance(data, dict):
            raise ValueError("Expense data must be a JSON object.")
        data.setdefault("_settings", {"totalMoney": 0})
        data.setdefault("_monthlyExpenses", {"item": [], "price": []})
        return data
    except (json.JSONDecodeError, OSError, ValueError) as exc:
        app.logger.exception("Could not read expense data")
        raise RuntimeError("expense-data.json is invalid or cannot be read.") from exc


def validate_data(data: object) -> dict:
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object.")

    settings = data.get("_settings", {})
    if not isinstance(settings, dict):
        raise ValueError("'_settings' must be an object.")
    try:
        total_money = float(settings.get("totalMoney", 0))
    except (TypeError, ValueError) as exc:
        raise ValueError("'totalMoney' must be a number.") from exc
    if total_money < 0:
        raise ValueError("'totalMoney' cannot be negative.")

    monthly = data.get("_monthlyExpenses", {"item": [], "price": []})
    if not isinstance(monthly, dict):
        raise ValueError("'_monthlyExpenses' must be an object.")
    cleaned = {
        "_settings": {"totalMoney": total_money},
        "_monthlyExpenses": clean_expense_group(monthly, "_monthlyExpenses"),
    }

    for date_key, value in data.items():
        if date_key.startswith("_") or date_key == "totalMoney":
            continue
        if not isinstance(value, dict):
            raise ValueError(f"Expenses for {date_key} must be an object.")
        if len(date_key) != 10 or date_key[4:5] != "-" or date_key[7:8] != "-":
            raise ValueError(f"Invalid date key: {date_key}")
        cleaned[date_key] = clean_expense_group(value, date_key)
    return cleaned


def clean_expense_group(group: dict, label: str) -> dict:
    items, prices = group.get("item", []), group.get("price", [])
    if not isinstance(items, list) or not isinstance(prices, list):
        raise ValueError(f"'{label}' item and price must be arrays.")
    if len(items) != len(prices):
        raise ValueError(f"'{label}' item and price arrays must have the same length.")
    clean_items, clean_prices = [], []
    for item, price in zip(items, prices):
        name = str(item).strip()
        if not name:
            raise ValueError(f"'{label}' contains an empty item name.")
        try:
            amount = float(price)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"'{label}' contains a non-numeric price.") from exc
        if amount < 0:
            raise ValueError(f"'{label}' contains a negative price.")
        clean_items.append(name)
        clean_prices.append(amount)
    return {"item": clean_items, "price": clean_prices}


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "dailyExpences.html")


@app.get("/<path:filename>")
def static_files(filename: str):
    # Serve only files in the app directory (HTML references the CSS and JS here).
    return send_from_directory(BASE_DIR, filename)


@app.get("/api/data")
def get_data():
    try:
        return jsonify(read_data())
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 500


@app.put("/api/data")
def put_data():
    payload = request.get_json(silent=True)
    try:
        clean = validate_data(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        with WRITE_LOCK:
            # Write to a temporary file first so a failed write does not corrupt the current JSON.
            with tempfile.NamedTemporaryFile(
                "w", encoding="utf-8", dir=BASE_DIR, delete=False, suffix=".tmp"
            ) as temp_file:
                json.dump(clean, temp_file, indent=2, ensure_ascii=False)
                temp_file.write("\n")
                temp_path = Path(temp_file.name)
            os.replace(temp_path, DATA_FILE)
        return jsonify({"ok": True})
    except OSError:
        app.logger.exception("Could not save expense data")
        return jsonify({"error": "Could not write expense-data.json. Check folder permissions."}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
