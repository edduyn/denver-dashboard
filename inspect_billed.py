
import pandas as pd

FILE = "processed/20260205_082322_BILLED_WO 02-05-26 8-18AM.xls"

def inspect():
    try:
        df = pd.read_excel(FILE)
        # Find header
        for i, row in df.head(30).iterrows():
            row_str = [str(x).lower() for x in row.values]
            if "invoice" in row_str and "billed" in row_str:
                print(f"Header found at row {i}")
                print(row.values)
                return
        print("Header not found")
    except Exception as e:
        print(e)

if __name__ == "__main__":
    inspect()
