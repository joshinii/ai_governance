"""
Rule-based prompt generator
Generates improved prompt variants using templates and heuristics
"""
from typing import List, Dict
from .analyzer import PromptAnalyzer


class RuleBasedGenerator:
    """Generates improved prompt variants using rule-based templates"""
    
    def __init__(self):
        self.analyzer = PromptAnalyzer()
    
    def generate_variants(self, original_prompt: str, context: str = None) -> List[Dict]:
        """
        Generate 3 improved variants of the prompt
        
        Args:
            original_prompt: User's original prompt
            context: Optional context (AI tool name)
            
        Returns:
            List of 3 dictionaries with variant data
        """
        # Analyze the original prompt
        analysis = self.analyzer.analyze(original_prompt)
        prompt_type = analysis['prompt_type']
        
        variants = []
        
        # Variant 1: Add clarity and specificity
        variant1 = self._generate_clarity_variant(original_prompt, analysis, prompt_type)
        variants.append(variant1)
        
        # Variant 2: Add structure and format
        variant2 = self._generate_structure_variant(original_prompt, analysis, prompt_type)
        variants.append(variant2)
        
        # Variant 3: Add constraints and examples
        variant3 = self._generate_detailed_variant(original_prompt, analysis, prompt_type)
        variants.append(variant3)
        
        return variants
    
    def _generate_clarity_variant(self, prompt: str, analysis: Dict, prompt_type: str) -> Dict:
        """Generate variant focusing on clarity"""
        improvements = []
        improved_prompt = prompt
        
        # Add output format if missing
        if not analysis['has_output_format']:
            improved_prompt += " Provide the response in a clear, structured format."
            improvements.append("Added output format specification")
        
        # Add specificity if vague
        if analysis['has_vague_language']:
            improved_prompt = improved_prompt.replace('something', 'specific details')
            improved_prompt = improved_prompt.replace('things', 'items')
            improved_prompt = improved_prompt.replace('good', 'high-quality')
            improvements.append("Replaced vague terms with specific language")
        
        # Add length constraint if missing
        if not analysis['has_length_constraint']:
            improved_prompt += " Keep the response concise and focused."
            improvements.append("Added length guidance")
        
        if not improvements:
            improvements.append("Enhanced clarity and precision")
        
        score = min(100, analysis['quality_score'] + 20)
        
        return {
            'text': improved_prompt,
            'improvements': improvements,
            'score': score
        }
    
    def _generate_structure_variant(self, prompt: str, analysis: Dict, prompt_type: str) -> Dict:
        """Generate variant focusing on structure"""
        improvements = []
        
        # Build structured version
        parts = []
        
        # Start with clear objective
        if prompt_type == 'question':
            parts.append(f"{prompt}")
        else:
            parts.append(f"{prompt}.")
        
        # Add structure requirements
        if prompt_type == 'code_generation':
            parts.append("Include code comments and explain the logic.")
            improvements.append("Added code documentation requirement")
        elif prompt_type == 'creative_writing':
            parts.append("Structure the response with a clear beginning, middle, and end.")
            improvements.append("Added structural guidance")
        elif prompt_type == 'analysis':
            parts.append("Organize the analysis into key points with supporting evidence.")
            improvements.append("Added organizational structure")
        else:
            parts.append("Present the information in a logical, easy-to-follow structure.")
            improvements.append("Added structural clarity")
        
        # Add format specification
        if 'list' not in prompt.lower() and 'bullet' not in prompt.lower():
            if prompt_type in ['analysis', 'summarization']:
                parts.append("Use bullet points for key takeaways.")
                improvements.append("Specified bullet point format")
        
        improved_prompt = " ".join(parts)
        score = min(100, analysis['quality_score'] + 25)
        
        return {
            'text': improved_prompt,
            'improvements': improvements,
            'score': score
        }
    
    def _generate_detailed_variant(self, prompt: str, analysis: Dict, prompt_type: str) -> Dict:
        """Generate variant with more detail and constraints"""
        improvements = []
        
        # Build detailed version
        improved_prompt = prompt
        
        # Add context instruction
        if analysis['word_count'] < 15:
            improved_prompt = f"Context: {improved_prompt}\n\nPlease provide a comprehensive response that addresses the request thoroughly."
            improvements.append("Added context and scope clarification")
        
        # Add constraints based on type
        if prompt_type == 'code_generation':
            improved_prompt += " Include error handling and follow best practices."
            improvements.append("Added code quality requirements")
        elif prompt_type == 'creative_writing':
            improved_prompt += " Use vivid language and maintain consistent tone throughout."
            improvements.append("Added style guidelines")
        elif prompt_type == 'analysis':
            improved_prompt += " Support conclusions with specific examples or data."
            improvements.append("Added evidence requirement")
        else:
            improved_prompt += " Provide actionable insights where applicable."
            improvements.append("Added actionability requirement")
        
        # Add output format
        if 'format' not in prompt.lower():
            improved_prompt += " Format the output for easy readability."
            improvements.append("Added formatting guidance")
        
        if not improvements:
            improvements.append("Enhanced with additional detail and constraints")
        
        score = min(100, analysis['quality_score'] + 30)
        
        return {
            'text': improved_prompt,
            'improvements': improvements,
            'score': score
        }
