# Source · AI-Scientist (SakanaAI)

- Repo: https://github.com/SakanaAI/AI-Scientist

## Absorb
1. Pipeline: idea → templated experiment → writeup → LLM review.  
2. Template contract: `experiment.py --out_dir` producing a fixed artifact folder.  
3. Literature engines: Semantic Scholar / OpenAlex.  
4. Review ensemble API shape: overall score, decision, weaknesses list, reflections.

## Reject as default product behavior
Failure modes to encode as WARN/BLOCK in Experiment/Review:
- Implementation bugs framed as scientific insight  
- Hallucinated results / fabricated methodology  
- Shortcut reliance / frame-lock  
- Citation hallucinations  

Human confirmation required before any “auto scientist” style loop.

## Mapping
- Idea: candidate generator behind evaluation gate  
- Experiment: recipe + expectedArtifacts[]  
- Review: ensemble perspectives UI  
- Overview: stage machine visualization
