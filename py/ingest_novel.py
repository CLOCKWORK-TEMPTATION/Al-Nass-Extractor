import os
import sys
import json
import time
from typing import List, Dict, Any
from google import genai
from tqdm import tqdm
from dotenv import load_dotenv

# Fix Unicode encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Configuration
API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "models/gemini-3-flash-preview"

class NovelIngester:
    def __init__(self, novel_path: str, novel_id: str = None):
        self.novel_path = novel_path
        self.novel_name = os.path.basename(novel_path).split('.')[0]
        self.novel_id = novel_id or self.novel_name.replace(" ", "_")
        self.characters = {}  # ID -> Character Data
        self.dialogues = []
        self.client = None

        if API_KEY:
            self.client = genai.Client(api_key=API_KEY)

        # Load text - supports both .txt and .json (from PDF extraction)
        self.text = self._load_text(novel_path)

    def _load_text(self, path: str) -> str:
        """Load text from file. Supports .txt and .json (PDF extraction format)."""
        file_ext = os.path.splitext(path)[1].lower()

        with open(path, 'r', encoding='utf-8') as f:
            if file_ext == '.json':
                # JSON format: {"pages": [{"page": 1, "text": "..."}, ...]}
                data = json.load(f)
                if "pages" in data:
                    # Extract text from all pages
                    full_text = "\n\n".join([page.get("text", "") for page in data["pages"]])
                    print(f"Loaded JSON with {len(data['pages'])} pages ({len(full_text):,} characters)")
                    return full_text
                else:
                    raise ValueError("JSON file must have 'pages' key with page objects")
            else:
                # Plain text file
                return f.read()

    def chunk_text(self, chunk_size=15000, overlap=500):
        """Split text into overlapping chunks."""
        chunks = []
        start = 0
        while start < len(self.text):
            end = min(start + chunk_size, len(self.text))
            chunks.append(self.text[start:end])
            if end == len(self.text):
                break
            start += chunk_size - overlap
        return chunks

    def extract_from_chunk(self, chunk_text: str, chunk_index: int):
        """Use Gemini to extract characters and dialogues from a chunk."""
        if not self.client:
            raise ValueError("GEMINI_API_KEY is not set.")

        prompt = f"""
        You are an expert literary analyst. Analyze the following text from the Arabic novel "{self.novel_name}".
        
        Extract the following information in valid JSON format:
        1. "characters": A list of characters appearing or mentioned in this text.
           - name: Name in Arabic.
           - description: Brief description.
           - role: Role in the scene (e.g., Speaker, Mentioned).
           - traits: List of personality traits observed.
           
        2. "dialogues": A list of dialogue exchanges.
           - type: "conversation" or "monologue".
           - participants: List of character names involved.
           - exchanges: List of lines.
             - speaker: Name of the speaker.
             - text: The dialogue text.
             - emotion: The emotion associated with the line (e.g., angry, sad, happy).
        
        Text Segment:
        {chunk_text}
        
        Output must be pure JSON only.
        """
        
        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )
            
            # basic cleaning of md blocks
            text_resp = response.text.strip()
            if text_resp.startswith("```json"):
                text_resp = text_resp[7:-3]
            elif text_resp.startswith("```"):
                text_resp = text_resp[3:-3]
                
            data = json.loads(text_resp)
            return data
        except Exception as e:
            print(f"Error processing chunk {chunk_index}: {e}")
            return None

    def process_novel(self):
        chunks = self.chunk_text()
        print(f"Processing {len(chunks)} chunks for {self.novel_name}...")
        
        for i, chunk in tqdm(enumerate(chunks), total=len(chunks)):
            data = self.extract_from_chunk(chunk, i)
            if data:
                self._merge_data(data, i)
            time.sleep(1) # Rate limiting
            
        return self.characters, self.dialogues

    def _merge_data(self, data: Dict, chunk_index: int):
        # Merge Characters
        for char in data.get("characters", []):
            name = char.get("name")
            if not name: continue
            
            # Simple deduplication by name (could be improved with embeddings)
            char_id = name.strip()  # Use name as temp ID
            
            if char_id not in self.characters:
                self.characters[char_id] = {
                    "character_id": char_id,
                    "novel_id": self.novel_id,
                    "name": name,
                    "traits": set(),
                    "roles": set(),
                    "mentions": 1
                }
            
            # Update existing
            c_entry = self.characters[char_id]
            if "traits" in char:
                c_entry["traits"].update(char["traits"])
            if "role" in char:
                c_entry["roles"].add(char["role"])
            c_entry["mentions"] += 1

        # Merge Dialogues
        for dial in data.get("dialogues", []):
            dial["novel_id"] = self.novel_id
            dial["chunk_index"] = chunk_index
            self.dialogues.append(dial)

    def save_results(self, output_dir: str):
        # Convert sets to lists for JSON serialization
        final_chars = []
        for c in self.characters.values():
            c["traits"] = list(c["traits"])
            c["roles"] = list(c["roles"])
            final_chars.append(c)
            
        os.makedirs(output_dir, exist_ok=True)
        
        # Save Characters
        char_path = os.path.join(output_dir, f"{self.novel_id}_characters.json")
        with open(char_path, 'w', encoding='utf-8') as f:
            json.dump(final_chars, f, ensure_ascii=False, indent=2)
            
        # Save Dialogues
        dial_path = os.path.join(output_dir, f"{self.novel_id}_dialogues.json")
        with open(dial_path, 'w', encoding='utf-8') as f:
            json.dump(self.dialogues, f, ensure_ascii=False, indent=2)
            
        print(f"Saved results to {output_dir}")

def main():
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python ingest_novel.py <novel_path>")
        sys.exit(1)
        
    novel_path = sys.argv[1]
    
    # Check for API Key
    if not os.getenv("GEMINI_API_KEY"):
        print("Error: GEMINI_API_KEY environment variable not set.")
        try:
            key = input("Please enter your Gemini API Key: ").strip()
            os.environ["GEMINI_API_KEY"] = key
        except KeyboardInterrupt:
            sys.exit(1)

    ingester = NovelIngester(novel_path)
    ingester.process_novel()
    ingester.save_results("ingestion_output")

if __name__ == "__main__":
    main()
