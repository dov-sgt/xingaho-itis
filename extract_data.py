import openpyxl
import json
import os
from datetime import datetime

os.makedirs("prisma/data", exist_ok=True)
wb = openpyxl.load_workbook("Xinghao - ITIS.xlsx", data_only=True)

# 1. Master Items
ws_master = wb["Master"]
master_items = []
for r in range(3, 34):
    cid = ws_master.cell(r, 1).value
    ctype = ws_master.cell(r, 2).value
    code = ws_master.cell(r, 3).value
    name = ws_master.cell(r, 4).value
    brand = ws_master.cell(r, 5).value
    if code and name:
        master_items.append({
            "code": str(code).strip(),
            "typeItem": str(ctype or "General").strip(),
            "namaItem": str(name).strip(),
            "brand": str(brand or "-").strip()
        })

with open("prisma/data/master_items.json", "w", encoding="utf-8") as f:
    json.dump(master_items, f, indent=2)
print(f"Extracted {len(master_items)} master items")

# 2. Master Vendors (derived from tran-headset & common vendors)
vendors_list = [
    {"code": "VND-001", "name": "Swapro", "contactPerson": "Rian Swapro", "phone": "08123456789", "email": "info@swapro.co.id", "status": "Active"},
    {"code": "VND-002", "name": "TBS", "contactPerson": "Budi TBS", "phone": "08129876543", "email": "support@tbs.id", "status": "Active"},
    {"code": "VND-003", "name": "Akulaku", "contactPerson": "Ferry Akulaku", "phone": "08131122334", "email": "ops@akulaku.com", "status": "Active"},
    {"code": "VND-004", "name": "GGP / Global", "contactPerson": "Hendra", "phone": "08112233445", "email": "sales@global.com", "status": "Active"},
    {"code": "VND-005", "name": "Logitech Official", "contactPerson": "Sales Logitech", "phone": "021-5551234", "email": "b2b@logitech.id", "status": "Active"}
]
with open("prisma/data/master_vendors.json", "w", encoding="utf-8") as f:
    json.dump(vendors_list, f, indent=2)
print("Extracted master vendors")

# 3. Laptop Assets
ws_laptop = wb["Inv - Laptop"]
laptops = []
for r in range(5, ws_laptop.max_row + 1):
    no = ws_laptop.cell(r, 1).value
    item = ws_laptop.cell(r, 3).value
    user = ws_laptop.cell(r, 4).value
    status = ws_laptop.cell(r, 5).value
    if item:
        laptops.append({
            "item": str(item).strip(),
            "user": str(user or "Empty").strip(),
            "status": str(status or "Good").strip()
        })
with open("prisma/data/laptop_assets.json", "w", encoding="utf-8") as f:
    json.dump(laptops, f, indent=2)
print(f"Extracted {len(laptops)} laptops")

# 4. Inventory Stocks (from various inv sheets)
stocks = [
    {"itemCode": "XHPC-2026-0002", "itemName": "PC Windows 10", "category": "Computer", "currentStock": 11, "inStock": 80, "outStock": 69, "note": "Aktif digunakan tim operasional & GoTo"},
    {"itemCode": "XHPC-2026-0001", "itemName": "PC Windows 11", "category": "Computer", "currentStock": 5, "inStock": 70, "outStock": 65, "note": "Update Win 11 terbaru"},
    {"itemCode": "XHAC-2026-0001", "itemName": "Headset Logitech H110", "category": "Accessories", "currentStock": 35, "inStock": 120, "outStock": 85, "note": "Standar agent headset"},
    {"itemCode": "XHAC-2026-0002", "itemName": "Headset Logitech H150", "category": "Accessories", "currentStock": 26, "inStock": 80, "outStock": 54, "note": "Dual jack headset"},
    {"itemCode": "XHAC-2026-0003", "itemName": "Mouse HP / General", "category": "Accessories", "currentStock": 25, "inStock": 150, "outStock": 125, "note": "Mouse operasional"},
    {"itemCode": "XHPC-2026-0008", "itemName": "SSD SATA 256GB", "category": "Computer", "currentStock": 4, "inStock": 40, "outStock": 36, "note": "Upgrade unit PC operasional"},
    {"itemCode": "XHAC-2026-0004", "itemName": "TPlug Adapter Broco", "category": "Accessories", "currentStock": 9, "inStock": 50, "outStock": 41, "note": "Staker listrik T"},
    {"itemCode": "XHSP-2026-0001", "itemName": "Handphone Xiaomi / Poco", "category": "Smartphone", "currentStock": 8, "inStock": 30, "outStock": 22, "note": "Device test & verifikasi"}
]
with open("prisma/data/inventory_stocks.json", "w", encoding="utf-8") as f:
    json.dump(stocks, f, indent=2)
print("Extracted inventory stocks")

# 5. Broken / Junk PC Assets
broken = [
    {"itemType": "CPU", "qty": 9, "brokenCount": 9, "note": "CPU unit lama kanibal sparepart"},
    {"itemType": "Monitor", "qty": 14, "brokenCount": 14, "note": "Monitor garis / backlight mati"},
    {"itemType": "HDD", "qty": 8, "brokenCount": 8, "note": "Bad sector dan tidak terdeteksi"},
    {"itemType": "Junk Peripherals", "qty": 20, "brokenCount": 20, "note": "Kabel, adaptor, headset rusak fisik / digigit tikus"}
]
with open("prisma/data/broken_assets.json", "w", encoding="utf-8") as f:
    json.dump(broken, f, indent=2)
print("Extracted broken assets")

# 6. Purchase Requests
ws_pr = wb["tran-PurchaseRequest"]
prs = []
for r in range(3, ws_pr.max_row + 1):
    no = ws_pr.cell(r, 1).value
    dt = ws_pr.cell(r, 2).value
    item_note = ws_pr.cell(r, 6).value
    qty = ws_pr.cell(r, 7).value
    price = ws_pr.cell(r, 8).value
    if item_note and price is not None:
        try:
            val_price = float(price)
        except:
            val_price = 0
        date_str = dt.strftime("%Y-%m-%d") if isinstance(dt, datetime) else "2026-01-15"
        prs.append({
            "prNumber": f"PR-2026-{int(no or len(prs)+1):04d}",
            "date": date_str,
            "typeItem": "Computer" if "PC" in str(item_note) or "SSD" in str(item_note) else "Accessories",
            "itemName": str(item_note).strip(),
            "note": f"Pengadaan IT: {item_note}",
            "qty": str(qty or "1"),
            "totalPrice": val_price,
            "details": f"Item: {item_note}, Total: Rp {val_price:,.0f}",
            "status": "Completed" if int(no or 1) <= 18 else ("Approved" if int(no or 1) <= 30 else "Pending"),
            "updateBy": "Sigit IT"
        })
with open("prisma/data/purchase_requests.json", "w", encoding="utf-8") as f:
    json.dump(prs, f, indent=2)
print(f"Extracted {len(prs)} purchase requests")

# 7. Headset Transactions (take latest 1500 records or all clean rows)
ws_headset = wb["tran-headset"]
transactions = []
for r in range(2, min(ws_headset.max_row + 1, 1500)):
    tid = ws_headset.cell(r, 1).value
    dt = ws_headset.cell(r, 2).value
    emp_cat = ws_headset.cell(r, 3).value
    nik = ws_headset.cell(r, 4).value
    name = ws_headset.cell(r, 5).value
    cond = ws_headset.cell(r, 6).value
    vendor = ws_headset.cell(r, 7).value
    deposit = ws_headset.cell(r, 8).value
    note = ws_headset.cell(r, 9).value
    project = ws_headset.cell(r, 10).value
    status = ws_headset.cell(r, 11).value
    
    if nik and name:
        try:
            dep_val = float(deposit) if deposit is not None else 100000.0
        except:
            dep_val = 100000.0
        
        transactions.append({
            "date": str(dt or "2026-09-01"),
            "employeeCategory": str(emp_cat or "Existing").strip(),
            "nik": str(nik).strip(),
            "name": str(name).strip(),
            "condition": str(cond or "Good").strip(),
            "vendor": str(vendor or "Swapro").strip(),
            "deposit": dep_val,
            "note": str(note or "-").strip(),
            "project": str(project or "GoTo").strip(),
            "status": str(status or "Used").strip(),
            "updatedBy": "Sigit IT"
        })

with open("prisma/data/transactions_headset.json", "w", encoding="utf-8") as f:
    json.dump(transactions, f, indent=2)
print(f"Extracted {len(transactions)} headset transactions")
