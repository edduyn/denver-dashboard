
import pypdf
import os

FILE = "Goals/Pita 2025.pdf"

def extract():
    print(f"Extracting {FILE}...")
    try:
        reader = pypdf.PdfReader(FILE)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        print("--- CONTENT ---")
        print(text)
        print("--- END CONTENT ---")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract()
