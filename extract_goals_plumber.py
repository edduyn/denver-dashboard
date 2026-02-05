
import pdfplumber

FILE = "Goals/Pita 2025.pdf"

def extract():
    print(f"Extracting {FILE} with pdfplumber...")
    try:
        with pdfplumber.open(FILE) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        
        print("--- CONTENT ---")
        print(text)
        print("--- END CONTENT ---")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract()
