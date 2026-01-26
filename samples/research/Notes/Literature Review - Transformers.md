---
id: lit-review-transformers
type: note
status: draft
title: Literature Review - Transformers
tags:
  - literature-review
  - transformers
noteType: literature
relatedPapers:
  - attention-is-all-you-need
relatedConcepts:
  - transformer-architecture
  - self-attention
project: PhD Thesis
dateCreated: 2024-01-15
---

# Literature Review: Transformer Architectures

## Overview

This note summarizes key papers on transformer architectures for my thesis literature review.

## Foundational Papers

### [[Attention Is All You Need]] (Vaswani et al., 2017)

The original transformer paper. Key takeaways:
- Self-attention as the sole mechanism for sequence modeling
- O(1) path length between any two positions (vs O(n) for RNNs)
- Highly parallelizable

**Questions to explore:**
- Why do transformers scale so well?
- What are the computational trade-offs vs RNNs at different sequence lengths?

## Encoder-Only Models

TODO: Add BERT and variants

## Decoder-Only Models

TODO: Add GPT series analysis

## Open Questions

1. Why does pre-training work so well?
2. What are the scaling laws for transformers?
3. How do we make transformers more efficient for long sequences?

## Next Steps

- [ ] Read "BERT: Pre-training of Deep Bidirectional Transformers"
- [ ] Read "Language Models are Few-Shot Learners" (GPT-3)
- [ ] Investigate efficient transformer variants
