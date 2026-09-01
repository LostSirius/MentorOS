# Research Question Types

## Overview

This reference provides a taxonomy of research question types to guide the
brainstorm skill when generating concrete, answerable questions from clustered
themes. Each type is paired with quality criteria and common failure modes.

## Taxonomy

### 1. Descriptive questions

**Form**: What is X? How does Y behave under condition Z?

**When to use**: The theme involves characterizing a phenomenon, dataset, or
system behavior that has not been systematically documented.

**Quality criteria**:
- The object of description is well-bounded (not "everything about X").
- There is a plausible method for obtaining the description (annotation,
  logging, survey, measurement).

**Common failure**: Asking for description at a scope that would require a
multi-year consortium effort.

### 2. Relational questions

**Form**: Is X correlated with Y? How does the relationship between A and B
change across settings?

**When to use**: The theme involves comparing two or more variables,
constructs, or methods.

**Quality criteria**:
- Both sides of the relationship are measurable.
- There is a plausible dataset or experimental design for testing the
  relationship.

**Common failure**: Confusing correlation with mechanism; the question implies
causality without a causal design.

### 3. Causal questions

**Form**: Does X cause Y? What is the causal effect of intervention Z on
outcome W?

**When to use**: The theme involves understanding mechanism, intervention, or
counterfactual reasoning.

**Quality criteria**:
- There is a plausible causal identification strategy (experiment, natural
  experiment, instrumental variable, causal graph).
- The user has or can obtain data that supports the chosen strategy.

**Common failure**: Proposing a causal question when only observational data
with severe confounding is available, and no identification strategy exists.

### 4. Design-oriented questions

**Form**: Can we design a system/method/algorithm that achieves goal G under
constraint C? How does our design compare to baselines?

**When to use**: The theme involves building something new (model, tool,
framework, interface).

**Quality criteria**:
- The goal is measurable (accuracy, speed, usability, fairness, etc.).
- Baselines exist or can be constructed.
- Constraints (compute, latency, data availability) are stated or can be
  inferred.

**Common failure**: The design goal is purely aesthetic or subjective with no
quantifiable success criterion.

### 5. Explanatory questions

**Form**: Why does X happen? What mechanism explains observation Y?

**When to use**: The theme involves deep understanding of why a phenomenon
occurs, often requiring ablation studies, case studies, or mechanistic
analysis.

**Quality criteria**:
- There is a way to falsify each proposed explanation.
- The explanation generates testable predictions.

**Common failure**: The explanation is post-hoc storytelling with no
falsification path.

## Question-quality checklist

Before emitting any generated research question, verify:

1. **Answerable**: The question can be answered with data or experiments
   available to a typical graduate student.
2. **Specific**: The question is narrow enough for a single paper or thesis
   chapter, not a whole field survey.
3. **Non-trivial**: The answer is not already obvious from common knowledge
   or a 30-second web search.
4. **Measurable**: Success or failure can be assessed with concrete criteria.
5. **Motivated**: The question is grounded in the user's actual input themes,
   not imported from generic research trends.

## Mapping theme types to question families

| Theme character | Primary question type | Secondary types |
|---|---|---|
| Under-documented phenomenon | Descriptive | Explanatory |
| Comparison of methods/settings | Relational | Design-oriented |
| Intervention or policy | Causal | Design-oriented |
| New tool/model/system | Design-oriented | Relational |
| Surprising failure/success pattern | Explanatory | Causal |
