import json
import requests
from typing import List, Optional
from models.schemas import ProcessedDocument, TextChunk
from pydantic import BaseModel


class GeneratedFlashcard(BaseModel):
    question: str
    answer: str
    level: int = 0


class CardGenerator:
    """Service for generating flashcards from extracted text using LMStudio."""
    
    def __init__(self, lmstudio_url: str = "http://172.28.112.1:1234/v1"):
        """
        Initialize the CardGenerator with LMStudio endpoint.
        
        Args:
            lmstudio_url: The base URL for LMStudio API (default: local instance)
        """
        self.lmstudio_url = lmstudio_url
        self.chat_endpoint = f"{lmstudio_url}/chat/completions"
    
    def generate_cards_from_document(
        self, 
        document: ProcessedDocument,
        cards_per_chunk: int = 3,
        difficulty_level: int = 0
    ) -> List[GeneratedFlashcard]:
        """
        Generate flashcards from a ProcessedDocument containing text chunks.
        
        Args:
            document: ProcessedDocument with extracted text chunks
            cards_per_chunk: Number of flashcards to generate per text chunk
            difficulty_level: Difficulty level for generated cards (0-3)
        
        Returns:
            List of GeneratedFlashcard objects
        """
        all_cards = []
        
        for chunk in document.chunks:
            cards = self.generate_cards_from_text(
                text=chunk.text,
                num_cards=cards_per_chunk,
                difficulty_level=difficulty_level
            )
            all_cards.extend(cards)
        
        return all_cards
    
    def generate_cards_from_text(
        self,
        text: str,
        num_cards: int = 3,
        difficulty_level: int = 0
    ) -> List[GeneratedFlashcard]:
        """
        Generate flashcards from a single text string.
        
        Args:
            text: The text content to create flashcards from
            num_cards: Number of flashcards to generate
            difficulty_level: Difficulty level (0=easy, 1=medium, 2=hard, 3=expert)
        
        Returns:
            List of GeneratedFlashcard objects
        """
        if not text or not text.strip():
            return []
        
        # Create the prompt for LMStudio
        prompt = self._create_generation_prompt(text, num_cards, difficulty_level)
        
        try:
            response = self._call_lmstudio(prompt)
            cards = self._parse_response(response)
            
            # Set difficulty level
            for card in cards:
                card.level = difficulty_level
            
            return cards
        except Exception as e:
            print(f"Error generating cards from text: {e}")
            return []
    
    def _create_generation_prompt(
        self,
        text: str,
        num_cards: int,
        difficulty_level: int
    ) -> str:
        """Create a prompt for LMStudio to generate flashcards."""
        
        difficulty_descriptions = {
            0: "easy (basic facts and definitions)",
            1: "medium (conceptual understanding)",
            2: "hard (application and analysis)",
            3: "expert (synthesis and evaluation)"
        }
        
        difficulty = difficulty_descriptions.get(difficulty_level, "medium")
        
        prompt = f"""You are an expert at creating educational flashcards. 
        
Based on the following text, create exactly {num_cards} flashcards with {difficulty} questions and answers.

TEXT:
{text}

Generate the flashcards in the following JSON format:
{{
  "flashcards": [
    {{"question": "...", "answer": "..."}},
    {{"question": "...", "answer": "..."}}
  ]
}}

Requirements:
- Each question should be clear and concise
- Each answer should be informative but not too long (1-3 sentences)
- Questions should test understanding of the material
- Ensure variety in question types
- Return only valid JSON, no additional text

JSON Output:"""
        
        return prompt
    
    def _call_lmstudio(self, prompt: str, max_tokens: int = 2000) -> str:
        """
        Make a request to LMStudio API.
        
        Args:
            prompt: The prompt to send to the model
            max_tokens: Maximum tokens in the response
        
        Returns:
            The model's response text
        
        Raises:
            requests.RequestException: If the API call fails
        """
        payload = {
            "model": "local-model",  # LMStudio typically uses this name
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": max_tokens,
            "stream": False
        }
        
        response = requests.post(
            self.chat_endpoint,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        return result["choices"][0]["message"]["content"]
    
    def _parse_response(self, response: str) -> List[GeneratedFlashcard]:
        """
        Parse the LMStudio response and extract flashcards.
        
        Args:
            response: The raw response from LMStudio
        
        Returns:
            List of parsed GeneratedFlashcard objects
        """
        cards = []
        
        try:
            # Try to find JSON in the response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start == -1 or json_end == 0:
                raise ValueError("No JSON found in response")
            
            json_str = response[json_start:json_end]
            data = json.loads(json_str)
            
            # Extract flashcards from the JSON
            if "flashcards" in data:
                for card_data in data["flashcards"]:
                    if "question" in card_data and "answer" in card_data:
                        card = GeneratedFlashcard(
                            question=card_data["question"].strip(),
                            answer=card_data["answer"].strip()
                        )
                        cards.append(card)
            
            return cards
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            print(f"Error parsing response: {e}")
            print(f"Response: {response}")
            return []
