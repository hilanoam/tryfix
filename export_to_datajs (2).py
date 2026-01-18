import json
import pandas as pd

# 1) עדכני את הנתיב לקובץ האקסל שלך:
XLSX_PATH = r"./טבלה_חדשה_למחשבון_כולל_מקצוע_ותמריץ.xlsx"
SHEET = "DATA_LONG"

# 2) קוראים את האקסל
df = pd.read_excel(XLSX_PATH, sheet_name=SHEET).fillna("")

# 3) ממירים ל-Records
records = df.to_dict(orient="records")

# 4) כותבים data.js (עובד בלי Live Server)
with open("data.js", "w", encoding="utf-8") as f:
    f.write("window.SALARY_DATA = ")
    json.dump(records, f, ensure_ascii=False)
    f.write(";\n")

print("✅ נוצר data.js (ודאי שהוא באותה תיקייה של index.html)")
