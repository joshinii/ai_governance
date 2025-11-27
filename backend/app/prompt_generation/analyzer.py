"""
Prompt analysis utilities
Detects issues and areas for improvement
"""
import re
from typing import List, Dict


class PromptAnalyzer:
    """Analyzes prompts to identify improvement opportunities"""
    
    # Words that indicate vagueness
    VAGUE_WORDS = [
        'something', 'stuff', 'things', 'good', 'bad', 'nice', 
        'better', 'worse', 'some', 'any', 'whatever'
    ]
    
    # Question words that often indicate underspecified prompts
    QUESTION_STARTERS = ['what', 'how', 'why', 'when', 'where', 'who']
    
    def analyze(self, prompt: str) -> Dict[str, any]:
        """
        Analyze a prompt and return improvement opportunities
        
        Args:
            prompt: The user's original prompt
            
        Returns:
            Dictionary with analysis results
        """
        prompt_lower = prompt.lower()
        word_count = len(prompt.split())
        
        issues = []
        suggestions = []
        
        # Check for vague language
        vague_found = [word for word in self.VAGUE_WORDS if word in prompt_lower]
        if vague_found:
            issues.append("Contains vague language")
            suggestions.append("Be more specific about what you want")
        
        # Check prompt length
        if word_count < 5:
            issues.append("Very short prompt")
            suggestions.append("Add more context and details")
        elif word_count > 100:
            issues.append("Very long prompt")
            suggestions.append("Focus on the key requirements")
        
        # Check for missing output format
        if not any(word in prompt_lower for word in ['list', 'bullet', 'table', 'format', 'json', 'markdown']):
            issues.append("No output format specified")
            suggestions.append("Specify desired output format")
        
        # Check for missing constraints
        if not any(word in prompt_lower for word in ['length', 'words', 'sentences', 'paragraphs', 'brief', 'detailed']):
            issues.append("No length constraint")
            suggestions.append("Specify desired length or detail level")
        
        # Check for missing context
        if word_count < 10 and not any(word in prompt_lower for word in ['for', 'about', 'regarding', 'on']):
            issues.append("Limited context")
            suggestions.append("Provide background or context")
        
        # Detect prompt type
        prompt_type = self._detect_type(prompt_lower)
        
        # Calculate quality score (0-100)
        quality_score = self._calculate_score(prompt, issues)
        
        return {
            'prompt_type': prompt_type,
            'word_count': word_count,
            'issues': issues,
            'suggestions': suggestions,
            'quality_score': quality_score,
            'has_vague_language': len(vague_found) > 0,
            'has_output_format': 'No output format specified' not in issues,
            'has_length_constraint': 'No length constraint' not in issues
        }
    
    def _detect_type(self, prompt: str) -> str:
        """Detect the type of prompt"""
        if any(word in prompt for word in ['write', 'create', 'generate', 'compose']):
            if 'code' in prompt or 'function' in prompt or 'script' in prompt:
                return 'code_generation'
            return 'creative_writing'
        
        if any(word in prompt for word in ['analyze', 'explain', 'describe', 'compare']):
            return 'analysis'
        
        if any(word in prompt for word in ['summarize', 'summary', 'tldr']):
            return 'summarization'
        
        if prompt.strip().endswith('?'):
            return 'question'
        
        return 'general'
    
    def _calculate_score(self, prompt: str, issues: List[str]) -> int:
        """
        Calculate quality score based on prompt characteristics
        
        Higher score = better quality prompt
        """
        score = 100
        
        # Deduct points for each issue
        score -= len(issues) * 15
        
        # Bonus for good length (10-50 words is ideal)
        word_count = len(prompt.split())
        if 10 <= word_count <= 50:
            score += 10
        
        # Bonus for specific language
        if any(word in prompt.lower() for word in ['specific', 'detailed', 'exactly', 'precisely']):
            score += 5
        
        # Bonus for examples
        if 'example' in prompt.lower() or 'for instance' in prompt.lower():
            score += 5
        
        # Ensure score is within bounds
        return max(0, min(100, score))
