import json
from turtle import mode
import requests
from typing import List, Optional, Literal, Any
from enum import Enum
from models.schemas import ProcessedDocument, TextChunk
from pydantic import BaseModel
import logging
import time # Import time to track duration

# Configure logging (you can also do this in your main.py)
logging.basicConfig(
    level=logging.INFO, # Change to DEBUG for detailed LLM responses
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("CardGen")

class PlannedConcept(BaseModel):
    id: str
    concept: str
    question: str
    evidence: str
    confidence: float
    should_generate: bool


class GeneratedFlashcard(BaseModel):
    question: str
    answer: str
    level: int = 0

class CandidateConcept(BaseModel):
    id: str
    raw_question: str
    evidence: str
    potential_answer: str
    relevance_score: float  # LLM's initial guess on importance
    is_redundant: bool = False

class LLMProvider(str, Enum):
    """Available LLM providers for card generation."""
    LMSTUDIO = "lmstudio"
    OPENAI = "openai"


class CardGenerator:
    """Service for generating flashcards from extracted text using LLM providers."""
    
    def __init__(
        self,
        provider: Literal["lmstudio", "openai"] = "lmstudio",
        lmstudio_url: str = "http://127.0.0.1:1234/v1",
        openai_api_key: Optional[str] = None,
        openai_model: str = "gpt-4.1-nano"
    ):
        """
        Initialize the CardGenerator with specified LLM provider.
        
        Args:
            provider: LLM provider to use ("lmstudio" or "openai")
            lmstudio_url: The base URL for LMStudio API (default: local instance)
            openai_api_key: API key for OpenAI (required if provider is "openai")
            openai_model: Model name to use with OpenAI (default: gpt-3.5-turbo)
        
        Raises:
            ValueError: If provider is "openai" but no API key is provided
        """
        self.provider = LLMProvider(provider)
        self.openai_api_key = openai_api_key
        self.openai_model = openai_model
        
        if self.provider == LLMProvider.LMSTUDIO:
            self.lmstudio_url = lmstudio_url
            self.lmstudio_endpoint = f"{lmstudio_url}/chat/completions"
        elif self.provider == LLMProvider.OPENAI:
            if not openai_api_key:
                raise ValueError("OpenAI API key is required when using OpenAI provider")
            self.openai_endpoint = "https://api.openai.com/v1/chat/completions"
    
    def generate_cards_from_document(
        self, 
        document: ProcessedDocument,
        cards_per_chunk: int = 3,
        difficulty_level: int = 0,
        depth_level: int = 1
    ) -> List[GeneratedFlashcard]:
        """
        Generate flashcards from a ProcessedDocument containing text chunks.
        
        Args:
            document: ProcessedDocument with extracted text chunks
            cards_per_chunk: Number of flashcards to generate per text chunk
            difficulty_level: Difficulty level for generated cards (0-3)
            depth_level: Thinking depth (1=normal/direct, 2=deep/two_step, 3=deep_deep/three_step)
        
        Returns:
            List of GeneratedFlashcard objects
        """
        
        # [LOGGING] Start of job
        total_chunks = len(document.chunks)
        logger.info(f"🚀 Starting generation for document. Chunks: {total_chunks} | Difficulty: {difficulty_level}")
        start_time = time.time()
        
        # Map depth_level to mode
        depth_to_mode = {1: "direct", 2: "two_step", 3: "three_step"}
        mode = depth_to_mode.get(depth_level, "three_step")
        depth_labels = {1: "normal thinking", 2: "deep thinking", 3: "deep deep thinking"}
        print(f"🧠 [DEPTH→MODE] depth_level={depth_level} ({depth_labels.get(depth_level, 'unknown')}) → mode={mode}")
        
        all_cards = []
        
        for i, chunk in enumerate(document.chunks, start=1):
            # [LOGGING] Progress tracker
            logger.info(f"📄 Processing Chunk {i}/{total_chunks} (Length: {len(chunk.text)} chars)...")
            
            chunk_cards = self.generate_cards_from_text(
                text=chunk.text,
                num_cards=cards_per_chunk,
                difficulty_level=difficulty_level,
                mode=mode
            )
            
            # [LOGGING] Per-chunk result
            if chunk_cards:
                logger.info(f"   ✅ Chunk {i} produced {len(chunk_cards)} cards.")
            else:
                logger.warning(f"   ⚠️ Chunk {i} produced 0 cards.")
            all_cards.extend(chunk_cards)
            
            print(f"   ✅ Slide {i} finished: {len(chunk_cards)} cards generated.")
        
        # [LOGGING] Final summary
        duration = time.time() - start_time
        logger.info(f"🏁 Finished. Processed {total_chunks} slides. Total Cards: {len(all_cards)} | Time: {duration:.2f}s | Avg: {duration/total_chunks:.2f}s/chunk")
        
        return all_cards
    
    
    def _call_llm(self, prompt: str, max_tokens: int = 20000, temperature: float = 0.3) -> str:
        """Route to the configured provider (LMStudio or OpenAI)."""
        start = time.time()
        
        try:
            if self.provider == LLMProvider.LMSTUDIO:
                resp = self._call_lmstudio(prompt, max_tokens, temperature)
            else:
                resp = self._call_openai(prompt, max_tokens, temperature)
            
            elapsed = time.time() - start
            # [LOGGING] Performance metric (only show if it takes > 5 seconds)
            if elapsed > 5.0:
                logger.info(f"Slow LLM Response: {elapsed:.2f}s")
            
            return resp
            
        except Exception as e:
            logger.critical(f"LLM Provider Failure ({self.provider}): {e}")
            raise e
      
    
    def generate_cards_from_text(
        self,
        text: str,
        num_cards: int = 3,
        difficulty_level: int = 0,
        mode: Literal["direct", "two_step", "three_step"] = "three_step",
        max_concepts: int = 6,
    ) -> List[GeneratedFlashcard]:
        difficulty_names = {0: "easy", 1: "medium", 2: "hard", 3: "expert"}
        print(f"[CARD GEN] Mode: {mode}, Difficulty: {difficulty_names.get(difficulty_level, 'unknown')} (level={difficulty_level})")
        """
        Generate flashcards from a single text string.
        
        Args:
            text: The text content to create flashcards from
            num_cards: Number of flashcards to generate
            difficulty_level: Difficulty level (0=easy, 1=medium, 2=hard, 3=expert)
            mode: "direct" (legacy, uses num_cards) or "two_step" (uses concepts)
            max_concepts: When mode="two_step" and no concepts provided, plan up to this many per slide

        
        Returns:
            List of GeneratedFlashcard objects
        """
        if not text or not text.strip():
            return []
        
        
        if mode == "direct":
            # Create the prompt for LMStudio
            prompt = self._create_generation_prompt(text, num_cards, difficulty_level)
            try:
                response = self._call_llm(prompt)
                cards = self._parse_response(response)
                
                # Set difficulty level

                for card in cards:
                    card.level = difficulty_level
                return cards
            except Exception as e:
                print(f"Error generating cards (direct): {e}")
                return []

        elif mode == "two_step":
            try:
                planned = self.b1_concepts(text=text, max_concepts=max_concepts)
                prompt = self._create_concept_cards_prompt(text, planned, difficulty_level)
                response = self._call_llm(prompt)
                cards = self._parse_cards_response(response)
                
                
                for card in cards:
                    card.level = difficulty_level
                return cards
            except Exception as e:
                print(f"Error generating cards (two_step): {e}")
                return []
        elif mode == "three_step":
            # Future implementation for 3-step process
            """
                Why this is better than "Two-Step"
                Redundancy Check: In a two-step process, the LLM often generates three very similar questions for the same paragraph. In the three-step process, Step 2 explicitly looks at the whole list of candidates and deletes duplicates before generation starts.

                Hallucination Filter: By forcing the LLM to provide "Evidence" in Step 1 and then having a "Judge" verify that evidence in Step 2, you significantly reduce made-up answers.

                Strict Formatting: Step 3 focuses only on the JSON structure and prose quality, which prevents the LLM from getting "distracted" by the logic of finding concepts.
                """
                
            try:
                # Step 1: Brainstorm all possible candidates
                candidates = self.c1_brainstorm_candidates(text)
                
                # [LOGGING] Track C1 output
                logger.debug(f"   [C1] Brainstormed {len(candidates)} candidates.")
                
                if not candidates:
                    return []
                
                # Step 2: Filter and select the best ones
                selected_candidates = self.c2_filtering(text, candidates, max_concepts=num_cards)
                # [LOGGING] Track C2 output
                logger.debug(f"   [C2] Filter kept {len(selected_candidates)} candidates.")
                
                # Step 3: Final polish and formatting
                cards = self.c3_refining(text, selected_candidates, difficulty_level)
                
                for card in cards:
                    card.level = difficulty_level
                
                print(f"✅ [CARD GEN] Generated {len(cards)} cards with level={difficulty_level}")
                return cards
             
            except Exception as e:
                # [LOGGING] Catch generic errors with stack trace
                logger.error(f"❌ Error in 3-step generation: {e}", exc_info=True)
                print(f"Error generating cards (three_step): {e}")
                return []
        




    def c1_brainstorm_candidates(self, text: str) -> List[CandidateConcept]:        
        """Step 1: Atomic Fact Extraction & Multi-Question Brainstorming."""
        
        prompt = f"""
        You are a Senior Professor. Your goal is to extract testable knowledge from this slide.
    
        PHASE 1: Identify 3-5 'Knowledge Atoms' (the fundamental facts needed for the exam).
        PHASE 2: For each Atom, create 4 variations (one direct, one conceptual, two additional variations).
        
        EXAM-ONLY RULE:
        - IGNORE: Headers, footer text, Professor names, dates, course codes, or 'Welcome' slides.
        - FOCUS: Definitions, causal relationships, lists, and core theories.
        
        TEXT:
        {text}

        Return ONLY valid JSON:
        {{
        "candidates": [
            {{
            "id": "atom1_v1",
            "raw_question": "Direct question style",
            "evidence": "Source text snippet",
            "potential_answer": "Concise answer",
            "relevance_score": 0.9
            }},
            {{
            "id": "atom1_v2",
            "raw_question": "Scenario/Application style",
            "evidence": "Source text snippet",
            "potential_answer": "Concise answer",
            "relevance_score": 0.8
            }}
        ]
        }}
        """
        resp = self._call_llm(prompt, temperature=0.7)
        #Higher creativity helps find varied ways to ask questions
        try:
            data = self._extract_json(resp)
            return [CandidateConcept(**c) for c in data.get("candidates", [])]
        except Exception as e:
            print(f"Step 1 Error: {e}")
            # [LOGGING] Specific step error
            logger.error(f"   [C1 Error] Failed to parse candidates: {e}")
            logger.debug(f"   [C1 Raw Response] {resp}") # Very helpful for debugging bad JSON
            return []

    def c2_filtering(self, text: str, candidates: List[CandidateConcept], max_concepts: int) -> List[CandidateConcept]:
        """Step 2: Selection, De-duplication, and Metadata Purge."""
        
        candidates_json = json.dumps([c.model_dump() for c in candidates], indent=2)
        
        prompt = f"""
        You are a Strict Exam Auditor. Your job is to discard 'garbage' flashcards.
        
        GOAL: Select the {max_concepts} best unique questions from the list.

        REJECTION CRITERIA:
        - 'Admin Fluff': Any mention of course names, authors, or slide numbers.
        - 'The Obvious': Questions anyone could answer without studying (e.g., 'What is this slide about?').
        - 'Hallucinations': Any fact NOT explicitly written in: "{text}"
        - 'Redundancy': If two questions cover the same fact, pick the one that requires deeper thinking.
        
        SIMILARITY AUDIT:
        - Compare the raw_question and potential_answer of all candidates.
        - If two candidates test the same core piece of information (even if worded differently), they are Redundant.
        - Keep only the variation that is most cognitively demanding or clear.
        - Forbidden: Do not select two questions where knowing the answer to one makes the other trivial.
        
        CANDIDATES:
        {candidates_json}

        Return ONLY a JSON list of the "id" values to keep.
        Example: {{"keep_ids": ["fact1_v2", "fact3_v1"]}}
        """
        resp = self._call_llm(prompt, temperature=0.1)
        # We want the auditor to be cold, logical, and consistent
        try:
            keep_ids = self._extract_json(resp).get("keep_ids", [])
            return [c for c in candidates if c.id in keep_ids]
        except Exception as e:
            print(f"Step 2 Error: {e}")
            return candidates[:max_concepts]
        
  

    def c3_refining(self, text: str, selected: List[CandidateConcept], difficulty_level: int) -> List[GeneratedFlashcard]:
        """Step 3: Final Generation & Refinement
        The final pass to turn the selected candidates into polished, high-quality flashcards with consistent formatting and difficulty leveling.

        Goal: Final Polish.

        Action: Ensure the answer is concise and the question is unambiguous.
        """    
        
        difficulty_map = {0: "easy", 1: "medium", 2: "hard", 3: "expert"}
        diff_str = difficulty_map.get(difficulty_level, "medium")
        
        selected_json = json.dumps([c.model_dump() for c in selected], indent=2)
        
        difficulty_instructions = {
        0: "Focus on 'Remembering' (definitions, labels).",
        1: "Focus on 'Understanding' (explaining concepts).",
        2: "Focus on 'Applying' (how to use this fact in a scenario).",
        3: "Focus on 'Analyzing' (comparing two concepts or finding cause-effect)."
        }
        task_focus = difficulty_instructions.get(difficulty_level, "medium")

        prompt = f"""
        Refine these candidates into professional flashcards.
        
        TASK: {task_focus}
        SOURCE TEXT: {text}
        
        PROHIBITED PHRASES (Never use these):
        - "According to the text..."
        - "Based on the slide..."
        - "In the provided information..."
        - "The text states..."
        
        The question should stand alone as if it were on a real exam.
        
        RULES:
        - No meta-statements (e.g., "The text does not mention...")
        - Language must match the Source Text.
        - Questions must be clear; Answers must be 1-3 sentences.
        - Make sure the question is really worth asking in a context of learning for an exam.
        
        CONCEPTS: {selected_json}
        
        Return JSON: {{"results": [{{"question": "...", "answer": "..."}}]}}
        """
        resp = self._call_llm(prompt, temperature= 0.3)
        try:
            data = self._extract_json(resp)
            return [GeneratedFlashcard(question=r["question"], answer=r["answer"]) for r in data.get("results", [])]
        except Exception as e:
            print(f"Step 3 Error: {e}")
            return []





    def b1_concepts(self, text: str, max_concepts: int = 6) -> List[PlannedConcept]:
        """
        Step 1 — Plan flashcard concepts with evidence and confidence.
        """
        planning_prompt = f"""
        You are a flashcard planner.

        Task: select up to {max_concepts} flashcard concepts from the slide text.

        Only select a concept if the slide contains enough explicit information
        to answer a factual question WITHOUT meta-statements.

        For each concept, provide:
        - id (short unique string)
        - concept (short label)
        - question (candidate flashcard question)
        - evidence (exact words from the slide, 5–25 words)
        - confidence (float between 0.0 and 1.0)
        - should_generate (true or false)

        STRICT RULES:
        - Use ONLY the slide text (no external knowledge).
        - No speculation.
        - If a concept is only mentioned (name/title without explanation),
        set should_generate=false.
        - Keep the output language the same as the slide language.

        Reject (should_generate=false) if the content is:
        - personal opinion/interview ("I", "me", "my", "m’", "je")
        - unclear/vague ("this role", "that", "the person at the time")
        - only a name/title without explanation
        - a question about the name or the date of publication.

        Return ONLY valid JSON in this shape:
        {{
        "concepts": [
            {{
            "id": "c1",
            "concept": "...",
            "question": "...",
            "evidence": "...",
            "confidence": 0.0,
            "should_generate": true
            }}
        ]
        }}

        Slide text:
        {text}

        JSON:
        """

        resp = self._call_llm(planning_prompt)

        return self.process_b1_response(resp)


    def process_b1_response(self, response: str) -> Any:
        """Process the LLM response after b1_concepts step to extract JSON data."""
        try:
            data = self._extract_json(response)
            concepts: List[PlannedConcept] = []

            for c in data.get("concepts", []):
                try:
                    pc = PlannedConcept(
                        id=c["id"],
                        concept=c["concept"].strip(),
                        question=c["question"].strip(),
                        evidence=c["evidence"].strip(),
                        confidence=float(c.get("confidence", 0.0)),
                        should_generate=bool(c.get("should_generate", False)),
                    )

                    if pc.should_generate and pc.confidence >= 0.6:
                        concepts.append(pc)

                except Exception:
                    continue

            return concepts

        except Exception as e:
            print(f"Error parsing planning response: {e}")
            print(f"Response: {response}")
            return []
        

    def _create_concept_cards_prompt(
    self,
    text: str,
    concepts: List[PlannedConcept],
    difficulty_level: int,
) -> str:
        difficulty_descriptions = {
            0: "easy (basic facts and definitions)",
            1: "medium (conceptual understanding)",
            2: "hard (application and analysis)",
            3: "expert (synthesis and evaluation)"
        }
        difficulty = difficulty_descriptions.get(difficulty_level, "medium")

        concepts_json = json.dumps(
            [c.model_dump() for c in concepts],
            ensure_ascii=False,
            indent=2
        )

        return f"""
            You are an expert educational flashcard writer.

            Use ONLY the slide text for correctness.
            Write in the SAME language as the slide text.

            For each concept, output exactly ONE result object:
            - status = "ok" with a question and answer
            - OR status = "skipped" with reason = "insufficient_evidence"

            Never write meta-statements such as:
            - "the text does not provide details"
            - "no information is given"
            - "probably", "likely", "appears to be"

            Difficulty: {difficulty}

            Return ONLY valid JSON in this exact shape:
            {{
            "results": [
                {{
                "concept_id": "...",
                "status": "ok",
                "question": "...",
                "answer": "..."
                }},
                {{
                "concept_id": "...",
                "status": "skipped",
                "reason": "insufficient_evidence"
                }}
            ]
            }}

            Slide text:
            {text}

            Concepts:
            {concepts_json}

            JSON:
            """

    def _parse_cards_response(self, response: str) -> List[GeneratedFlashcard]:
        try:
            data = self._extract_json(response)
            cards: List[GeneratedFlashcard] = []
            for r in data.get("results", []):
                if r.get("status") == "ok":
                    q = str(r.get("question", "")).strip()
                    a = str(r.get("answer", "")).strip()
                    if q and a:
                        cards.append(GeneratedFlashcard(question=q, answer=a))
            return cards
        except Exception as e:
            print(f"Error parsing response: {e}")
            print(f"Response: {response}")
            return []

    
    def _extract_json(self, response: str) -> Any:
        """
        Extract the first JSON object in a string.
        """
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start == -1 or json_end == 0:
            raise ValueError("No JSON found in response")
        return json.loads(response[json_start:json_end])
    
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
- You MUST generate all output in the SAME language as the majority of the input slide text.
- CRITICAL: Do NOT translate, switch language, or mix languages.
- If the slide does not contain enough explicit information to answer a precise flashcard, DO NOT generate a flashcard.
- Do NOT write vague answers such as “the text does not provide details”.
- Don't ask questions about the date of  publication, or author names.
- In the answers, you MUST NOT write meta-statements such as:
  "the text does not provide details"
  "no specific information is given"
  "probably", "likely", "appears to be"


JSON Output:"""
        
        return prompt
    
    def _call_lmstudio(self, prompt: str, max_tokens: int = 2000, temperature: float = 0.3) -> str:
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
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }
        
        response = requests.post(
            self.lmstudio_endpoint,
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        if "</think>" in content:
            content = content.split("</think>")[1]
        return content
    
    def _call_openai(self, prompt: str, max_tokens: int = 2000, temperature: float = 0.3) -> str:
        """
        Make a request to OpenAI API.
        
        Args:
            prompt: The prompt to send to the model
            max_tokens: Maximum tokens in the response
        
        Returns:
            The model's response text
        
        Raises:
            requests.RequestException: If the API call fails
        """
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.openai_model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        response = requests.post(
            self.openai_endpoint,
            json=payload,
            headers=headers,
            timeout=60
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


